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
import * as awsInputs from "@pulumi/aws/types/input";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as crypto from "crypto";
import * as netmask from "netmask";

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
     * The set of subnets to override and use for the worker node group.
     *
     * Setting this option overrides which subnets to use for the worker node
     * group, regardless if the cluster's `subnetIds` is set, or if
     * `publicSubnetIds` and/or `privateSubnetIds` were set.
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
     * The security group for the worker node group to communicate with the cluster.
     *
     * This security group requires specific inbound and outbound rules.
     *
     * See for more details:
     * https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html
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
     * Extra security groups to attach on all nodes in this worker node group.
     *
     * This additional set of security groups captures any user application rules
     * that will be needed for the nodes.
     */
    extraNodeSecurityGroups?: aws.ec2.SecurityGroup[];

    /**
     * Encrypt the root block device of the nodes in the node group.
     */
    encryptRootBockDevice?: pulumi.Input<boolean>;

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
     * The AMI ID to use for the worker nodes.
     *
     * Defaults to the latest recommended EKS Optimized Linux AMI from the
     * AWS Systems Manager Parameter Store.
     *
     * Note: `amiId` and `gpu` are mutually exclusive.
     *
     * See for more details:
     * - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
     */
    amiId?: pulumi.Input<string>;

    /**
     * Use the latest recommended EKS Optimized Linux AMI with GPU support for
     * the worker nodes from the AWS Systems Manager Parameter Store.
     *
     * Defaults to false.
     *
     * Note: `gpu` and `amiId` are mutually exclusive.
     *
     * See for more details:
     * - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
     * - https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
     */
    gpu?: pulumi.Input<boolean>;

    /**
     * Custom k8s node labels to be attached to each woker node.  Adds the given key/value pairs to the `--node-labels`
     * kubelet argument.
     */
    labels?: { [key: string]: string };

    /**
     * Custom k8s node taints to be attached to each worker node.  Adds the given taints to the `--register-with-taints`
     * kubelet argument.
     */
    taints?: { [key: string]: Taint };

    /**
     * Extra args to pass to the Kubelet.  Corresponds to the options passed in the `--kubeletExtraArgs` flag to
     * `/etc/eks/bootstrap.sh`.  For example, '--port=10251 --address=0.0.0.0'. Note that the `labels` and `taints`
     * properties will be applied to this list (using `--node-labels` and `--register-with-taints` respectively) after
     * to the expicit `kubeletExtraArgs`.
     */
    kubeletExtraArgs?: string;

    /**
     * Additional args to pass directly to `/etc/eks/bootstrap.sh`.  Fror details on available options, see:
     * https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh.  Note that the `--apiserver-endpoint`,
     * `--b64-cluster-ca` and `--kubelet-extra-args` flags are included automatically based on other configuration
     * parameters.
     */
    bootstrapExtraArgs?: string;

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
     * `cloudFormationTags`, you should either supply the tag in
     * `autoScalingGroupTags` or `cloudFormationTags`, but not both.
     */
    autoScalingGroupTags?: InputTags;

    /**
     * The tags to apply to the CloudFormation Stack of the Worker NodeGroup.
     *
     * Note: Given the inheritance of auto-generated CF tags and
     * `cloudFormationTags`, you should either supply the tag in
     * `autoScalingGroupTags` or `cloudFormationTags`, but not both.
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

/**
 * NodeGroupData describes the resources created for the given NodeGroup.
 */
export interface NodeGroupData {
    /**
     * The security group for the node group to communicate with the cluster.
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
    /**
     * The additional security groups for the node group that captures user-specific rules.
     */
    extraNodeSecurityGroups?: aws.ec2.SecurityGroup[];
}

/**
 * NodeGroup is a component that wraps the AWS EC2 instances that provide compute capacity for an EKS cluster.
 */
export class NodeGroup extends pulumi.ComponentResource implements NodeGroupData {
    /**
     * The security group for the node group to communicate with the cluster.
     */
    public readonly nodeSecurityGroup: aws.ec2.SecurityGroup;
    /**
     * The additional security groups for the node group that captures user-specific rules.
     */
    public readonly extraNodeSecurityGroups: aws.ec2.SecurityGroup[];

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

        const group = createNodeGroup(name, args, this, opts?.provider);
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

/**
 * Create a self-managed node group using CloudFormation and an ASG.
 *
 * See for more details:
 * https://docs.aws.amazon.com/eks/latest/userguide/worker.html
 */
export function createNodeGroup(name: string, args: NodeGroupOptions, parent: pulumi.ComponentResource, provider?: pulumi.ProviderResource): NodeGroupData {
    const core = isCoreData(args.cluster) ? args.cluster : args.cluster.core;

    if (!args.instanceProfile && !core.nodeGroupOptions.instanceProfile) {
        throw new Error(`an instanceProfile is required`);
    }

    if (core.nodeGroupOptions.nodeSecurityGroup && args.nodeSecurityGroup) {
        if (core.nodeSecurityGroupTags &&
            core.nodeGroupOptions.nodeSecurityGroup.id !== args.nodeSecurityGroup.id) {
            throw new Error(`The NodeGroup's nodeSecurityGroup and the cluster option nodeSecurityGroupTags are mutually exclusive. Choose a single approach`);
        }
    }

    if (args.nodePublicKey && args.keyName) {
        throw new Error("nodePublicKey and keyName are mutually exclusive. Choose a single approach");
    }

    if (args.amiId && args.gpu) {
        throw new Error("amiId and gpu are mutually exclusive.");
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
        [nodeSecurityGroup, eksClusterIngressRule] = createNodeGroupSecurityGroup(name, {
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
    }

    // This apply is necessary in s.t. the launchConfiguration picks up a
    // dependency on the eksClusterIngressRule. The nodes may fail to
    // connect to the cluster if we attempt to create them before the
    // ingress rule is applied.
    const nodeSecurityGroupId = pulumi.all([nodeSecurityGroup.id, eksClusterIngressRule.id])
        .apply(([id]) => id);

    // Collect the IDs of any extra, user-specific security groups.
    const extraNodeSecurityGroupIds = args.extraNodeSecurityGroups ? args.extraNodeSecurityGroups.map(sg => sg.id): [];

    // If requested, add a new EC2 KeyPair for SSH access to the instances.
    let keyName = args.keyName;
    if (args.nodePublicKey) {
        const key = new aws.ec2.KeyPair(`${name}-keyPair`, {
            publicKey: args.nodePublicKey,
        }, { parent, provider });
        keyName = key.keyName;
    }

    const cfnStackName = transform(`${name}-cfnStackName`, name, n => `${n}-${crypto.randomBytes(4).toString("hex")}`, { parent });

    const awsRegion = pulumi.output(aws.getRegion({}, { parent, async: true }));
    const userDataArg = args.nodeUserData || pulumi.output("");

    const kubeletExtraArgs = args.kubeletExtraArgs ? args.kubeletExtraArgs.split(" ") : [];
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
    let bootstrapExtraArgs = args.bootstrapExtraArgs ? (" " + args.bootstrapExtraArgs) : "";
    if (kubeletExtraArgs.length === 1) {
        // For backward compatibility with previous versions of this package, don't wrap a single argument with `''`.
        bootstrapExtraArgs += ` --kubelet-extra-args ${kubeletExtraArgs[0]}`;
    } else if (kubeletExtraArgs.length > 1) {
        bootstrapExtraArgs += ` --kubelet-extra-args '${kubeletExtraArgs.join(" ")}'`;
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

    const version = pulumi.output(args.version || core.cluster.version);

    // https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
    let amiId: pulumi.Input<string> | undefined = args.amiId;
    if (!amiId) {
        const amiType = args.gpu ? "amazon-linux-2-gpu" : "amazon-linux-2";
        amiId = version.apply(v => {
            const parameterName = `/aws/service/eks/optimized-ami/${v}/${amiType}/recommended/image_id`;
            return pulumi.output(aws.ssm.getParameter({name: parameterName}, {parent, async: true})).value;
        });
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
        iamInstanceProfile: args.instanceProfile || core.nodeGroupOptions.instanceProfile,
        keyName: keyName,
        securityGroups: [nodeSecurityGroupId, ...extraNodeSecurityGroupIds],
        spotPrice: args.spotPrice,
        rootBlockDevice: {
            encrypted: args.encryptRootBockDevice,
            volumeSize: args.nodeRootVolumeSize || 20, // GiB
            volumeType: "gp2", // default is "standard"
            deleteOnTermination: true,
        },
        userData: userdata,
    }, { parent, provider });

    // Compute the worker node group subnets to use from the various approaches.
    let workerSubnetIds: pulumi.Output<string[]>;
    if (args.nodeSubnetIds !== undefined) { // Use the specified override subnetIds.
        workerSubnetIds = pulumi.output(args.nodeSubnetIds);
    } else if (core.privateSubnetIds !== undefined) { // Use the specified private subnetIds.
        workerSubnetIds = core.privateSubnetIds;
    } else if (core.publicSubnetIds !== undefined) { // Use the specified public subnetIds.
        workerSubnetIds = core.publicSubnetIds;
    } else {
        // Use subnetIds from the cluster. Compute / auto-discover the private worker subnetIds from this set.
        workerSubnetIds = pulumi.output(core.subnetIds).apply(ids => computeWorkerSubnets(parent, ids));
    }

    // Configure the settings for the autoscaling group.
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
    }, { parent, dependsOn: cfnStackDeps, provider });

    const autoScalingGroupName = cfnStack.outputs.apply(outputs => {
        if (!("NodeGroup" in outputs)) {
            throw new Error("CloudFormation stack is not ready. Stack output key 'NodeGroup' does not exist.");
        }
        return outputs["NodeGroup"];
    });

    return {
        nodeSecurityGroup: nodeSecurityGroup,
        cfnStack: cfnStack,
        autoScalingGroupName: autoScalingGroupName,
        extraNodeSecurityGroups: args.extraNodeSecurityGroups,
    };
}

/** computeWorkerSubnets attempts to determine the subset of the given subnets to use for worker nodes.
 *
 * As per https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html, an EKS cluster that is attached to public
 * and private subnets will only expose its API service to workers on the private subnets. Any workers attached to the
 * public subnets will be unable to communicate with the API server.
 *
 * If all of the given subnet IDs are public, the list of subnet IDs is returned as-is. If any private subnet is given,
 * only the IDs of the private subnets are returned. A subnet is deemed private iff it has no route in its route table
 * that routes directly to an internet gateway. If any such route exists in a subnet's route table, it is treated as
 * public.
 */
export async function computeWorkerSubnets(parent: pulumi.Resource, subnetIds: string[]): Promise<string[]> {
    const publicSubnets: string[] = [];

    const privateSubnets: string[] = [];
    for (const subnetId of subnetIds) {
        // Fetch the route table for this subnet.
        const routeTable = await getRouteTableAsync(parent, subnetId);

        // Once we have the route table, check its list of routes for a route to an internet gateway.
        const hasInternetGatewayRoute = routeTable.routes
            .find(r => !!r.gatewayId && !isPrivateCIDRBlock(r.cidrBlock)) !== undefined;
        if (hasInternetGatewayRoute) {
            publicSubnets.push(subnetId);
        } else {
            privateSubnets.push(subnetId);
        }
    }
    return privateSubnets.length === 0 ? publicSubnets : privateSubnets;
}

async function getRouteTableAsync(parent: pulumi.Resource, subnetId: string) {
    const invokeOpts = { parent, async: true };
    try {
        // Attempt to get the explicit route table for this subnet. If there is no explicit rouute table for
        // this subnet, this call will throw.
        return await aws.ec2.getRouteTable({ subnetId }, invokeOpts);
    } catch {
        // If we reach this point, the subnet may not have an explicitly associated route table. In this case
        // the subnet is associated with its VPC's main route table (see
        // https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html#RouteTables for details).
        const subnet = await aws.ec2.getSubnet({ id: subnetId }, invokeOpts);
        const mainRouteTableInfo = await aws.ec2.getRouteTables({
            vpcId: subnet.vpcId,
            filters: [{
                name: "association.main",
                values: ["true"],
            }],
        }, invokeOpts);
        return await aws.ec2.getRouteTable({ routeTableId: mainRouteTableInfo.ids[0] }, invokeOpts);
    }
}

/**
 * Returns true if the given CIDR block falls within a private range [1].
 * [1] https://en.wikipedia.org/wiki/Private_network
 */
function isPrivateCIDRBlock(cidrBlock: string): boolean {
    const privateA = new netmask.Netmask("10.0.0.0/8");
    const privateB = new netmask.Netmask("172.16.0.0/12");
    const privateC = new netmask.Netmask("192.168.0.0/16");

    return privateA.contains(cidrBlock) || privateB.contains(cidrBlock) || privateC.contains(cidrBlock);
}

/**
 * Iterates through the tags map creating AWS ASG-style tags
 */
function tagsToAsgTags(tagsInput: InputTags): pulumi.Output<string> {
    return pulumi.output(tagsInput).apply(tags => {
        let output = "";
        for (const tag of Object.keys(tags)) {
            output += `
                          - Key: ${tag}
                            Value: ${tags[tag]}
                            PropagateAtLaunch: 'true'`;
        }
        return output;
    });
}

/**
 * ManagedNodeGroupOptions describes the configuration options accepted by an
 * AWS Managed NodeGroup.
 *
 * See for more details:
 * https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
 */
export type ManagedNodeGroupOptions = Omit<aws.eks.NodeGroupArgs, "clusterName" | "nodeRoleArn" | "subnetIds" | "scalingConfig"> & {
    /**
     * The target EKS cluster.
     */
    cluster: Cluster | CoreData;

    /**
     * Make clusterName optional, since the cluster is required and it contains it.
     */
    clusterName?: pulumi.Output<string>;

    /**
     * Make nodeGroupName optional, since the NodeGroup resource name can be
     * used as a default.
     */
    nodeGroupName?: pulumi.Input<string>;

    /**
     * Make nodeRoleArn optional, since users may prefer to provide the
     * nodegroup role directly using nodeRole.
     *
     * Note, nodeRoleArn and nodeRole are mutually exclusive, and a single option
     * must be used.
     */
    nodeRoleArn?: pulumi.Input<string>;

    /**
     * Make nodeRole optional, since users may prefer to provide the
     * nodeRoleArn.
     *
     * Note, nodeRole and nodeRoleArn are mutually exclusive, and a single
     * option must be used.
     */
    nodeRole?: pulumi.Input<aws.iam.Role>;

    /**
     * Make subnetIds optional, since the cluster is required and it contains it.
     *
     * Default subnetIds is chosen from the following list, in order, if
     * subnetIds arg is not set:
     *   - core.subnetIds
     *   - core.privateIds
     *   - core.publicSublicSubnetIds
     *
     * This default logic is based on the existing subnet IDs logic of this
     * package: https://git.io/JeM11
     */
    subnetIds?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * Make scalingConfig optional, since defaults can be computed.
     *
     * Default scaling amounts of the node group autoscaling group are:
     *   - desiredSize: 2
     *   - minSize: 1
     *   - maxSize: 2
     */
    scalingConfig?: pulumi.Input<awsInputs.eks.NodeGroupScalingConfig>
};

/**
 * Create an AWS managed node group.
 *
 * See for more details:
 * https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
 */
export function createManagedNodeGroup(name: string, args: ManagedNodeGroupOptions, parent?: pulumi.ComponentResource, provider?: pulumi.ProviderResource): aws.eks.NodeGroup {
    const core = isCoreData(args.cluster) ? args.cluster : args.cluster.core;
    const eksCluster = isCoreData(args.cluster) ? args.cluster.cluster : args.cluster;

    // Compute the nodegroup role.
    if (!args.nodeRole && !args.nodeRoleArn) {
        throw new Error(`An IAM role, or role ARN must be provided to create a managed node group`);
    }

    if (args.nodeRole && args.nodeRoleArn) {
        throw new Error("nodeRole and nodeRoleArn are mutually exclusive to create a managed node group");
    }

    let roleArn: pulumi.Input<string>;
    if (args.nodeRoleArn) {
        roleArn = args.nodeRoleArn;
    } else if (args.nodeRole) {
        roleArn = pulumi.output(args.nodeRole).apply(r => r.arn);
    } else {
        throw new Error("The managed node group role provided is undefined");
    }

    // Check that the nodegroup role has been set on the cluster to
    // ensure that the aws-auth configmap was properly formed.
    const nodegroupRole = pulumi.all([
        core.instanceRoles,
        roleArn,
    ]).apply(([roles, rArn]) => {
        // Map out the ARNs of all of the instanceRoles.
        const roleArns = roles.map(role => {
            return role.arn;
        });
        // Try finding the nodeRole in the ARNs array.
        return pulumi.all([
            roleArns,
            rArn,
        ]).apply(([arns, arn]) => {
            return arns.find(a => a === arn);
        });
    });

    nodegroupRole.apply(role => {
        if (!role) {
            throw new Error(`A managed node group cannot be created without first setting its role in the cluster's instanceRoles`);
        }
    });

    // Compute the node group subnets to use.
    let subnetIds: pulumi.Output<string[]> = pulumi.output([]);
    if (args.subnetIds !== undefined) {
        subnetIds = pulumi.output(args.subnetIds);
    } else if (core.subnetIds !== undefined) {
        subnetIds = core.subnetIds;
    } else if (core.privateSubnetIds !== undefined) {
        subnetIds = core.privateSubnetIds;
    } else if (core.publicSubnetIds !== undefined) {
        subnetIds = core.publicSubnetIds;
    }

    // Omit the cluster from the args using rest spread, and store in nodeGroupArgs.
    const { cluster, ...nodeGroupArgs } = args;

    // Make the aws-auth configmap a dependency of the node group.
    const ngDeps: Array<pulumi.Resource> = [];
    if (core.eksNodeAccess !== undefined) {
        ngDeps.push(core.eksNodeAccess);
    }
    // Create the managed node group.
    const nodeGroup = new aws.eks.NodeGroup(name, {
        ...nodeGroupArgs,
        clusterName: args.clusterName || core.cluster.name,
        nodeGroupName: args.nodeGroupName || name,
        nodeRoleArn: roleArn,
        scalingConfig: pulumi.all([
            args.scalingConfig,
        ]).apply(([config]) => {
            const desiredSize = config && config.desiredSize || 2;
            const minSize = config && config.minSize || 1;
            const maxSize = config && config.maxSize || 2;
            return {
                desiredSize: desiredSize,
                minSize: minSize,
                maxSize: maxSize,
            };
        }),
        subnetIds: subnetIds,
    }, { parent: parent ?? eksCluster, dependsOn: ngDeps, provider });

    return nodeGroup;
}
