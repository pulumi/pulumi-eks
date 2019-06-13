// Copyright 2016-2019, Pulumi Corporation.
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
import { createNodeGroupSecurityGroup } from "./securitygroup";
import transform from "./transform";
import { InputTags } from "./utils";

/**
 * Taint represents a Kubernetes `taint` to apply to all Nodes in a NodeGroup.  See
 * https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/.
 */
export interface Taint {
    /**
     * The value of the taint.
     */
    value: string;
    /**
     * The effect of the taint.
     */
    effect: "NoSchedule" | "NoExecute" | "PreferNoSchedule";
}

/**
 * NodeGroupArgs represents the common configuration settings for NodeGroups.
 */
export interface NodeGroupBaseOptions {

    /**
     * The IDs of the explicit node subnets to attach to the worker node group.
     *
     * This option overrides clusterSubnetIds option.
     */
    nodeSubnetIds?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * The instance type to use for the cluster's nodes. Defaults to "t2.medium".
     */
    instanceType?: pulumi.Input<aws.ec2.InstanceType>;

    /**
     * Bidding price for spot instance. If set, only spot instances will be added as worker node
     */
    spotPrice?: pulumi.Input<string>;

    /**
     * The security group to use for all nodes in this worker node group.
     *
     * Note: The `nodeSecurityGroup` option and the cluster option
     * `nodeSecurityGroupTags` are mutually exclusive.
     */
    nodeSecurityGroup?: aws.ec2.SecurityGroup;

    /**
     * The ingress rule that gives node group access.
     */
    clusterIngressRule?: aws.ec2.SecurityGroupRule;

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
     * The AMI to use for worker nodes. Defaults to the current value of Amazon EKS - Optimized AMI at time of resource
     * creation if no value is provided. More information about the AWS eks optimized ami is available at
     * https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html. Use the information provided by AWS if
     * you want to build your own AMI.
     */
    amiId?: pulumi.Input<string>;

    /**
     * Custom k8s node labels to be attached to each woker node
     */
    labels?: { [key: string]: string };

    /**
     * Custom k8s node taints to be attached to each worker node
     */
    taints?: { [key: string]: Taint };

    /**
     * Whether or not to auto-assign public IP addresses on the EKS worker nodes.
     * If this toggle is set to true, the EKS workers will be
     * auto-assigned public IPs. If false, they will not be auto-assigned
     * public IPs.
     */
    nodeAssociatePublicIpAddress?: boolean;

    /**
     * Desired Kubernetes master / control plane version. If you do not specify a value, the latest available version is used.
     */
    version?: pulumi.Input<string>;

    /**
     * The instance profile to use for this node group. Note, the role for the instance profile
     * must be supplied in the ClusterOptions as either: 'instanceRole', or as a role of 'instanceRoles'.
     */
    instanceProfile?: aws.iam.InstanceProfile;

    /**
     * The tags to apply to the NodeGroup's AutoScalingGroup in the
     * CloudFormation Stack.
     *
     * Per AWS, all stack-level tags, including automatically created tags, and
     * the `cloudFormationTags` option are propagated to resources that AWS
     * CloudFormation supports, including the AutoScalingGroup. See
     * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html
     *
     * Note: Given the inheritance of auto-generated CF tags and
     * `cloudFormationTags`, you should at most, only supply the tag in
     * either `autoScalingGroupTags` or `cloudFormationTags`, but not both.
     */
    autoScalingGroupTags?: InputTags;

    /**
     * The tags to apply to the CloudFormation Stack of the Worker NodeGroup.
     *
     * Note: Given the inheritance of auto-generated CF tags and
     * `cloudFormationTags`, you should at most, only supply the tag in
     * either `autoScalingGroupTags` or `cloudFormationTags`, but not both.
     */
    cloudFormationTags?: InputTags;
}

/**
 * NodeGroupOptions describes the configuration options accepted by a NodeGroup component.
 */
export interface NodeGroupOptions extends NodeGroupBaseOptions {
    /**
     * The target EKS cluster.
     */
    cluster: Cluster | CoreData;
}

export interface NodeGroupData {
    /**
     * The security group for the node group.
     */
    nodeSecurityGroup: aws.ec2.SecurityGroup;
    /**
     * The CloudFormation Stack which defines the node group's AutoScalingGroup.
     */
    cfnStack: aws.cloudformation.Stack;
    /**
     * The AutoScalingGroup name for the node group.
     */
    autoScalingGroupName: pulumi.Output<string>;
}

/**
 * NodeGroup is a component that wraps the AWS EC2 instances that provide compute capacity for an EKS cluster.
 */
export class NodeGroup extends pulumi.ComponentResource implements NodeGroupData {
    /**
     * The security group for the cluster's nodes.
     */
    public readonly nodeSecurityGroup: aws.ec2.SecurityGroup;

    /**
     * The CloudFormation Stack which defines the Node AutoScalingGroup.
     */
    cfnStack: aws.cloudformation.Stack;

    /**
     * The AutoScalingGroup name for the Node group.
     */
    autoScalingGroupName: pulumi.Output<string>;

    /**
     * Create a new EKS cluster with worker nodes, optional storage classes, and deploy the Kubernetes Dashboard if
     * requested.
     *
     * @param name The _unique_ name of this component.
     * @param args The arguments for this cluster.
     * @param opts A bag of options that control this component's behavior.
     */
    constructor(name: string, args: NodeGroupOptions, opts?: pulumi.ComponentResourceOptions) {
        super("eks:index:NodeGroup", name, args, opts);

        const k8sProvider = this.getProvider("kubernetes:core:v1/ConfigMap");
        if (k8sProvider === undefined) {
            throw new Error("a 'kubernetes' provider must be specified for a 'NodeGroup'");
        }
        const group = createNodeGroup(name, args, this, k8sProvider);
        this.nodeSecurityGroup = group.nodeSecurityGroup;
        this.cfnStack = group.cfnStack;
        this.autoScalingGroupName = group.autoScalingGroupName;
        this.registerOutputs(undefined);
    }
}

type NodeGroupOptionsCluster = CoreData | Cluster;

function isCoreData(arg: NodeGroupOptionsCluster): arg is CoreData {
    return (arg as CoreData).cluster !== undefined;
}

export function createNodeGroup(name: string, args: NodeGroupOptions, parent: pulumi.ComponentResource,  k8sProvider: k8s.Provider): NodeGroupData {
    const core = isCoreData(args.cluster) ? args.cluster : args.cluster.core;

    if (!args.instanceProfile && !core.instanceProfile) {
        throw new Error(`an instanceProfile is required`);
    }

    if (core.nodeSecurityGroup && args.nodeSecurityGroup) {
        if (core.nodeSecurityGroupTags &&
            core.nodeSecurityGroup.id !== args.nodeSecurityGroup.id) {
            throw new Error(`The NodeGroup's nodeSecurityGroup and the cluster option nodeSecurityGroupTags are mutually exclusive. At most, only one option can be set`);
        }
    }

    let nodeSecurityGroup: aws.ec2.SecurityGroup;
    const cfnStackDeps: Array<pulumi.Resource> = [];

    const eksCluster = core.cluster;
    if (core.vpcCni !== undefined) {
        cfnStackDeps.push(core.vpcCni);
    }
    if (core.eksNodeAccess !== undefined) {
        cfnStackDeps.push(core.eksNodeAccess);
    }

    let eksClusterIngressRule: aws.ec2.SecurityGroupRule = args.clusterIngressRule!;
    if (args.nodeSecurityGroup) {
        nodeSecurityGroup = args.nodeSecurityGroup;
        if (eksClusterIngressRule === undefined) {
            throw new Error(`invalid args for node group ${name}, clusterIngressRule is required when nodeSecurityGroup is manually specified`);
        }
    } else {
        nodeSecurityGroup = createNodeGroupSecurityGroup(name, {
            vpcId: core.vpcId,
            clusterSecurityGroup: core.clusterSecurityGroup,
            eksCluster: eksCluster,
            tags: pulumi.all([
                core.tags,
                core.nodeSecurityGroupTags,
            ]).apply(([tags, nodeSecurityGroupTags]) => (<aws.Tags>{
                ...nodeSecurityGroupTags,
                ...tags,
            })),
        }, parent);
        eksClusterIngressRule = new aws.ec2.SecurityGroupRule(`${name}-eksClusterIngressRule`, {
            description: "Allow pods to communicate with the cluster API Server",
            type: "ingress",
            fromPort: 443,
            toPort: 443,
            protocol: "tcp",
            securityGroupId: core.clusterSecurityGroup.id,
            sourceSecurityGroupId: nodeSecurityGroup.id,
        }, { parent: parent });
    }

    // This apply is necessary in s.t. the launchConfiguration picks up a
    // dependency on the eksClusterIngressRule. The nodes may fail to
    // connect to the cluster if we attempt to create them before the
    // ingress rule is applied.
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

    const kubeletExtraArgs: Array<string> = [];
    if (args.labels) {
        const parts = [];
        for (const key of Object.keys(args.labels)) {
            parts.push(key + "=" + args.labels[key]);
        }
        if (parts.length > 0) {
            kubeletExtraArgs.push("--node-labels=" + parts.join(","));
        }
    }
    if (args.taints) {
        const parts = [];
        for (const key of Object.keys(args.taints)) {
            const taint = args.taints[key];
            parts.push(key + "=" + taint.value + ":" + taint.effect);
        }
        if (parts.length > 0) {
            kubeletExtraArgs.push("--register-with-taints=" + parts.join(","));
        }
    }
    let bootstrapExtraArgs = "";
    if (kubeletExtraArgs.length === 1) {
        // For backward compatibility with previous versions of this package, don't wrap a single argument with `''`.
        bootstrapExtraArgs = ` --kubelet-extra-args ${kubeletExtraArgs[0]}`;
    } else if (kubeletExtraArgs.length > 1) {
        bootstrapExtraArgs = ` --kubelet-extra-args '${kubeletExtraArgs.join(" ")}'`;
    }

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

/etc/eks/bootstrap.sh --apiserver-endpoint "${clusterEndpoint}" --b64-cluster-ca "${clusterCa.data}" "${clusterName}"${bootstrapExtraArgs}
${customUserData}
/opt/aws/bin/cfn-signal --exit-code $? --stack ${stackName} --resource NodeGroup --region ${region.name}
`;
        });

    let amiId: pulumi.Input<string> = args.amiId!;
    let ignoreChanges: string[] = [];
    const version: pulumi.Input<string> = args.version!;
    if (args.amiId === undefined) {
        const filters: { name: string; values: string[]}[] = [
            // Filter to target Linux arch
            {
                name: "description",
                values: [ "*linux*", "*Linux*" ],
            },
            // Filter to target EKS Nodes
            {
                name: "name",
                values: [ "amazon-eks-node-*"],
            },
            // Filter to target General, non-GPU image class
            {
                name: "manifest-location",
                values: [ "*amazon-eks-node*"],
            },
            // Filter to target architecture
            {
                name: "architecture",
                values: [ "x86_64"],
            },
        ];

        if (version !== undefined) {
            filters.push(
                // Filter to target a specific k8s version
                {
                    name: "description",
                    values: [ "*k8s*" + version + "*" ],
                },
            );
        } else {
            filters.push(
                // Filter to target the latest / default k8s version
                {
                    name: "description",
                    values: [ "*k8s*" ],
                },
            );
        }

        const eksWorkerAmiIds = aws.getAmiIds({
            filters,
            owners: [ "602401143452" ], // Amazon
            sortAscending: true,
        }, { parent: parent });

        const bestAmiId: pulumi.Input<string> = eksWorkerAmiIds.then(r => r.ids.pop()!);
        if (!bestAmiId) {
            throw new Error("No Linux AMI Id was found.");
        }
        amiId = bestAmiId;
        // When we automatically pick an image to use, we want to ignore any changes to this later by default.
        ignoreChanges = ["imageId"];
    }

    // Enable auto-assignment of public IP addresses on worker nodes for
    // backwards compatibility on existing EKS clusters launched with it
    // enabled.
    let nodeAssociatePublicIpAddress: boolean = true;
    if (args.nodeAssociatePublicIpAddress !== undefined) {
        nodeAssociatePublicIpAddress = args.nodeAssociatePublicIpAddress;
    }

    const nodeLaunchConfiguration = new aws.ec2.LaunchConfiguration(`${name}-nodeLaunchConfiguration`, {
        associatePublicIpAddress: nodeAssociatePublicIpAddress,
        imageId: amiId,
        instanceType: args.instanceType || "t2.medium",
        iamInstanceProfile: args.instanceProfile || core.instanceProfile,
        keyName: keyName,
        securityGroups: [ nodeSecurityGroupId ],
        spotPrice: args.spotPrice,
        rootBlockDevice: {
            volumeSize: args.nodeRootVolumeSize || 20, // GiB
            volumeType: "gp2", // default is "standard"
            deleteOnTermination: true,
        },
        userData: userdata,
    }, { parent: parent, ignoreChanges: ignoreChanges });

    const workerSubnetIds = args.nodeSubnetIds ? pulumi.output(args.nodeSubnetIds) : pulumi.output(core.subnetIds).apply(ids => computeWorkerSubnets(parent, ids));
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

    const autoScalingGroupTags: InputTags = pulumi.all([
        eksCluster.name,
        args.autoScalingGroupTags,
    ]).apply(([clusterName, asgTags]) => (<aws.Tags>{
        "Name": `${clusterName}-worker`,
        [`kubernetes.io/cluster/${clusterName}`]: "owned",
        ...asgTags,
    }));

    const cfnTemplateBody = pulumi.all([
        nodeLaunchConfiguration.id,
        args.desiredCapacity,
        args.minSize,
        args.maxSize,
        tagsToAsgTags(autoScalingGroupTags),
        workerSubnetIds.apply(JSON.stringify),
    ]).apply(([launchConfig, desiredCapacity, minSize, maxSize, asgTags, vpcSubnetIds]) => `
                AWSTemplateFormatVersion: '2010-09-09'
                Outputs:
                    NodeGroup:
                        Value: !Ref NodeGroup
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
                          ${asgTags}
                        UpdatePolicy:
                          AutoScalingRollingUpdate:
                            MinInstancesInService: '${minInstancesInService}'
                            MaxBatchSize: '1'
                `);

    const cfnStack = new aws.cloudformation.Stack(`${name}-nodes`, {
        name: cfnStackName,
        templateBody: cfnTemplateBody,
        tags: pulumi.all([
            core.tags,
            args.cloudFormationTags,
        ]).apply(([tags, cloudFormationTags]) => (<aws.Tags>{
            "Name": `${name}-nodes`,
            ...cloudFormationTags,
            ...tags,
        })),
    }, { parent: parent, dependsOn: cfnStackDeps });

    const autoScalingGroupName = cfnStack.outputs.apply(outputs => <string>outputs["NodeGroup"]);

    return {
        nodeSecurityGroup: nodeSecurityGroup,
        cfnStack: cfnStack,
        autoScalingGroupName: autoScalingGroupName,
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

/**
 * Iterates through the tags map creating AWS ASG-style tags
 */
function tagsToAsgTags(tagsInput: InputTags): pulumi.Output<string> {
    return pulumi.output(tagsInput).apply(tags => {
        let output = "";
        for (const tag of Object.keys(tags)) {
            output +=        `
                          - Key: ${tag}
                            Value: ${tags[tag]}
                            PropagateAtLaunch: 'true'`;
        }
        return output;
    });
}
