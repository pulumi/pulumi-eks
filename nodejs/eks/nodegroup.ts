// Copyright 2016-2018, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as crypto from "crypto";

import { Cluster, CoreData } from "./cluster";
import transform from "./transform";

/**
 * NodeGroupOptions describes the configuration options accepted by a NodeGroup component.
 */
export interface NodeGroupOptions {
    /**
     * The VPC in which to create the worker node group.
     */
    vpcId: pulumi.Input<string>;

    /**
     * The IDs of the cluster subnets to filter for worker node group subnet ids.
     *
     * If the list of subnets includes both public and private subnets, the Kubernetes API
     * server and the worker nodes will only be attached to the private subnets. See
     * https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html for more details.
     */
    clusterSubnetIds: pulumi.Input<pulumi.Input<string[]>>;

    /**
     * The IDs of the explicit node subnets to attach to the worker node group.
     *
     * This option overrides clusterSubnetIds option.
     */
    nodeSubnetIds?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * The security group associated with the EKS cluster.
     */
    clusterSecurityGroup: aws.ec2.SecurityGroup;

    /**
     * The target EKS cluster.
     */
    cluster: aws.eks.Cluster | CoreData | Cluster;

    /**
     * The instance type to use for the cluster's nodes. Defaults to "t2.medium".
     */
    instanceType?: pulumi.Input<aws.ec2.InstanceType>;

    /**
     * Bidding price for spot instance. If set, only spot instances will be added as worker node
     */
    spotPrice?: pulumi.Input<string>;

    /**
     * The instance profile to use for all nodes in this worker node group.
     */
    instanceProfile: pulumi.Input<aws.iam.InstanceProfile>;

    /**
     * The security group to use for all nodes in this worker node group.
     */
    nodeSecurityGroup?: aws.ec2.SecurityGroup;

    /**
     * Public key material for SSH access to worker nodes. See allowed formats at:
     * https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
     * If not provided, no SSH access is enabled on VMs.
     */
    nodePublicKey?: pulumi.Input<string>;

    /**
     * Name of the key pair to use for SSH access to worker nodes.
     */
    keyName?: pulumi.Input<string>;

    /**
     * The size in GiB of a cluster node's root volume. Defaults to 20.
     */
    nodeRootVolumeSize?: pulumi.Input<number>;

    /**
     * Extra code to run on node startup. This code will run after the AWS EKS bootstrapping code and before the node
     * signals its readiness to the managing CloudFormation stack. This code must be a typical user data script:
     * critically it must begin with an interpreter directive (i.e. a `#!`).
     */
    nodeUserData?: pulumi.Input<string>;

    /**
     * The number of worker nodes that should be running in the cluster. Defaults to 2.
     */
    desiredCapacity?: pulumi.Input<number>;

    /**
     * The minimum number of worker nodes running in the cluster. Defaults to 1.
     */
    minSize?: pulumi.Input<number>;

    /**
     * The maximum number of worker nodes running in the cluster. Defaults to 2.
     */
    maxSize?: pulumi.Input<number>;

    /**
     * The AMI to use for worker nodes. Defaults to the value of Amazon EKS - Optimized AMI if no value is provided.
	 * More information about the AWS eks optimized ami is available at https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
	 * Use the information provided by AWS if you want to build your own AMI.
     */
    amiId?: pulumi.Input<string>;
}

/**
 * NodeGroup is a component that wraps the AWS EC2 instances that provide compute capacity for an EKS cluster.
 */
export class NodeGroup extends pulumi.ComponentResource {
    /**
     * The security group for the cluster's nodes.
     */
    public readonly nodeSecurityGroup: aws.ec2.SecurityGroup;

    /**
     * Create a new EKS cluster with worker nodes, optional storage classes, and deploy the Kubernetes Dashboard if
     * requested.
     *
     * @param name The _unique_ name of this component.
     * @param args The arguments for this cluster.
     * @param opts A bag of options that control this copmonent's behavior.
     */
    constructor(name: string, args: NodeGroupOptions, opts?: pulumi.ComponentResourceOptions) {
        super("eks:index:NodeGroup", name, args, opts);

        const k8sProvider = this.getProvider("kubernetes:core:v1/ConfigMap");
        if (k8sProvider === undefined) {
            throw new pulumi.RunError("a 'kubernetes' provider must be specified for a 'NodeGroup'");
        }
        const group = createNodeGroup(name, args, this, k8sProvider);
        this.nodeSecurityGroup = group.nodeSecurityGroup;
        this.registerOutputs(undefined);
    }
}

export interface NodeGroupData {
    nodeSecurityGroup: aws.ec2.SecurityGroup;
    cfnStack: aws.cloudformation.Stack;
}

export function createNodeGroup(name: string, args: NodeGroupOptions, parent: pulumi.ComponentResource,  k8sProvider: k8s.Provider): NodeGroupData {
    let nodeSecurityGroup: aws.ec2.SecurityGroup;
    let eksCluster: aws.eks.Cluster;
    const cfnStackDeps: Array<pulumi.Resource> = [];

    const clusterArg = <any>args.cluster;
    if (clusterArg.endpoint !== undefined) {
        // aws.eks.Cluster
        eksCluster = clusterArg;
    } else {
        let core: CoreData;
        if (clusterArg.cluster !== undefined) {
            // ClusterData
            core = clusterArg;
        } else {
            // Cluster
            core = clusterArg.core;
        }
        eksCluster = core.cluster;
        if (core.vpcCni !== undefined) {
            cfnStackDeps.push(clusterArg.vpcCni);
        }
        if (core.eksNodeAccess !== undefined) {
            cfnStackDeps.push(clusterArg.eksNodeAccess);
        }
    }

    if (args.nodeSecurityGroup) {
        nodeSecurityGroup = args.nodeSecurityGroup;
    } else {
        nodeSecurityGroup = new aws.ec2.SecurityGroup(`${name}-nodeSecurityGroup`, {
            vpcId: args.vpcId,
            ingress: [
                {
                    description: "Allow nodes to communicate with each other",
                    fromPort: 0,
                    toPort: 0,
                    protocol: "-1", // all
                    self: true,
                },
                {
                    description: "Allow worker Kubelets and pods to receive communication from the cluster control plane",
                    fromPort: 1025,
                    toPort: 65535,
                    protocol: "tcp",
                    securityGroups: [ args.clusterSecurityGroup.id ],
                },
                {
                    description: "Allow pods running extension API servers on port 443 to receive communication from cluster control plane",
                    fromPort: 443,
                    toPort: 443,
                    protocol: "tcp",
                    securityGroups: [ args.clusterSecurityGroup.id ],
                },
            ],
            egress: [{
                description: "Allow internet access.",
                fromPort: 0,
                toPort: 0,
                protocol: "-1",  // all
                cidrBlocks: [ "0.0.0.0/0" ],
            }],
            tags: eksCluster.name.apply(n => <aws.Tags>{
                [`kubernetes.io/cluster/${n}`]: "owned",
            }),
        }, { parent: parent });
    }

    const eksClusterIngressRule = new aws.ec2.SecurityGroupRule(`${name}-eksClusterIngressRule`, {
        description: "Allow pods to communicate with the cluster API Server",
        type: "ingress",
        fromPort: 443,
        toPort: 443,
        protocol: "tcp",
        securityGroupId: args.clusterSecurityGroup.id,
        sourceSecurityGroupId: nodeSecurityGroup.id,
    }, { parent: parent });
    const nodeSecurityGroupId = pulumi.all([nodeSecurityGroup.id, eksClusterIngressRule.id])
        .apply(([id]) => id);

    // If requested, add a new EC2 KeyPair for SSH access to the instances.
    let keyName = args.keyName;
    if (args.nodePublicKey) {
        const key = new aws.ec2.KeyPair(`${name}-keyPair`, {
            publicKey: args.nodePublicKey,
        }, { parent: parent });
        keyName = key.keyName;
    }

    const cfnStackName = transform(`${name}-cfnStackName`, name, n => `${n}-${crypto.randomBytes(4).toString("hex")}`, { parent: parent });

    const awsRegion = pulumi.output(aws.getRegion({}, { parent: parent }));
    const userDataArg = args.nodeUserData || pulumi.output("");
    const userdata = pulumi.all([awsRegion, eksCluster.name, eksCluster.endpoint, eksCluster.certificateAuthority, cfnStackName, userDataArg])
        .apply(([region, clusterName, clusterEndpoint, clusterCa, stackName, customUserData]) => {
            if (customUserData !== "") {
                customUserData = `cat >/opt/user-data <<${stackName}-user-data
${customUserData}
${stackName}-user-data
chmod +x /opt/user-data
/opt/user-data
`;
            }

            return `#!/bin/bash

/etc/eks/bootstrap.sh --apiserver-endpoint "${clusterEndpoint}" --b64-cluster-ca "${clusterCa.data}" "${clusterName}"
${customUserData}
/opt/aws/bin/cfn-signal --exit-code $? --stack ${stackName} --resource NodeGroup --region ${region.name}
`;
        });

    let amiId: pulumi.Input<string> = args.amiId!;
    if (args.amiId === undefined) {
        const eksWorkerAmi = aws.getAmi({
            filters: [{
                name: "name",
                values: [ "amazon-eks-node-*" ],
            }],
            mostRecent: true,
            owners: [ "602401143452" ], // Amazon
        }, { parent: parent });
        amiId = eksWorkerAmi.then(r => r.imageId);
    }

    const nodeLaunchConfiguration = new aws.ec2.LaunchConfiguration(`${name}-nodeLaunchConfiguration`, {
        associatePublicIpAddress: true,
        imageId: amiId,
        instanceType: args.instanceType || "t2.medium",
        iamInstanceProfile: args.instanceProfile,
        keyName: keyName,
        securityGroups: [ nodeSecurityGroupId ],
        spotPrice: args.spotPrice,
        rootBlockDevice: {
            volumeSize: args.nodeRootVolumeSize || 20, // GiB
            volumeType: "gp2", // default is "standard"
            deleteOnTermination: true,
        },
        userData: userdata,
    }, { parent: parent });

    const workerSubnetIds = args.nodeSubnetIds ? pulumi.output(args.nodeSubnetIds) : pulumi.output(args.clusterSubnetIds).apply(ids => computeWorkerSubnets(parent, ids));
    if (args.desiredCapacity === undefined) {
        args.desiredCapacity = 2;
    }
    if (args.minSize === undefined) {
        args.minSize = 1;
    }
    if (args.maxSize === undefined) {
        args.maxSize = 2;
    }
    let minInstancesInService = 1;
    if (args.spotPrice) {
        minInstancesInService = 0;
    }
    const cfnTemplateBody = pulumi.all([
        nodeLaunchConfiguration.id,
        args.desiredCapacity,
        args.minSize,
        args.maxSize,
        eksCluster.name,
        workerSubnetIds.apply(JSON.stringify),
    ]).apply(([launchConfig, desiredCapacity, minSize, maxSize, clusterName, vpcSubnetIds]) => `
                AWSTemplateFormatVersion: '2010-09-09'
                Resources:
                    NodeGroup:
                        Type: AWS::AutoScaling::AutoScalingGroup
                        Properties:
                          DesiredCapacity: ${desiredCapacity}
                          LaunchConfigurationName: ${launchConfig}
                          MinSize: ${minSize}
                          MaxSize: ${maxSize}
                          VPCZoneIdentifier: ${vpcSubnetIds}
                          Tags:
                          - Key: Name
                            Value: ${clusterName}-worker
                            PropagateAtLaunch: 'true'
                          - Key: kubernetes.io/cluster/${clusterName}
                            Value: 'owned'
                            PropagateAtLaunch: 'true'
                        UpdatePolicy:
                          AutoScalingRollingUpdate:
                            MinInstancesInService: '${minInstancesInService}'
                            MaxBatchSize: '1'
                `);

    const cfnStack = new aws.cloudformation.Stack(`${name}-nodes`, {
        name: cfnStackName,
        templateBody: cfnTemplateBody,
    }, { parent: parent, dependsOn: cfnStackDeps });

    return {
        nodeSecurityGroup: nodeSecurityGroup,
        cfnStack: cfnStack,
    };
}

// computeWorkerSubnets attempts to determine the subset of the given subnets to use for worker nodes.
//
// As per https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html, an EKS cluster that is attached to public
// and private subnets will only expose its API service to workers on the private subnets. Any workers attached to the
// public subnets will be unable to communicate with the API server.
//
// If all of the given subnet IDs are public, the list of subnet IDs is returned as-is. If any private subnet is given,
// only the IDs of the private subnets are returned. A subnet is deemed private iff it has no route in its route table
// that routes directly to an internet gateway. If any such route exists in a subnet's route table, it is treated as
// public.
async function computeWorkerSubnets(parent: pulumi.Resource, subnetIds: string[]): Promise<string[]> {
    const publicSubnets: string[] = [];

    const privateSubnets: string[] = [];
    for (const subnetId of subnetIds) {
        // Fetch the route table for this subnet.
        const routeTable = await (async () => {
            try  {
                // Attempt to get the explicit route table for this subnet. If there is no explicit rouute table for
                // this subnet, this call will throw.
                return await aws.ec2.getRouteTable({ subnetId: subnetId }, { parent: parent });
            } catch {
                // If we reach this point, the subnet may not have an explicitly associated route table. In this case
                // the subnet is associated with its VPC's main route table (see
                // https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html#RouteTables for details).
                const subnet = await aws.ec2.getSubnet({ id: subnetId }, { parent: parent });
                const mainRouteTableInfo = await aws.ec2.getRouteTables({
                    vpcId: subnet.vpcId,
                    filters: [{
                        name: "association.main",
                        values: [ "true" ],
                    }],
                }, { parent: parent });
                return await aws.ec2.getRouteTable({ routeTableId: mainRouteTableInfo.ids[0] }, { parent: parent });
            }
        })();

            // Once we have the route table, check its list of routes for a route to an internet gateway.
        const hasInternetGatewayRoute = routeTable.routes.find(r => !!r.gatewayId) !== undefined;
        if (hasInternetGatewayRoute) {
            publicSubnets.push(subnetId);
        } else {
            privateSubnets.push(subnetId);
        }
    }
    return privateSubnets.length === 0 ? publicSubnets : privateSubnets;
}
