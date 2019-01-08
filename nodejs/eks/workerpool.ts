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

import { ServiceRole } from "./servicerole";
import transform from "./transform";

/**
 * WorkerPoolOptions describes the configuration options accepted by a WorkerPool component.
 */
export interface WorkerPoolOptions {
    /**
     * The VPC in which to create the worker pool.
     */
    vpcId: pulumi.Input<string>;

    /**
     * The IDs of the subnets to attach to the worker pool.
     */
    subnetIds: pulumi.Input<string[]>;

    /**
     * The security group associated with the EKS cluster.
     */
    clusterSecurityGroup: aws.ec2.SecurityGroup;

    /**
     * The target EKS cluster.
     */
    cluster: aws.eks.Cluster;

    /**
     * The instance type to use for the cluster's nodes. Defaults to "t2.medium".
     */
    instanceType?: pulumi.Input<aws.ec2.InstanceType>;

    /**
     * The instance role to use for all nodes in this workder pool.
     */
    instanceRole?: pulumi.Input<aws.iam.Role>;

    /**
     * The security group to use for all nodes in this workder pool.
     */
    nodeSecurityGroup?: aws.ec2.SecurityGroup;

    /**
     * Public key material for SSH access to worker nodes. See allowed formats at:
     * https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
     * If not provided, no SSH access is enabled on VMs.
     */
    nodePublicKey?: pulumi.Input<string>;

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
}

/**
 * WorkerPool is a component that wraps the AWS EC2 instances that provide compute capacity for an EKS cluster.
 */
export class WorkerPool extends pulumi.ComponentResource {
    /**
     * The service role used by the EKS cluster.
     */
    public readonly instanceRole: pulumi.Output<aws.iam.Role>;

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
    constructor(name: string, args: WorkerPoolOptions, opts?: pulumi.ComponentResourceOptions) {
        super("eks:index:WorkerPool", name, args, opts);

        const k8sProvider = this.getProvider("kubernetes:core:v1/ConfigMap");
        if (k8sProvider === undefined) {
            throw new pulumi.RunError("a 'kubernetes' provider must be specified for a 'WorkerPool'");
        }
        const pool = createWorkerPool(name, args, this, k8sProvider);
        this.instanceRole = pool.instanceRole;
        this.nodeSecurityGroup = pool.nodeSecurityGroup;
        this.registerOutputs(undefined);
    }
}

export interface WorkerPoolData {
    instanceRole: pulumi.Output<aws.iam.Role>;
    nodeSecurityGroup: aws.ec2.SecurityGroup;
    cfnStack: aws.cloudformation.Stack;
}

export function createWorkerPool(name: string, args: WorkerPoolOptions, parent: pulumi.ComponentResource,  k8sProvider: k8s.Provider): WorkerPoolData {
    let instanceRole: pulumi.Output<aws.iam.Role>;
    if (args.instanceRole) {
        instanceRole = pulumi.output(args.instanceRole);
    } else {
        instanceRole = (new ServiceRole(`${name}-instanceRole`, {
            service: "ec2.amazonaws.com",
            managedPolicyArns: [
                "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
                "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
                "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
            ],
        }, { parent: parent })).role;
    }
    // Create the instance role we'll use for worker nodes.
    const instanceRoleARN = instanceRole.apply(r => r.arn);

    let nodeSecurityGroup: aws.ec2.SecurityGroup;
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
            tags: args.cluster.name.apply(n => <aws.Tags>{
                [`kubernetes.io/cluster/${n}`]: "owned",
            }),
        }, { parent: parent });
    }

    // Enable access to the EKS cluster for worker nodes.
    const eksNodeAccess = new k8s.core.v1.ConfigMap(`${name}-nodeAccess`, {
        apiVersion: "v1",
        metadata: {
            name: "aws-auth",
            namespace: "kube-system",
        },
        data: {
            mapRoles: instanceRoleARN.apply(arn => `- rolearn: ${arn}\n  username: system:node:{{EC2PrivateDNSName}}\n  groups:\n    - system:bootstrappers\n    - system:nodes\n`),
        },
    }, { parent: parent, provider: k8sProvider });

    // Create the cluster's worker nodes.
    const instanceProfile = new aws.iam.InstanceProfile(`${name}-instanceProfile`, {
        role: instanceRole,
    }, { parent: parent });

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
    let keyName: pulumi.Output<string> | undefined;
    if (args.nodePublicKey) {
        const key = new aws.ec2.KeyPair(`${name}-keyPair`, {
            publicKey: args.nodePublicKey,
        }, { parent: parent });
        keyName = key.keyName;
    }

    const cfnStackName = transform(`${name}-cfnStackName`, name, n => `${n}-${crypto.randomBytes(4).toString("hex")}`, { parent: parent });

    const awsRegion = pulumi.output(aws.getRegion({}, { parent: parent }));
    const userDataArg = args.nodeUserData || pulumi.output("");
    const userdata = pulumi.all([awsRegion, args.cluster.name, args.cluster.endpoint, args.cluster.certificateAuthority, cfnStackName, userDataArg])
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
    const eksWorkerAmi = aws.getAmi({
        filters: [{
            name: "name",
            values: [ "amazon-eks-node-*" ],
        }],
        mostRecent: true,
        owners: [ "602401143452" ], // Amazon
    }, { parent: parent });
    const nodeLaunchConfiguration = new aws.ec2.LaunchConfiguration(`${name}-nodeLaunchConfiguration`, {
        associatePublicIpAddress: true,
        imageId: eksWorkerAmi.then(r => r.imageId),
        instanceType: args.instanceType || "t2.medium",
        iamInstanceProfile: instanceProfile.id,
        keyName: keyName,
        securityGroups: [ nodeSecurityGroupId ],
        rootBlockDevice: {
            volumeSize: args.nodeRootVolumeSize || 20, // GiB
            volumeType: "gp2", // default is "standard"
            deleteOnTermination: true,
        },
        userData: userdata,
    }, { parent: parent });

    const cfnSubnetIds = pulumi.output(args.subnetIds).apply(ids => pulumi.all(ids.map(pulumi.output))).apply(ids => JSON.stringify(ids));
    const cfnTemplateBody = pulumi.all([
        nodeLaunchConfiguration.id,
        args.desiredCapacity || 2,
        args.minSize || 1,
        args.maxSize || 2,
        args.cluster.name,
        cfnSubnetIds,
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
                        MinInstancesInService: '1'
                        MaxBatchSize: '1'
            `);

    const cfnStack = new aws.cloudformation.Stack(`${name}-nodes`, {
        name: cfnStackName,
        templateBody: cfnTemplateBody,
    }, { parent: parent, dependsOn: eksNodeAccess });

    return {
        instanceRole: instanceRole,
        nodeSecurityGroup: nodeSecurityGroup,
        cfnStack: cfnStack,
    };
}
