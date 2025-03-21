// Copyright 2016-2022, Pulumi Corporation.
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
import * as pulumi from "@pulumi/pulumi";
import * as netmask from "netmask";

import {
    AmiType,
    CpuArchitecture,
    getAmiMetadata,
    getAmiType,
    getOperatingSystem,
    OperatingSystem,
    toAmiType,
} from "./ami";
import { Cluster, CoreData, supportsAccessEntries } from "../cluster";
import { createNodeGroupSecurityGroup } from "./securitygroup";
import { InputTags } from "../utils";
import {
    createUserData,
    customUserDataArgs,
    ManagedNodeUserDataArgs,
    requiresCustomUserData,
    SelfManagedV1NodeUserDataArgs,
    SelfManagedV2NodeUserDataArgs,
} from "./userdata";
import randomSuffix from "../randomSuffix";
import { DEFAULT_INSTANCE_TYPE, filterEfaSubnets, getEfaNetworkInterfaces } from "./instances";

export type TaintEffect = "NoSchedule" | "NoExecute" | "PreferNoSchedule";

/**
 * Taint represents a Kubernetes `taint` to apply to all Nodes in a NodeGroup.  See
 * https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/.
 */
export interface Taint {
    /**
     * The value of the taint.
     */
    value: pulumi.Input<string>;
    /**
     * The effect of the taint.
     */
    effect: pulumi.Input<TaintEffect>;
}

/**
 * MIME document parts for nodeadm configuration. This can be shell scripts, nodeadm configuration or any other user data compatible script.
 *
 * See for more details: https://awslabs.github.io/amazon-eks-ami/nodeadm/.
 */
export type NodeadmOptions = {
    content: pulumi.Input<string>;
    contentType: pulumi.Input<string>;
};

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
     * The instance type to use for the cluster's nodes. Defaults to "t3.medium".
     */
    instanceType?: pulumi.Input<string | aws.ec2.InstanceType>;

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
    nodeSecurityGroupId?: pulumi.Input<string>;

    /**
     * The ingress rule that gives node group access.
     */
    clusterIngressRule?: aws.ec2.SecurityGroupRule;
    clusterIngressRuleId?: pulumi.Input<string>;

    /**
     * Extra security groups to attach on all nodes in this worker node group.
     *
     * This additional set of security groups captures any user application rules
     * that will be needed for the nodes.
     */
    extraNodeSecurityGroups?: aws.ec2.SecurityGroup[];

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
     * Whether to delete a cluster node's root volume on termination. Defaults to true.
     */
    nodeRootVolumeDeleteOnTermination?: pulumi.Input<boolean>;

    /**
     * Whether to encrypt a cluster node's root volume. Defaults to false.
     */
    nodeRootVolumeEncrypted?: pulumi.Input<boolean>;

    /**
     * Provisioned IOPS for a cluster node's root volume.
     * Only valid for io1 volumes.
     */
    nodeRootVolumeIops?: pulumi.Input<number> | undefined;

    /**
     * Provisioned throughput performance in integer MiB/s for a cluster node's root volume.
     * Only valid for gp3 volumes.
     */
    nodeRootVolumeThroughput?: pulumi.Input<number> | undefined;

    /**
     * Configured EBS type for a cluster node's root volume. Default is gp2.
     */
    nodeRootVolumeType?: "standard" | "gp2" | "gp3" | "st1" | "sc1" | "io1";

    /**
     * Extra code to run on node startup. This code will run after the AWS EKS bootstrapping code and before the node
     * signals its readiness to the managing CloudFormation stack. This code must be a typical user data script:
     * critically it must begin with an interpreter directive (i.e. a `#!`).
     */
    nodeUserData?: pulumi.Input<string>;

    /**
     * User specified code to run on node startup. This code is expected to
     * handle the full AWS EKS bootstrapping code and signal node readiness
     * to the managing CloudFormation stack. This code must be a complete
     * and executable user data script in bash (Linux) or powershell (Windows).
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/worker.html
     */
    nodeUserDataOverride?: pulumi.Input<string>;

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
     * The AMI type for the instance.
     *
     * If you are passing an amiId that is `arm64` type, then we need to ensure
     * that this value is set as `amazon-linux-2-arm64`.
     *
     * Note: `amiType` and `gpu` are mutually exclusive.
     */
    amiType?: pulumi.Input<string>;

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
     * Custom k8s node labels to be attached to each worker node.  Adds the given key/value pairs to the `--node-labels`
     * kubelet argument.
     */
    labels?: pulumi.Input<{ [key: string]: pulumi.Input<string> }>;

    /**
     * Custom k8s node taints to be attached to each worker node.  Adds the given taints to the `--register-with-taints`
     * kubelet argument.
     */
    taints?: pulumi.Input<{ [key: string]: pulumi.Input<Taint> }>;

    /**
     * Extra args to pass to the Kubelet.  Corresponds to the options passed in the `--kubeletExtraArgs` flag to
     * `/etc/eks/bootstrap.sh`.  For example, '--port=10251 --address=0.0.0.0'. Note that the `labels` and `taints`
     * properties will be applied to this list (using `--node-labels` and `--register-with-taints` respectively) after
     * to the expicit `kubeletExtraArgs`.
     */
    kubeletExtraArgs?: pulumi.Input<string>;

    /**
     * Additional args to pass directly to `/etc/eks/bootstrap.sh`.  For details on available options, see:
     * https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh.  Note that the `--apiserver-endpoint`,
     * `--b64-cluster-ca` and `--kubelet-extra-args` flags are included automatically based on other configuration
     * parameters.
     */
    bootstrapExtraArgs?: pulumi.Input<string>;

    /**
     * Whether or not to auto-assign public IP addresses on the EKS worker nodes.
     * If this toggle is set to true, the EKS workers will be
     * auto-assigned public IPs. If false, they will not be auto-assigned
     * public IPs.
     */
    nodeAssociatePublicIpAddress?: pulumi.Input<boolean>;

    /**
     * Desired Kubernetes master / control plane version. If you do not specify a value, the latest available version is used.
     */
    version?: pulumi.Input<string>;

    /**
     * The instance profile to use for this node group. Note, the role for the instance profile
     * must be supplied in the ClusterOptions as either: 'instanceRole', or as a role of 'instanceRoles'.
     */
    instanceProfile?: aws.iam.InstanceProfile;
    instanceProfileName?: pulumi.Input<string>;

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

    /**
     * Enables/disables detailed monitoring of the EC2 instances.
     *
     * With detailed monitoring, all metrics, including status check metrics, are available in 1-minute intervals.
     * When enabled, you can also get aggregated data across groups of similar instances.
     *
     * Note: You are charged per metric that is sent to CloudWatch. You are not charged for data storage.
     * For more information, see "Paid tier" and "Example 1 - EC2 Detailed Monitoring" here https://aws.amazon.com/cloudwatch/pricing/.
     */
    enableDetailedMonitoring?: pulumi.Input<boolean>;

    /**
     * The type of OS to use for the node group. Will be used to determine the right EKS optimized AMI to use based on the
     * instance types and gpu configuration.
     *
     * Defaults to `AL2`.
     */
    operatingSystem?: pulumi.Input<OperatingSystem>;

    /**
     * The configuration settings for Bottlerocket OS.
     * The settings will get merged with the base settings the provider uses to configure Bottlerocket.
     * This includes:
     *   - settings.kubernetes.api-server
     *   - settings.kubernetes.cluster-certificate
     *   - settings.kubernetes.cluster-name
     *   - settings.kubernetes.cluster-dns-ip
     *
     * For an overview of the available settings, see https://bottlerocket.dev/en/os/1.20.x/api/settings/.
     */
    bottlerocketSettings?: pulumi.Input<object>;

    /**
     * Extra nodeadm configuration sections to be added to the nodeadm user data.
     * This can be shell scripts, nodeadm NodeConfig or any other user data compatible script.
     * When configuring additional nodeadm NodeConfig sections, they'll be merged with the base settings the provider sets.
     * You can overwrite base settings or provide additional settings this way.
     *
     * The base settings are:
     *   - cluster.name
     *   - cluster.apiServerEndpoint
     *   - cluster.certificateAuthority
     *   - cluster.cidr
     *
     * Note: This is only applicable when using AL2023.
     * See for more details:
     * - [Amazon EKS AMI - Nodeadm](https://awslabs.github.io/amazon-eks-ami/nodeadm/).
     * - [Amazon EKS AMI - Nodeadm Configuration](https://awslabs.github.io/amazon-eks-ami/nodeadm/doc/api/).
     */
    nodeadmExtraOptions?: pulumi.Input<pulumi.Input<NodeadmOptions>[]>;
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
 * NodeGroupV2Options describes the configuration options accepted by a NodeGroupV2 component.
 */
export interface NodeGroupV2Options extends NodeGroupOptions {
    /**
     * The minimum amount of instances that should remain available during an instance refresh,
     * expressed as a percentage.
     *
     * Defaults to 50.
     */
    minRefreshPercentage?: pulumi.Input<number>;

    launchTemplateTagSpecifications?: pulumi.Input<
        pulumi.Input<awsInputs.ec2.LaunchTemplateTagSpecification>[]
    >;

    /**
     * Metadata options passed to EC2 instances
     */
    metadataOptions?: pulumi.Input<awsInputs.ec2.InstanceMetadataOptions>;

    /**
     * The instance warmup is the time period, in seconds, from when a new instance's state changes to InService to
     * when it can receive traffic. During an instance refresh, Amazon EC2 Auto Scaling does not immediately move on
     * to the next replacement after determining that a newly launched instance is healthy. It waits for the warm-up
     * period that you specified before it moves on to replacing other instances. This can be helpful when your
     * application takes time to initialize itself before it starts to serve traffic.
     */
    defaultInstanceWarmup?: pulumi.Input<number>;

    /**
     * Whether to ignore changes to the desired size of the AutoScalingGroup. This is useful when using Cluster Autoscaler.
     *
     * See EKS best practices for more details: https://aws.github.io/aws-eks-best-practices/cluster-autoscaling/
     */
    ignoreScalingChanges?: boolean;
}

/**
 * NodeGroupData describes the resources created for the given NodeGroup.
 */
export interface NodeGroupData {
    /**
     * The security group for the node group to communicate with the cluster.
     */
    nodeSecurityGroup: aws.ec2.SecurityGroup | undefined;
    nodeSecurityGroupId: pulumi.Output<string>;
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

export interface NodeGroupV2Data {
    /**
     * The security group for the node group to communicate with the cluster.
     */
    nodeSecurityGroup: aws.ec2.SecurityGroup | undefined;
    nodeSecurityGroupId: pulumi.Output<string>;
    /**
     * The AutoScalingGroup name for the node group.
     */
    autoScalingGroup: aws.autoscaling.Group;
    /**
     * The additional security groups for the node group that captures user-specific rules.
     */
    extraNodeSecurityGroups?: aws.ec2.SecurityGroup[];
}

/**
 * NodeGroup is a component that wraps the AWS EC2 instances that provide compute capacity for an EKS cluster.
 */
export class NodeGroup extends pulumi.ComponentResource {
    public readonly autoScalingGroupName!: pulumi.Output<string>;
    public readonly cfnStack!: pulumi.Output<aws.cloudformation.Stack>;
    public readonly extraNodeSecurityGroups!: pulumi.Output<aws.ec2.SecurityGroup[]>;
    public readonly nodeSecurityGroup!: pulumi.Output<aws.ec2.SecurityGroup | undefined>;
    public readonly nodeSecurityGroupId!: pulumi.Output<string>;

    constructor(name: string, args: NodeGroupArgs, opts?: pulumi.ComponentResourceOptions) {
        const type = "eks:index:NodeGroup";

        if (opts?.urn) {
            const props = {
                autoScalingGroupName: undefined,
                cfnStack: undefined,
                extraNodeSecurityGroups: undefined,
                nodeSecurityGroup: undefined,
                nodeSecurityGroupId: undefined,
            };
            super(type, name, props, opts);
            return;
        }

        super(type, name, args, opts);

        const core = pulumi
            .output(args.cluster)
            .apply((c) => (c instanceof Cluster ? c.core : c)) as pulumi.Output<
            pulumi.Unwrap<CoreData>
        >;

        const group = createNodeGroup(name, args, core, this, opts?.provider);
        this.autoScalingGroupName = group.autoScalingGroupName;
        this.cfnStack = pulumi.output(group.cfnStack);
        this.extraNodeSecurityGroups = pulumi.output(group.extraNodeSecurityGroups ?? []);
        this.nodeSecurityGroup = pulumi.output(group.nodeSecurityGroup);
        this.nodeSecurityGroupId = pulumi.output(group.nodeSecurityGroupId);
        this.registerOutputs({
            autoScalingGroupName: this.autoScalingGroupName,
            cfnStack: this.cfnStack,
            extraNodeSecurityGroups: this.extraNodeSecurityGroups,
            nodeSecurityGroup: this.nodeSecurityGroup,
            nodeSecurityGroupId: this.nodeSecurityGroupId,
        });
    }
}

/** @internal */
export type NodeGroupArgs = Omit<NodeGroupOptions, "cluster"> & {
    cluster: pulumi.Input<Cluster | pulumi.Unwrap<CoreData>>;
};

/**
 * NodeGroupV2 is a component that wraps the AWS EC2 instances that provide compute capacity for an EKS cluster.
 * In contrast to NodeGroup, it uses Launch Templates and AutoScaling Groups to manage the EC2 instances instead
 * of shelling out to CloudFormation and using the deprecated Launch Configuration resources.
 */
export class NodeGroupV2 extends pulumi.ComponentResource {
    public readonly autoScalingGroup!: pulumi.Output<aws.autoscaling.Group>;
    public readonly extraNodeSecurityGroups!: pulumi.Output<aws.ec2.SecurityGroup[]>;
    public readonly nodeSecurityGroup!: pulumi.Output<aws.ec2.SecurityGroup | undefined>;
    public readonly nodeSecurityGroupId!: pulumi.Output<string>;

    constructor(name: string, args: NodeGroupV2Args, opts?: pulumi.ComponentResourceOptions) {
        const type = "eks:index:NodeGroupV2";

        if (opts?.urn) {
            const props = {
                autoScalingGroup: undefined,
                extraNodeSecurityGroups: undefined,
                nodeSecurityGroup: undefined,
                nodeSecurityGroupId: undefined,
            };
            super(type, name, props, opts);
            return;
        }

        super(type, name, args, opts);

        const core = pulumi
            .output(args.cluster)
            .apply((c) => (c instanceof Cluster ? c.core : c)) as pulumi.Output<
            pulumi.Unwrap<CoreData>
        >;

        const group = createNodeGroupV2(name, args, core, this, opts?.provider);
        this.autoScalingGroup = pulumi.output(group.autoScalingGroup);
        this.extraNodeSecurityGroups = pulumi.output(group.extraNodeSecurityGroups ?? []);
        this.nodeSecurityGroup = pulumi.output(group.nodeSecurityGroup);
        this.nodeSecurityGroupId = pulumi.output(group.nodeSecurityGroupId);
        this.registerOutputs({
            autoScalingGroup: this.autoScalingGroup,
            extraNodeSecurityGroups: this.extraNodeSecurityGroups,
            nodeSecurityGroup: this.nodeSecurityGroup,
            nodeSecurityGroupId: this.nodeSecurityGroupId,
        });
    }
}

/** @internal */
export type NodeGroupV2Args = Omit<NodeGroupV2Options, "cluster"> & {
    cluster: pulumi.Input<Cluster | pulumi.Unwrap<CoreData>>;
};

export function resolveInstanceProfileName(
    args: Omit<NodeGroupOptions, "cluster">,
    c: pulumi.UnwrappedObject<CoreData>,
): pulumi.Output<string> {
    if (
        (args.instanceProfile || c.nodeGroupOptions.instanceProfile) &&
        (args.instanceProfileName || c.nodeGroupOptions.instanceProfileName)
    ) {
        throw new pulumi.InputPropertyError({
            propertyPath: "instanceProfile",
            reason: `instanceProfile and instanceProfileName are mutually exclusive`,
        });
    }

    if (args.instanceProfile) {
        return args.instanceProfile.name;
    } else if (args.instanceProfileName) {
        return pulumi.output(args.instanceProfileName);
    } else if (c.nodeGroupOptions.instanceProfile) {
        return c.nodeGroupOptions.instanceProfile.name;
    } else if (c.nodeGroupOptions.instanceProfileName) {
        return pulumi.output(c.nodeGroupOptions.instanceProfileName!);
    } else {
        throw new pulumi.InputPropertyError({
            propertyPath: "instanceProfile",
            reason: `an instanceProfile or instanceProfileName is required`,
        });
    }
}

function createNodeGroup(
    name: string,
    args: Omit<NodeGroupOptions, "cluster">,
    core: pulumi.Output<pulumi.Unwrap<CoreData>>,
    parent: pulumi.ComponentResource,
    provider?: pulumi.ProviderResource,
): NodeGroupData {
    const validationErrors: pulumi.InputPropertyErrorDetails[] = [];

    const instanceProfileName = core.apply((c) => resolveInstanceProfileName(args, c));

    if (args.clusterIngressRule && args.clusterIngressRuleId) {
        validationErrors.push({
            propertyPath: "clusterIngressRule",
            reason: `clusterIngressRule and clusterIngressRuleId are mutually exclusive`,
        });
    }

    if (args.nodeSecurityGroup && args.nodeSecurityGroupId) {
        validationErrors.push({
            propertyPath: "nodeSecurityGroup",
            reason: `nodeSecurityGroup and nodeSecurityGroupId are mutually exclusive`,
        });
    }

    const coreSecurityGroupId = core.nodeGroupOptions.nodeSecurityGroup?.apply((sg) => sg?.id);
    pulumi
        .all([
            coreSecurityGroupId,
            args.nodeSecurityGroup?.id ?? args.nodeSecurityGroupId,
            core.nodeSecurityGroupTags,
        ])
        .apply(([coreSecurityGroup, nodeSecurityGroup, sgTags]) => {
            if (coreSecurityGroup && nodeSecurityGroup) {
                if (sgTags && coreSecurityGroup !== nodeSecurityGroup) {
                    throw new pulumi.InputPropertyError({
                        propertyPath: args.nodeSecurityGroup
                            ? "nodeSecurityGroup"
                            : "nodeSecurityGroupId",
                        reason: `The NodeGroup's nodeSecurityGroup and the cluster option nodeSecurityGroupTags are mutually exclusive. Choose a single approach`,
                    });
                }
            }
        });
    if (args.nodePublicKey && args.keyName) {
        validationErrors.push({
            propertyPath: "nodePublicKey",
            reason: "nodePublicKey and keyName are mutually exclusive. Choose a single approach",
        });
    }

    if (args.amiId && args.gpu) {
        validationErrors.push({
            propertyPath: "amiId",
            reason: "amiId and gpu are mutually exclusive.",
        });
    }

    if (
        args.nodeUserDataOverride &&
        (args.nodeUserData ||
            args.labels ||
            args.taints ||
            args.kubeletExtraArgs ||
            args.bootstrapExtraArgs)
    ) {
        validationErrors.push({
            propertyPath: "nodeUserDataOverride",
            reason: "nodeUserDataOverride and any combination of {nodeUserData, labels, taints, kubeletExtraArgs, or bootstrapExtraArgs} is mutually exclusive.",
        });
    }

    let nodeSecurityGroupId: pulumi.Output<string>;
    let nodeSecurityGroup: aws.ec2.SecurityGroup | undefined;
    const eksCluster = core.cluster;

    const cfnStackDeps = core.apply((c) => {
        const result: pulumi.Resource[] = [];
        if (c.vpcCni !== undefined) {
            result.push(c.vpcCni);
        }
        if (c.eksNodeAccess !== undefined) {
            result.push(c.eksNodeAccess);
        }
        return result;
    });

    let eksClusterIngressRuleId: pulumi.Output<string>;
    if (args.nodeSecurityGroup || args.nodeSecurityGroupId) {
        if (args.clusterIngressRule === undefined && args.clusterIngressRuleId === undefined) {
            validationErrors.push({
                propertyPath: "clusterIngressRule",
                reason: `clusterIngressRule or clusterIngressRuleId is required when nodeSecurityGroup is manually specified`,
            });
        }

        nodeSecurityGroup = args.nodeSecurityGroup;
        nodeSecurityGroupId =
            args.nodeSecurityGroup?.id ?? pulumi.output(args.nodeSecurityGroupId!);
        eksClusterIngressRuleId =
            args.clusterIngressRule?.id ?? pulumi.output(args.clusterIngressRuleId!);
    } else {
        const [nodeSg, eksClusterIngressRule] = createNodeGroupSecurityGroup(
            name,
            {
                vpcId: core.vpcId,
                clusterSecurityGroupId: pulumi
                    .output(core.clusterSecurityGroup)
                    .apply((sg) => sg?.id ?? core.cluster.vpcConfig.clusterSecurityGroupId),
                eksCluster: eksCluster,
                tags: pulumi.all([core.tags, core.nodeSecurityGroupTags]).apply(
                    ([tags, nodeSecurityGroupTags]) =>
                        <aws.Tags>{
                            ...nodeSecurityGroupTags,
                            ...tags,
                        },
                ),
            },
            parent,
        );
        nodeSecurityGroup = nodeSg;
        nodeSecurityGroupId = nodeSecurityGroup.id;
        eksClusterIngressRuleId = eksClusterIngressRule.id;
    }

    // Collect the IDs of any extra, user-specific security groups.
    const extraSGOutput = pulumi.output(args.extraNodeSecurityGroups);
    const extraNodeSecurityGroupIds = pulumi.all([extraSGOutput]).apply(([sg]) => {
        if (sg === undefined) {
            return [];
        }
        // Map out the ARNs of all of the instanceRoles.
        return sg.map((sg) => sg.id);
    });

    // If requested, add a new EC2 KeyPair for SSH access to the instances.
    let keyName = args.keyName;
    if (args.nodePublicKey) {
        const key = new aws.ec2.KeyPair(
            `${name}-keyPair`,
            {
                publicKey: args.nodePublicKey,
            },
            { parent, provider },
        );
        keyName = key.keyName;
    }

    const cfnStackName = randomSuffix(`${name}-cfnStackName`, name, { parent });

    const awsRegion = pulumi.output(aws.getRegion({}, { parent, async: true }));

    const os = pulumi
        .all([args.amiType, args.operatingSystem])
        .apply(([amiType, operatingSystem]) => {
            return getOperatingSystem(amiType, operatingSystem);
        });

    const serviceCidr = getClusterServiceCidr(core.cluster.kubernetesNetworkConfig);
    const clusterMetadata = {
        name: eksCluster.name,
        apiServerEndpoint: eksCluster.endpoint,
        certificateAuthority: eksCluster.certificateAuthority.data,
        serviceCidr,
    };

    const nodeadmExtraOptions = pulumi
        .output(args.nodeadmExtraOptions)
        .apply((nodeadmExtraOptions) => {
            return nodeadmExtraOptions ? pulumi.all(nodeadmExtraOptions) : undefined;
        });

    const nodegroupInputs = {
        nodeUserData: args.nodeUserData,
        nodeUserDataOverride: args.nodeUserDataOverride,
        bottlerocketSettings: args.bottlerocketSettings,
        kubeletExtraArgs: args.kubeletExtraArgs,
        bootstrapExtraArgs: args.bootstrapExtraArgs,
        labels: args.labels,
        taints: args.taints,
    };

    const userdata = pulumi
        .all([awsRegion, clusterMetadata, cfnStackName, os, nodeadmExtraOptions, nodegroupInputs])
        .apply(([region, clusterMetadata, stackName, os, nodeadmExtraOptions, nodegroupInputs]) => {
            const userDataArgs: SelfManagedV1NodeUserDataArgs = {
                ...nodegroupInputs,
                nodeGroupType: "self-managed-v1",
                awsRegion: region.name,
                stackName,
                nodeadmExtraOptions,
                extraUserData: nodegroupInputs.nodeUserData,
                userDataOverride: nodegroupInputs.nodeUserDataOverride,
            };

            return createUserData(os, clusterMetadata, userDataArgs, parent);
        });

    const version = pulumi.output(args.version || core.cluster.version);

    const amiId: pulumi.Input<string> = args.amiId || getRecommendedAMI(args, version, parent);

    // Enable auto-assignment of public IP addresses on worker nodes for
    // backwards compatibility on existing EKS clusters launched with it
    // enabled. Defaults to `true`.
    const nodeAssociatePublicIpAddress = args.nodeAssociatePublicIpAddress ?? true;

    const numeric = new RegExp("^\\d+$");

    // We need to wrap the validation in a pulumi.all as MLCs could supply pulumi.Output<T> or T.
    pulumi
        .all([args.nodeRootVolumeIops, args.nodeRootVolumeType, args.nodeRootVolumeThroughput])
        .apply(([nodeRootVolumeIops, nodeRootVolumeType, nodeRootVolumeThroughput]) => {
            const errors: pulumi.InputPropertyErrorDetails[] = [];
            if (nodeRootVolumeIops && nodeRootVolumeType !== "io1") {
                errors.push({
                    propertyPath: "nodeRootVolumeIops",
                    reason: "Cannot create a cluster node root volume of non-io1 type with provisioned IOPS (nodeRootVolumeIops).",
                });
            }

            if (nodeRootVolumeType === "io1" && nodeRootVolumeIops) {
                if (!numeric.test(nodeRootVolumeIops?.toString())) {
                    errors.push({
                        propertyPath: "nodeRootVolumeIops",
                        reason: "Cannot create a cluster node root volume of io1 type without provisioned IOPS (nodeRootVolumeIops) as integer value.",
                    });
                }
            }

            if (nodeRootVolumeThroughput && nodeRootVolumeType !== "gp3") {
                errors.push({
                    propertyPath: "nodeRootVolumeThroughput",
                    reason: "Cannot create a cluster node root volume of non-gp3 type with provisioned throughput (nodeRootVolumeThroughput).",
                });
            }

            if (nodeRootVolumeType === "gp3" && nodeRootVolumeThroughput) {
                if (!numeric.test(nodeRootVolumeThroughput?.toString())) {
                    errors.push({
                        propertyPath: "nodeRootVolumeThroughput",
                        reason: "Cannot create a cluster node root volume of gp3 type without provisioned throughput (nodeRootVolumeThroughput) as integer value.",
                    });
                }
            }

            if (errors.length > 0) {
                throw new pulumi.InputPropertiesError({
                    message: "Invalid arguments for node group",
                    errors: errors,
                });
            }
        });

    const amiInfo = pulumi.output(amiId).apply((id) =>
        aws.ec2.getAmi(
            {
                owners: ["self", "amazon"],
                filters: [
                    {
                        name: "image-id",
                        values: [id],
                    },
                ],
            },
            { parent },
        ),
    );

    const { rootBlockDevice, ebsBlockDevices } = pulumi
        .all([os, amiInfo])
        .apply(([os, amiInfo]) => {
            if (os === OperatingSystem.AL2) {
                // Old behavior to stay backwards compatible
                return {
                    rootBlockDevice: {
                        encrypted: args.nodeRootVolumeEncrypted ?? false,
                        volumeSize: args.nodeRootVolumeSize ?? 20, // GiB
                        volumeType: args.nodeRootVolumeType ?? "gp2",
                        iops: args.nodeRootVolumeIops,
                        throughput: args.nodeRootVolumeThroughput,
                        deleteOnTermination: args.nodeRootVolumeDeleteOnTermination ?? true,
                    },
                    ebsBlockDevices: [],
                };
            } else if (os !== OperatingSystem.Bottlerocket) {
                // New behavior, do not overwrite default values of the AMI
                return {
                    rootBlockDevice: {
                        encrypted: args.nodeRootVolumeEncrypted,
                        volumeSize: args.nodeRootVolumeSize,
                        volumeType: args.nodeRootVolumeType,
                        iops: args.nodeRootVolumeIops,
                        throughput: args.nodeRootVolumeThroughput,
                        deleteOnTermination: args.nodeRootVolumeDeleteOnTermination,
                    },
                    ebsBlockDevices: [],
                };
            }

            // Bottlerocket has two block devices, the root device stores the OS itself and the other is for data like images, logs, persistent storage
            // We need to allow users to configure the block device for data
            const deviceName = amiInfo.blockDeviceMappings.find(
                (bdm) => bdm.deviceName !== amiInfo.rootDeviceName,
            )?.deviceName;
            return {
                rootBlockDevice: {} as aws.types.input.ec2.LaunchConfigurationEbsBlockDevice,

                // if no ebs settings are specified, we cannot set the blockDevice props because that would end up as a validation error
                ebsBlockDevices: [
                    {
                        deviceName,
                        encrypted: args.nodeRootVolumeEncrypted,
                        volumeSize: args.nodeRootVolumeSize,
                        volumeType: args.nodeRootVolumeType,
                        iops: args.nodeRootVolumeIops,
                        throughput: args.nodeRootVolumeThroughput,
                        deleteOnTermination: args.nodeRootVolumeDeleteOnTermination,
                    },
                ]
                    .filter((bd) => Object.values(bd).some((v) => v !== undefined))
                    .map((bd) => {
                        return { ...bd, deviceName: bd.deviceName ?? amiInfo.rootDeviceName };
                    }),
            };
        });

    if (validationErrors.length > 0) {
        throw new pulumi.InputPropertiesError({
            message: "Invalid arguments for node group",
            errors: validationErrors,
        });
    }

    const nodeLaunchConfiguration = new aws.ec2.LaunchConfiguration(
        `${name}-nodeLaunchConfiguration`,
        {
            associatePublicIpAddress: nodeAssociatePublicIpAddress,
            imageId: amiId,
            instanceType: args.instanceType || DEFAULT_INSTANCE_TYPE,
            iamInstanceProfile: instanceProfileName,
            keyName: keyName,
            // This apply is necessary in s.t. the launchConfiguration picks up a
            // dependency on the eksClusterIngressRule. The nodes may fail to
            // connect to the cluster if we attempt to create them before the
            // ingress rule is applied.
            securityGroups: pulumi
                .all([nodeSecurityGroupId, extraNodeSecurityGroupIds, eksClusterIngressRuleId])
                .apply(([sg, extraSG, _]) => [sg, ...extraSG]),
            spotPrice: args.spotPrice,
            rootBlockDevice,
            ebsBlockDevices,
            userData: args.nodeUserDataOverride || userdata,
            enableMonitoring: args.enableDetailedMonitoring,
        },
        { parent, provider },
    );

    // Compute the worker node group subnets to use from the various approaches.
    let workerSubnetIds: pulumi.Output<string[]>;
    if (args.nodeSubnetIds !== undefined) {
        // Use the specified override subnetIds.
        workerSubnetIds = pulumi.output(args.nodeSubnetIds);
    } else {
        workerSubnetIds = core.apply((c) => {
            if (c.privateSubnetIds !== undefined) {
                // Use the specified private subnetIds.
                return Promise.resolve(c.privateSubnetIds);
            } else if (c.publicSubnetIds !== undefined) {
                // Use the specified public subnetIds.
                return Promise.resolve(c.publicSubnetIds);
            } else {
                // Use subnetIds from the cluster. Compute / auto-discover the private worker subnetIds from this set.
                return computeWorkerSubnets(parent, c.subnetIds);
            }
        });
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
    const autoScalingGroupTags: InputTags = pulumi
        .all([eksCluster.name, args.autoScalingGroupTags])
        .apply(
            ([clusterName, asgTags]) =>
                <aws.Tags>{
                    Name: `${clusterName}-worker`,
                    [`kubernetes.io/cluster/${clusterName}`]: "owned",
                    ...asgTags,
                },
        );

    const cfnTemplateBody = pulumi
        .all([
            nodeLaunchConfiguration.id,
            args.desiredCapacity,
            args.minSize,
            args.maxSize,
            tagsToAsgTags(autoScalingGroupTags),
            workerSubnetIds.apply(JSON.stringify),
        ])
        .apply(
            ([launchConfig, desiredCapacity, minSize, maxSize, asgTags, vpcSubnetIds]) => `
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
                `,
        );

    const cfnStack = new aws.cloudformation.Stack(
        `${name}-nodes`,
        {
            name: cfnStackName,
            templateBody: cfnTemplateBody,
            tags: pulumi.all([core.tags, args.cloudFormationTags]).apply(
                ([tags, cloudFormationTags]) =>
                    <aws.Tags>{
                        Name: `${name}-nodes`,
                        ...cloudFormationTags,
                        ...tags,
                    },
            ),
        },
        { parent, dependsOn: cfnStackDeps, provider },
    );

    const autoScalingGroupName = cfnStack.outputs.apply((outputs) => {
        if (!("NodeGroup" in outputs)) {
            throw new pulumi.ResourceError(
                "CloudFormation stack is not ready. Stack output key 'NodeGroup' does not exist.",
                parent,
            );
        }
        return outputs["NodeGroup"];
    });

    return {
        nodeSecurityGroup: nodeSecurityGroup,
        nodeSecurityGroupId: nodeSecurityGroupId,
        cfnStack: cfnStack,
        autoScalingGroupName: autoScalingGroupName,
        extraNodeSecurityGroups: args.extraNodeSecurityGroups,
    };
}

/**
 * Create a self-managed node group using a Launch Template and an ASG.
 *
 * See for more details:
 * https://docs.aws.amazon.com/eks/latest/userguide/worker.html
 */
export function createNodeGroupV2(
    name: string,
    args: Omit<NodeGroupV2Options, "cluster">,
    core: pulumi.Output<pulumi.Unwrap<CoreData>>,
    parent: pulumi.ComponentResource,
    provider?: pulumi.ProviderResource,
): NodeGroupV2Data {
    const validationErrors: pulumi.InputPropertyErrorDetails[] = [];

    const instanceProfileName = core.apply((c) => resolveInstanceProfileName(args, c));

    if (args.clusterIngressRule && args.clusterIngressRuleId) {
        validationErrors.push({
            propertyPath: "clusterIngressRule",
            reason: `clusterIngressRule and clusterIngressRuleId are mutually exclusive`,
        });
    }

    if (args.nodeSecurityGroup && args.nodeSecurityGroupId) {
        validationErrors.push({
            propertyPath: "nodeSecurityGroup",
            reason: `nodeSecurityGroup and nodeSecurityGroupId are mutually exclusive`,
        });
    }

    const coreSecurityGroupId = core.nodeGroupOptions.nodeSecurityGroup?.apply((sg) => sg?.id);
    pulumi
        .all([
            coreSecurityGroupId,
            args.nodeSecurityGroup?.id ?? args.nodeSecurityGroupId,
            core.nodeSecurityGroupTags,
        ])
        .apply(([coreSecurityGroup, nodeSecurityGroup, sgTags]) => {
            if (coreSecurityGroup && nodeSecurityGroup) {
                if (sgTags && coreSecurityGroup !== nodeSecurityGroup) {
                    throw new pulumi.InputPropertyError({
                        propertyPath: "nodeSecurityGroup",
                        reason: `The NodeGroup's nodeSecurityGroup and the cluster option nodeSecurityGroupTags are mutually exclusive. Choose a single approach`,
                    });
                }
            }
        });

    if (args.nodePublicKey && args.keyName) {
        validationErrors.push({
            propertyPath: "nodePublicKey",
            reason: "nodePublicKey and keyName are mutually exclusive. Choose a single approach",
        });
    }

    if (args.amiId && args.gpu) {
        validationErrors.push({
            propertyPath: "amiId",
            reason: "amiId and gpu are mutually exclusive.",
        });
    }

    if (
        args.nodeUserDataOverride &&
        (args.nodeUserData ||
            args.labels ||
            args.taints ||
            args.kubeletExtraArgs ||
            args.bootstrapExtraArgs)
    ) {
        validationErrors.push({
            propertyPath: "nodeUserDataOverride",
            reason: "nodeUserDataOverride and any combination of {nodeUserData, labels, taints, kubeletExtraArgs, or bootstrapExtraArgs} is mutually exclusive.",
        });
    }

    let nodeSecurityGroupId: pulumi.Output<string>;
    let nodeSecurityGroup: aws.ec2.SecurityGroup | undefined;
    const eksCluster = core.cluster;

    const nodeGroupDeps = core.apply((c) => {
        const result: pulumi.Resource[] = [];
        if (c.vpcCni !== undefined) {
            result.push(c.vpcCni);
        }
        if (c.eksNodeAccess !== undefined) {
            result.push(c.eksNodeAccess);
        }
        return result;
    });

    let eksClusterIngressRuleId: pulumi.Output<string>;
    if (args.nodeSecurityGroup || args.nodeSecurityGroupId) {
        if (args.clusterIngressRule === undefined && args.clusterIngressRuleId === undefined) {
            validationErrors.push({
                propertyPath: "clusterIngressRule",
                reason: `clusterIngressRule or clusterIngressRuleId is required when nodeSecurityGroup is manually specified`,
            });
        }

        nodeSecurityGroup = args.nodeSecurityGroup;
        nodeSecurityGroupId =
            args.nodeSecurityGroup?.id ?? pulumi.output(args.nodeSecurityGroupId!);
        eksClusterIngressRuleId =
            args.clusterIngressRule?.id ?? pulumi.output(args.clusterIngressRuleId!);
    } else {
        const [nodeSg, eksClusterIngressRule] = createNodeGroupSecurityGroup(
            name,
            {
                vpcId: core.vpcId,
                clusterSecurityGroupId: pulumi
                    .output(core.clusterSecurityGroup)
                    .apply((sg) => sg?.id ?? core.cluster.vpcConfig.clusterSecurityGroupId),
                eksCluster: eksCluster,
                tags: core.apply(
                    (c) =>
                        <aws.Tags>{
                            ...c.nodeSecurityGroupTags,
                            ...c.tags,
                        },
                ),
            },
            parent,
        );
        nodeSecurityGroup = nodeSg;
        nodeSecurityGroupId = nodeSg.id;
        eksClusterIngressRuleId = eksClusterIngressRule.id;
    }

    // Collect the IDs of any extra, user-specific security groups.
    const extraNodeSecurityGroupIds = pulumi.all([args.extraNodeSecurityGroups]).apply(([sg]) => {
        if (sg === undefined) {
            return [];
        }
        // Map out the ARNs of all of the instanceRoles.
        return sg.map((sg) => sg.id);
    });

    // If requested, add a new EC2 KeyPair for SSH access to the instances.
    let keyName = args.keyName;
    if (args.nodePublicKey) {
        const key = new aws.ec2.KeyPair(
            `${name}-keyPair`,
            {
                publicKey: args.nodePublicKey,
            },
            { parent, provider },
        );
        keyName = key.keyName;
    }

    const os = pulumi
        .all([args.amiType, args.operatingSystem])
        .apply(([amiType, operatingSystem]) => {
            return getOperatingSystem(amiType, operatingSystem);
        });

    const serviceCidr = getClusterServiceCidr(core.cluster.kubernetesNetworkConfig);
    const clusterMetadata = {
        name: eksCluster.name,
        apiServerEndpoint: eksCluster.endpoint,
        certificateAuthority: eksCluster.certificateAuthority.data,
        serviceCidr,
    };

    const nodeadmExtraOptions = pulumi
        .output(args.nodeadmExtraOptions)
        .apply((nodeadmExtraOptions) => {
            return nodeadmExtraOptions ? pulumi.all(nodeadmExtraOptions) : undefined;
        });

    const nodegroupInputs = {
        nodeUserData: args.nodeUserData,
        nodeUserDataOverride: args.nodeUserDataOverride,
        bottlerocketSettings: args.bottlerocketSettings,
        kubeletExtraArgs: args.kubeletExtraArgs,
        bootstrapExtraArgs: args.bootstrapExtraArgs,
        labels: args.labels,
        taints: args.taints,
    };

    const userdata = pulumi
        .all([clusterMetadata, name, os, nodeadmExtraOptions, nodegroupInputs])
        .apply(([clusterMetadata, stackName, os, nodeadmExtraOptions, nodegroupInputs]) => {
            const userDataArgs: SelfManagedV2NodeUserDataArgs = {
                ...nodegroupInputs,
                nodeGroupType: "self-managed-v2",
                stackName,
                nodeadmExtraOptions,
                extraUserData: nodegroupInputs.nodeUserData,
                userDataOverride: nodegroupInputs.nodeUserDataOverride,
            };

            return createUserData(os, clusterMetadata, userDataArgs, parent);
        })
        .apply((x) => Buffer.from(x, "utf-8").toString("base64")); // Launch Templates require user data to be passed as base64.

    const version = pulumi.output(args.version || core.cluster.version);

    const amiId: pulumi.Input<string> = args.amiId || getRecommendedAMI(args, version, parent);

    // Enable auto-assignment of public IP addresses on worker nodes for
    // backwards compatibility on existing EKS clusters launched with it
    // enabled. Defaults to `true`.
    const nodeAssociatePublicIpAddress = args.nodeAssociatePublicIpAddress ?? true;

    const numeric = new RegExp("^\\d+$");

    // We need to wrap the validation in a pulumi.all as MLCs could supply pulumi.Output<T> or T.
    pulumi
        .all([args.nodeRootVolumeIops, args.nodeRootVolumeType, args.nodeRootVolumeThroughput])
        .apply(([nodeRootVolumeIops, nodeRootVolumeType, nodeRootVolumeThroughput]) => {
            const errors: pulumi.InputPropertyErrorDetails[] = [];
            if (nodeRootVolumeIops && nodeRootVolumeType !== "io1") {
                errors.push({
                    propertyPath: "nodeRootVolumeIops",
                    reason: "Cannot create a cluster node root volume of non-io1 type with provisioned IOPS (nodeRootVolumeIops).",
                });
            }

            if (nodeRootVolumeType === "io1" && nodeRootVolumeIops) {
                if (!numeric.test(nodeRootVolumeIops?.toString())) {
                    errors.push({
                        propertyPath: "nodeRootVolumeIops",
                        reason: "Cannot create a cluster node root volume of io1 type without provisioned IOPS (nodeRootVolumeIops) as integer value.",
                    });
                }
            }

            if (nodeRootVolumeThroughput && nodeRootVolumeType !== "gp3") {
                errors.push({
                    propertyPath: "nodeRootVolumeThroughput",
                    reason: "Cannot create a cluster node root volume of non-gp3 type with provisioned throughput (nodeRootVolumeThroughput).",
                });
            }

            if (nodeRootVolumeType === "gp3" && nodeRootVolumeThroughput) {
                if (!numeric.test(nodeRootVolumeThroughput?.toString())) {
                    errors.push({
                        propertyPath: "nodeRootVolumeThroughput",
                        reason: "Cannot create a cluster node root volume of gp3 type without provisioned throughput (nodeRootVolumeThroughput) as integer value.",
                    });
                }
            }

            if (errors.length > 0) {
                throw new pulumi.InputPropertiesError({
                    message: "Invalid arguments for node group",
                    errors: errors,
                });
            }
        });

    const marketOptions = args.spotPrice
        ? {
              marketType: "spot",
              spotOptions: {
                  maxPrice: args.spotPrice,
              },
          }
        : undefined;

    const amiInfo = pulumi.output(amiId).apply((id) =>
        aws.ec2.getAmi(
            {
                owners: ["self", "amazon"],
                filters: [
                    {
                        name: "image-id",
                        values: [id],
                    },
                ],
            },
            { parent },
        ),
    );

    const deviceName = pulumi.all([os, amiInfo]).apply(([os, amiInfo]) => {
        if (os !== OperatingSystem.Bottlerocket) {
            return amiInfo.blockDeviceMappings[0].deviceName;
        }

        // Bottlerocket has two block devices, the root device stores the OS itself and the other is for data like images, logs, persistent storage
        // We need to allow users to configure the block device for data
        const deviceName = amiInfo.blockDeviceMappings.find(
            (bdm) => bdm.deviceName !== amiInfo.rootDeviceName,
        )?.deviceName;
        return deviceName ?? amiInfo.rootDeviceName;
    });

    const blockDeviceMappings = os.apply((os) => {
        // Old behavior to stay backwards compatible
        if (os === OperatingSystem.AL2) {
            return [
                {
                    deviceName: deviceName,
                    ebs: {
                        encrypted: pulumi
                            .output(args.nodeRootVolumeEncrypted)
                            .apply((val) => (val ? "true" : "false")),
                        volumeSize: args.nodeRootVolumeSize ?? 20, // GiB
                        volumeType: args.nodeRootVolumeType ?? "gp2",
                        iops: args.nodeRootVolumeIops,
                        throughput: args.nodeRootVolumeThroughput,
                        deleteOnTermination: pulumi
                            .output(args.nodeRootVolumeDeleteOnTermination)
                            .apply((val) => (val ?? true ? "true" : "false")),
                    },
                },
            ];
        }

        // New behavior, do not overwrite default values of the AMI
        const ebs = {
            encrypted:
                args.nodeRootVolumeEncrypted === undefined
                    ? undefined
                    : pulumi
                          .output(args.nodeRootVolumeEncrypted)
                          .apply((val) => (val ? "true" : "false")),
            volumeSize: args.nodeRootVolumeSize,
            volumeType: args.nodeRootVolumeType,
            iops: args.nodeRootVolumeIops,
            throughput: args.nodeRootVolumeThroughput,
            deleteOnTermination:
                args.nodeRootVolumeDeleteOnTermination === undefined
                    ? undefined
                    : pulumi
                          .output(args.nodeRootVolumeDeleteOnTermination)
                          .apply((val) => (val ? "true" : "false")),
        };

        // if no ebs settings are specified, we cannot set the blockDeviceMappings because that would end up as a validation error
        return Object.values(ebs).every((v) => v === undefined)
            ? []
            : [
                  {
                      deviceName: deviceName,
                      ebs: ebs,
                  },
              ];
    });

    if (validationErrors.length > 0) {
        throw new pulumi.InputPropertiesError({
            message: "Invalid arguments for node group",
            errors: validationErrors,
        });
    }

    const nodeLaunchTemplate = new aws.ec2.LaunchTemplate(
        `${name}-launchTemplate`,
        {
            imageId: amiId,
            instanceType: args.instanceType || DEFAULT_INSTANCE_TYPE,
            iamInstanceProfile: { name: instanceProfileName },
            keyName: keyName,
            instanceMarketOptions: marketOptions,
            blockDeviceMappings,
            networkInterfaces: [
                {
                    associatePublicIpAddress: String(nodeAssociatePublicIpAddress),
                    // This apply is necessary in s.t. the launchTemplate picks up a
                    // dependency on the eksClusterIngressRule. The nodes may fail to
                    // connect to the cluster if we attempt to create them before the
                    // ingress rule is applied.
                    securityGroups: pulumi
                        .all([
                            nodeSecurityGroupId,
                            extraNodeSecurityGroupIds,
                            eksClusterIngressRuleId,
                        ])
                        .apply(([sg, extraSG, _]) => [sg, ...extraSG]),
                },
            ],
            metadataOptions: args.metadataOptions,
            userData: userdata,
            tagSpecifications: args.launchTemplateTagSpecifications,
            monitoring:
                args.enableDetailedMonitoring == null
                    ? undefined
                    : {
                          enabled: args.enableDetailedMonitoring,
                      },
        },
        { parent, provider },
    );

    // Compute the worker node group subnets to use from the various approaches.
    let workerSubnetIds: pulumi.Output<string[]>;
    if (args.nodeSubnetIds !== undefined) {
        // Use the specified override subnetIds.
        workerSubnetIds = pulumi.output(args.nodeSubnetIds);
    } else {
        workerSubnetIds = core.apply((c) => {
            if (c.privateSubnetIds !== undefined) {
                // Use the specified private subnetIds.
                return Promise.resolve(c.privateSubnetIds);
            } else if (c.publicSubnetIds !== undefined) {
                // Use the specified public subnetIds.
                return Promise.resolve(c.publicSubnetIds);
            } else {
                // Use subnetIds from the cluster. Compute / auto-discover the private worker subnetIds from this set.
                return computeWorkerSubnets(parent, c.subnetIds);
            }
        });
    }

    const asgTags = pulumi
        .all([eksCluster.name, args.autoScalingGroupTags])
        .apply(([clusterName, tags]) => inputTagsToASGTags(clusterName, tags));

    const launchTemplateVersion = nodeLaunchTemplate.latestVersion.apply((v) => v.toString());

    const ignoreScalingChanges = args.ignoreScalingChanges ? ["desiredCapacity"] : undefined;
    const asGroup = new aws.autoscaling.Group(
        name,
        {
            minSize: args?.minSize ?? 1,
            maxSize: args?.maxSize ?? 2,
            desiredCapacity: args?.desiredCapacity ?? 2,
            launchTemplate: {
                name: nodeLaunchTemplate.name,
                version: launchTemplateVersion,
            },
            vpcZoneIdentifiers: workerSubnetIds,
            instanceRefresh: {
                strategy: "Rolling",
                preferences: {
                    minHealthyPercentage: args.minRefreshPercentage ?? 50,
                },
            },
            tags: asgTags,
            defaultInstanceWarmup: args.defaultInstanceWarmup,
        },
        { parent, dependsOn: nodeGroupDeps, provider, ignoreChanges: ignoreScalingChanges },
    );

    return {
        nodeSecurityGroup: nodeSecurityGroup,
        nodeSecurityGroupId: nodeSecurityGroupId,
        autoScalingGroup: asGroup,
        extraNodeSecurityGroups: args.extraNodeSecurityGroups,
    };
}

function inputTagsToASGTags(
    clusterName: string,
    tags: InputTags | undefined,
): awsInputs.autoscaling.GroupTag[] {
    const asgTags = Object.entries(tags ?? {}).map(
        ([key, value]) =>
            <awsInputs.autoscaling.GroupTag>{
                key,
                value,
                propagateAtLaunch: true,
            },
    );

    asgTags.push(
        {
            value: "owned",
            key: "kubernetes.io/cluster/" + clusterName,
            propagateAtLaunch: true,
        },
        {
            key: "Name",
            value: clusterName + "-worker",
            propagateAtLaunch: true,
        },
    );

    return asgTags;
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
export async function computeWorkerSubnets(
    parent: pulumi.Resource,
    subnetIds: string[],
): Promise<string[]> {
    const publicSubnets: string[] = [];

    const privateSubnets: string[] = [];
    for (const subnetId of subnetIds) {
        // Fetch the route table for this subnet.
        const routeTable = await getRouteTableAsync(parent, subnetId);

        // Once we have the route table, check its list of routes for a route to an internet gateway.
        const hasInternetGatewayRoute =
            routeTable.routes.find((r) => !!r.gatewayId && !isPrivateCIDRBlock(r.cidrBlock)) !==
            undefined;
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
        const mainRouteTableInfo = await aws.ec2.getRouteTables(
            {
                vpcId: subnet.vpcId,
                filters: [
                    {
                        name: "association.main",
                        values: ["true"],
                    },
                ],
            },
            invokeOpts,
        );
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

    return (
        privateA.contains(cidrBlock) || privateB.contains(cidrBlock) || privateC.contains(cidrBlock)
    );
}

/**
 * Iterates through the tags map creating AWS ASG-style tags
 */
function tagsToAsgTags(tagsInput: InputTags): pulumi.Output<string> {
    return pulumi.output(tagsInput).apply((tags) => {
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
export type ManagedNodeGroupOptions = Omit<
    aws.eks.NodeGroupArgs,
    "clusterName" | "nodeRoleArn" | "subnetIds" | "scalingConfig"
> & {
    /**
     * The target EKS cluster.
     */
    cluster: Cluster | CoreData;

    /**
     * Make clusterName optional, since the cluster is required and it contains it.
     */
    clusterName?: pulumi.Output<string>;

    /**
     * Extra args to pass to the Kubelet.  Corresponds to the options passed in the `--kubeletExtraArgs` flag to
     * `/etc/eks/bootstrap.sh`.  For example, '--port=10251 --address=0.0.0.0'. To escape characters in the extra args
     * value, wrap the value in quotes. For example, `kubeletExtraArgs = '--allowed-unsafe-sysctls "net.core.somaxconn"'`.
     *
     * Note that this field conflicts with `launchTemplate`.
     */
    kubeletExtraArgs?: string;

    /**
     * Additional args to pass directly to `/etc/eks/bootstrap.sh`.  For details on available options, see:
     * https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh.  Note that the `--apiserver-endpoint`,
     * `--b64-cluster-ca` and `--kubelet-extra-args` flags are included automatically based on other configuration
     * parameters.
     *
     * Note that this field conflicts with `launchTemplate`.
     */
    bootstrapExtraArgs?: string;

    /**
     * Enables the ability to use EC2 Instance Metadata Service v2, which provides a more secure way to access instance
     * metadata. For more information, see: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html.
     * Defaults to `false` for AL2 and true for AL2023 & Bottlerocket.
     *
     * Note that this field conflicts with `launchTemplate`. If you are providing a custom `launchTemplate`, you should
     * enable this feature within the `launchTemplateMetadataOptions` of the supplied `launchTemplate`.
     */
    enableIMDSv2?: boolean;

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
    scalingConfig?: pulumi.Input<awsInputs.eks.NodeGroupScalingConfig>;

    /**
     * Whether to ignore changes to the desired size of the AutoScalingGroup. This is useful when using Cluster Autoscaler.
     *
     * See EKS best practices for more details: https://aws.github.io/aws-eks-best-practices/cluster-autoscaling/
     */
    ignoreScalingChanges?: boolean;

    /**
     * The type of OS to use for the node group. Will be used to determine the right EKS optimized AMI to use based on the
     * instance types and gpu configuration. Valid values are `AL2`, `AL2023` and `Bottlerocket`.
     *
     * Defaults to `AL2`.
     */
    operatingSystem?: pulumi.Input<OperatingSystem>;

    /**
     * The configuration settings for Bottlerocket OS.
     * The settings will get merged with the base settings the provider uses to configure Bottlerocket.
     * This includes:
     *   - settings.kubernetes.api-server
     *   - settings.kubernetes.cluster-certificate
     *   - settings.kubernetes.cluster-name
     *   - settings.kubernetes.cluster-dns-ip
     *
     * For an overview of the available settings, see https://bottlerocket.dev/en/os/1.20.x/api/settings/.
     */
    bottlerocketSettings?: pulumi.Input<object>;

    /**
     * User specified code to run on node startup. This is expected to handle the full AWS EKS node bootstrapping.
     * If omitted, the provider will configure the user data.
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html#launch-template-user-data
     */
    userData?: pulumi.Input<string>;

    /**
     * Use the latest recommended EKS Optimized AMI with GPU support for the worker nodes.
     * Defaults to false.
     *
     * Note: `gpu` and `amiId` are mutually exclusive.
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-amis.html.
     */
    gpu?: pulumi.Input<boolean>;

    /**
     * The AMI ID to use for the worker nodes.
     * Defaults to the latest recommended EKS Optimized AMI from the AWS Systems Manager Parameter Store.
     *
     * Note: `amiId` is mutually exclusive with `gpu` and `amiType`.
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
     */
    amiId?: pulumi.Input<string>;

    /**
     * Extra nodeadm configuration sections to be added to the nodeadm user data.
     * This can be shell scripts, nodeadm NodeConfig or any other user data compatible script.
     * When configuring additional nodeadm NodeConfig sections, they'll be merged with the base settings the provider sets.
     * You can overwrite base settings or provide additional settings this way.
     *
     * The base settings are:
     *   - cluster.name
     *   - cluster.apiServerEndpoint
     *   - cluster.certificateAuthority
     *   - cluster.cidr
     *
     * Note: This is only applicable when using AL2023.
     * See for more details:
     * - [Amazon EKS AMI - Nodeadm](https://awslabs.github.io/amazon-eks-ami/nodeadm/).
     * - [Amazon EKS AMI - Nodeadm Configuration](https://awslabs.github.io/amazon-eks-ami/nodeadm/doc/api/).
     */
    nodeadmExtraOptions?: pulumi.Input<pulumi.Input<NodeadmOptions>[]>;

    /**
     * The availability zone for the placement group.
     */
    placementGroupAvailabilityZone?: pulumi.Input<string>;

    /**
     * Determines whether to enable Elastic Fabric Adapter (EFA) support for the node group.
     */
    enableEfaSupport?: boolean;
};

/**
 * ManagedNodeGroup is a component that wraps creating an AWS managed node group.
 *
 * See for more details:
 * https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
 */
export class ManagedNodeGroup extends pulumi.ComponentResource {
    public readonly nodeGroup!: pulumi.Output<aws.eks.NodeGroup>;
    public readonly placementGroupName!: pulumi.Output<string>;

    constructor(name: string, args: ManagedNodeGroupArgs, opts?: pulumi.ComponentResourceOptions) {
        const type = "eks:index:ManagedNodeGroup";

        if (opts?.urn) {
            const props = {
                nodeGroup: undefined,
                placementGroupName: undefined,
            };
            super(type, name, props, opts);
            return;
        }

        super(type, name, args, opts);

        const core = pulumi
            .output(args.cluster)
            .apply((c) => (c instanceof Cluster ? c.core : c)) as pulumi.Output<
            pulumi.Unwrap<CoreData>
        >;

        const outputs = createManagedNodeGroup(name, args, core, this, opts?.provider);
        this.nodeGroup = pulumi.output(outputs.nodeGroup);
        this.placementGroupName = pulumi.output(outputs.placementGroupName);
        this.registerOutputs({
            nodeGroup: this.nodeGroup,
            placementGroupName: this.placementGroupName,
        });
    }
}

/** @internal */
export type ManagedNodeGroupArgs = Omit<ManagedNodeGroupOptions, "cluster"> & {
    cluster: pulumi.Input<Cluster | pulumi.Unwrap<CoreData>>;
};

export type ManagedNodeGroupOutput = {
    nodeGroup: aws.eks.NodeGroup;
    placementGroupName: pulumi.Output<string> | string;
};

/**
 * Create an AWS managed node group.
 *
 * See for more details:
 * https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
 */
export function createManagedNodeGroup(
    name: string,
    args: Omit<ManagedNodeGroupOptions, "cluster">,
    core: pulumi.Output<pulumi.Unwrap<CoreData>>,
    parent: pulumi.Resource,
    provider?: pulumi.ProviderResource,
): ManagedNodeGroupOutput {
    // default the version to the cluster version if not provided.
    // we can only do that if the user doesn't provide a launch template. If they do, they're responsible
    // for deciding the k8s version as part of the ami they're choosing.
    if (!args.version && !args.launchTemplate) {
        args.version = pulumi.output(args.version ?? core.cluster.version);
    }

    const validationErrors: pulumi.InputPropertyErrorDetails[] = [];

    if (args.nodeRole && args.nodeRoleArn) {
        validationErrors.push({
            propertyPath: "nodeRole",
            reason: "You cannot specify both nodeRole and nodeRoleArn when creating a managed node group.",
        });
    }

    const amiIdMutuallyExclusive: (keyof Omit<ManagedNodeGroupOptions, "cluster">)[] = [
        "gpu",
        "amiType",
    ];
    amiIdMutuallyExclusive.forEach((key) => {
        if (args.amiId && args[key]) {
            validationErrors.push({
                propertyPath: "amiId",
                reason: `You cannot specify both amiId and ${key} when creating a managed node group.`,
            });
        }
    });

    let roleArn: pulumi.Input<string>;
    if (args.nodeRoleArn) {
        roleArn = args.nodeRoleArn;
    } else if (args.nodeRole) {
        roleArn = pulumi.output(args.nodeRole).apply((r) => r.arn);
    } else {
        validationErrors.push({
            propertyPath: "nodeRole",
            reason: "An IAM role, or role ARN must be provided to create a managed node group",
        });
        throw new pulumi.InputPropertiesError({
            message: "The input properties for the managed node group are invalid.",
            errors: validationErrors,
        });
    }

    // Check that the nodegroup role has been set on the cluster to
    // ensure that the aws-auth configmap was properly formed.
    const nodegroupRole = pulumi.all([core.instanceRoles, roleArn]).apply(([roles, rArn]) => {
        // Map out the ARNs of all of the instanceRoles. Note that the roles array may be undefined if
        // unspecified by the Pulumi program.
        const roleArns: pulumi.Output<string>[] = roles ? roles.map((role) => role.arn) : [];

        // Try finding the nodeRole in the ARNs array.
        return pulumi.all([roleArns, rArn]).apply(([arns, arn]) => {
            return arns.find((a) => a === arn);
        });
    });

    pulumi
        .all([core.cluster.accessConfig.authenticationMode, nodegroupRole])
        .apply(([authMode, role]) => {
            // access entries can be added out of band, so we don't require them to be set in the cluster.
            if (!supportsAccessEntries(authMode) && !role) {
                throw new pulumi.InputPropertyError({
                    propertyPath: "nodeRole",
                    reason: "A managed node group cannot be created without first setting its role in the cluster's instanceRoles",
                });
            }
        });

    // Compute the node group subnets to use.
    let subnetIds: pulumi.Output<string[]>;
    if (args.subnetIds !== undefined) {
        subnetIds = pulumi.output(args.subnetIds);
    } else {
        subnetIds = core.apply((c) => {
            if (c.subnetIds !== undefined) {
                return c.subnetIds;
            } else if (c.privateSubnetIds !== undefined) {
                return c.privateSubnetIds;
            } else if (c.publicSubnetIds !== undefined) {
                return c.publicSubnetIds;
            } else {
                return [];
            }
        });
    }

    // Create a placement group if EFA support is enabled
    const createPlacementGroup = args.enableEfaSupport === true;
    const placementGroup = createPlacementGroup
        ? new aws.ec2.PlacementGroup(
              name,
              {
                  strategy: "cluster",
                  tags: args.tags,
              },
              { parent, provider },
          )
        : undefined;

    // Require users to be explicit about which AZs they want to use when enabling EFA support or creating a placement group.
    // We cannot deterministically determine the supported AZs because they can change over time and that would force replacements of the node group.
    // This way we prevent this footgun from happening.
    if (args.enableEfaSupport && !args.placementGroupAvailabilityZone) {
        validationErrors.push({
            propertyPath: "enableEfaSupport",
            reason: "You must specify placementGroupAvailabilityZone when enabling EFA support.",
        });
    }

    // filter the subnets by the availability zone if the nodes are in any way restricted to a specific AZ (e.g. through a placement group)
    if (createPlacementGroup && args.placementGroupAvailabilityZone) {
        subnetIds = filterEfaSubnets(
            subnetIds,
            args.placementGroupAvailabilityZone,
            args.instanceTypes,
            { provider, parent },
        );
    }

    // Omit the cluster from the args.
    const nodeGroupArgs = Object.assign({}, args);
    if ("cluster" in nodeGroupArgs) {
        delete (<any>nodeGroupArgs).cluster;
    }

    // Create a custom launch template for the managed node group if the user specifies any of the advanced options.
    // If the user specifies a custom LaunchTemplate, we throw an error and suggest that the user should include those in the launch template that they are providing.
    // If neither of these are provided, we can use the default launch template for managed node groups.
    if (args.launchTemplate && requiresCustomLaunchTemplate(args)) {
        validationErrors.push({
            propertyPath: "launchTemplate",
            reason: `If you provide a custom launch template, you cannot provide any of ${customLaunchTemplateArgs.join(
                ", ",
            )}. Please include these in the launch template that you are providing.`,
        });
    }

    const userDataArgs = {
        kubeletExtraArgs: args.kubeletExtraArgs,
        bootstrapExtraArgs: args.bootstrapExtraArgs,
        bottlerocketSettings: args.bottlerocketSettings,
        nodeadmExtraOptions: args.nodeadmExtraOptions,
    };

    if (requiresCustomUserData(userDataArgs) && args.userData) {
        validationErrors.push({
            propertyPath: "userData",
            reason: `If you provide custom userData, you cannot provide any of ${customUserDataArgs.join(
                ", ",
            )}. Please include these in the userData that you are providing.`,
        });
    }

    if (validationErrors.length > 0) {
        throw new pulumi.InputPropertiesError({
            message: "The input properties for the managed node group are invalid.",
            errors: validationErrors,
        });
    }

    let launchTemplate: aws.ec2.LaunchTemplate | undefined;
    if (requiresCustomLaunchTemplate(args)) {
        launchTemplate = createMNGCustomLaunchTemplate(
            name,
            args,
            core,
            placementGroup?.name,
            parent,
            provider,
        );

        // Disk size is specified in the launch template.
        delete nodeGroupArgs.diskSize;
    }

    let amiType = args.amiType;

    // amiType, releaseVersion and version cannot be set if an AMI ID is set in a custom launch template.
    // The AMI ID is set in the launch template if custom user data is required.
    // See https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html#mng-ami-id-conditions
    if (requiresCustomUserData(userDataArgs) || args.userData || args.amiId) {
        delete nodeGroupArgs.version;
        delete nodeGroupArgs.releaseVersion;
        delete nodeGroupArgs.amiType;
        amiType = undefined;
    } else if (amiType === undefined && args.operatingSystem !== undefined) {
        // if no ami type is provided, but operating system is provided, determine the ami type based on the operating system

        amiType = determineAmiType(
            args.operatingSystem,
            args.gpu,
            args.instanceTypes,
            "instanceTypes",
            parent,
        );
    }

    const ignoreScalingChanges = args.ignoreScalingChanges
        ? ["scalingConfig.desiredSize"]
        : undefined;

    // Make the aws-auth configmap a dependency of the node group.
    const ngDeps = core.apply((c) => (c.eksNodeAccess !== undefined ? [c.eksNodeAccess] : []));
    // Create the managed node group.
    const nodeGroup = new aws.eks.NodeGroup(
        name,
        {
            ...nodeGroupArgs,
            amiType,
            clusterName: args.clusterName || core.cluster.name,
            nodeRoleArn: roleArn,
            scalingConfig: pulumi.all([args.scalingConfig]).apply(([config]) => {
                const desiredSize = config?.desiredSize ?? 2;
                const minSize = config?.minSize ?? 1;
                const maxSize = config?.maxSize ?? 2;
                return {
                    desiredSize: desiredSize,
                    minSize: minSize,
                    maxSize: maxSize,
                };
            }),
            subnetIds: subnetIds,
            launchTemplate: launchTemplate
                ? {
                      id: launchTemplate.id,
                      version: launchTemplate.latestVersion.apply((version) => {
                          return `${version}`;
                      }),
                  }
                : args.launchTemplate,
        },
        { parent: parent, dependsOn: ngDeps, provider, ignoreChanges: ignoreScalingChanges },
    );

    return {
        nodeGroup,
        placementGroupName: placementGroup?.name ?? "",
    };
}

const customLaunchTemplateArgs: (keyof Omit<ManagedNodeGroupOptions, "cluster">)[] = [
    ...customUserDataArgs,
    "enableIMDSv2",
    "userData",
    "amiId",
    "enableEfaSupport",
];

function requiresCustomLaunchTemplate(args: Omit<ManagedNodeGroupOptions, "cluster">): boolean {
    return customLaunchTemplateArgs.some((key) => args[key] !== undefined);
}

/**
 * Create a custom launch template for the managed node group based on user inputs.
 */
function createMNGCustomLaunchTemplate(
    name: string,
    args: Omit<ManagedNodeGroupOptions, "cluster">,
    core: pulumi.Output<pulumi.Unwrap<CoreData>>,
    placementGroupName: pulumi.Input<string> | undefined,
    parent: pulumi.Resource,
    provider?: pulumi.ProviderResource,
): aws.ec2.LaunchTemplate {
    const os = pulumi
        .all([args.amiType, args.operatingSystem])
        .apply(([amiType, operatingSystem]) => {
            return getOperatingSystem(amiType, operatingSystem);
        });

    const taints = args.taints
        ? pulumi.output(args.taints).apply((taints) => {
              return taints
                  .map((taint) => {
                      return {
                          [taint.key]: {
                              value: taint.value,
                              effect: mapMngTaintEffect(taint.effect),
                          },
                      };
                  })
                  .reduce((acc, val) => Object.assign(acc, val), {});
          })
        : undefined;

    const serviceCidr = getClusterServiceCidr(core.cluster.kubernetesNetworkConfig);
    const clusterMetadata = {
        name: args.clusterName || core.cluster.name,
        apiServerEndpoint: core.cluster.endpoint,
        certificateAuthority: core.cluster.certificateAuthority.data,
        serviceCidr,
    };

    const customUserDataArgs = {
        kubeletExtraArgs: args.kubeletExtraArgs,
        bootstrapExtraArgs: args.bootstrapExtraArgs,
        bottlerocketSettings: args.bottlerocketSettings,
        nodeadmExtraOptions: args.nodeadmExtraOptions,
    };

    const nodeadmExtraOptions = pulumi
        .output(args.nodeadmExtraOptions)
        .apply((nodeadmExtraOptions) => {
            return nodeadmExtraOptions ? pulumi.all(nodeadmExtraOptions) : undefined;
        });

    let userData: pulumi.Output<string> | undefined;
    // when amiId is provided, we need to create a custom user data script because
    // EKS will not provide default user data when an AMI ID is provided.
    if (requiresCustomUserData(customUserDataArgs) || args.userData || args.amiId) {
        userData = pulumi
            .all([
                clusterMetadata,
                os,
                args.labels,
                taints,
                args.bottlerocketSettings,
                args.userData,
                nodeadmExtraOptions,
            ])
            .apply(
                ([
                    clusterMetadata,
                    os,
                    labels,
                    taints,
                    bottlerocketSettings,
                    userDataOverride,
                    nodeadmExtraOptions,
                ]) => {
                    const userDataArgs: ManagedNodeUserDataArgs = {
                        nodeGroupType: "managed",
                        kubeletExtraArgs: args.kubeletExtraArgs,
                        bootstrapExtraArgs: args.bootstrapExtraArgs,
                        labels,
                        taints,
                        bottlerocketSettings,
                        userDataOverride,
                        nodeadmExtraOptions,
                    };

                    const userData = createUserData(os, clusterMetadata, userDataArgs, parent);
                    return Buffer.from(userData, "utf-8").toString("base64");
                },
            );
    }

    // Turn on/off IMDSv2 based on the user input. Different AMIs have different defaults built in.
    // AL2 defaults to off, AL2023 & Bottlerocket defaults to on.
    const metadataOptions =
        args.enableIMDSv2 !== undefined
            ? {
                  httpTokens: args.enableIMDSv2 ? "required" : "optional",
                  httpPutResponseHopLimit: 2,
                  httpEndpoint: "enabled",
              }
            : undefined;

    const deviceName = os.apply((os) => {
        switch (os) {
            case OperatingSystem.AL2:
            case OperatingSystem.AL2023:
                // /dev/xvda is the default device name for the root volume on an Amazon Linux 2 & AL2023 instance.
                return "/dev/xvda";
            case OperatingSystem.Bottlerocket:
                // /dev/xvdb is the default device name for the data volume on a Bottlerocket instance.
                return "/dev/xvdb";
            default:
                // ensures this switch/case is exhaustive
                const exhaustiveCheck: never = os;
                throw new Error(`Unknown operating system: ${exhaustiveCheck}`);
        }
    });

    const blockDeviceMappings = args.diskSize
        ? [
              {
                  deviceName: deviceName,
                  ebs: {
                      volumeSize: args.diskSize,
                  },
              },
          ]
        : undefined;

    const networkInterfaces = args.enableEfaSupport
        ? getEfaNetworkInterfaces({
              instanceTypes: args.instanceTypes,
              securityGroupIds: [core.cluster.vpcConfig.clusterSecurityGroupId],
              instanceTypePropertyPath: "instanceTypes",
              opts: { provider, parent },
          })
        : undefined;

    return new aws.ec2.LaunchTemplate(
        `${name}-launchTemplate`,
        {
            blockDeviceMappings,
            userData,
            metadataOptions,
            // We need to supply an imageId if userData is set, otherwise AWS will attempt to merge the user data which will result in
            // nodes failing to join the cluster.
            imageId: userData
                ? args.amiId ?? getRecommendedAMI(args, core.cluster.version, parent)
                : undefined,
            placement: placementGroupName
                ? {
                      groupName: placementGroupName,
                  }
                : undefined,
            networkInterfaces: networkInterfaces,
        },
        { parent, provider },
    );
}

/**
 * Maps an EKS taint effect enum to its corresponding Kubernetes taint effect.
 *
 * @param effect - The taint effect string. Must be one of "NO_SCHEDULE", "NO_EXECUTE", "PREFER_NO_SCHEDULE".
 * @param parent - The parent Pulumi resource.
 * @returns The corresponding Kubernetes taint effect.
 * @throws {pulumi.InputPropertyError} If the provided effect is invalid.
 */
function mapMngTaintEffect(effect: string): TaintEffect {
    switch (effect) {
        case "NO_SCHEDULE":
            return "NoSchedule";
        case "NO_EXECUTE":
            return "NoExecute";
        case "PREFER_NO_SCHEDULE":
            return "PreferNoSchedule";
        default:
            throw new pulumi.InputPropertyError({
                propertyPath: "taints",
                reason: `Invalid taint effect: ${effect}. Must be one of NO_SCHEDULE, NO_EXECUTE, PREFER_NO_SCHEDULE.`,
            });
    }
}

function getClusterServiceCidr(
    networkConfig: pulumi.Output<aws.types.output.eks.ClusterKubernetesNetworkConfig>,
): pulumi.Output<string> {
    return networkConfig.apply((config) => {
        // ipFamily defaults to ipv4, so if v6 is not set we should return the v4 CIDR
        if (config.ipFamily === "ipv6") {
            return config.serviceIpv6Cidr;
        } else {
            return config.serviceIpv4Cidr;
        }
    });
}

/**
 * getRecommendedAMI returns the recommended AMI to use for a given configuration
 * when none is provided by the user.
 *
 * See: https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
 */
function getRecommendedAMI(
    args:
        | Omit<NodeGroupOptions, "cluster">
        | Omit<NodeGroupV2Options, "cluster">
        | Omit<ManagedNodeGroupOptions, "cluster">,
    k8sVersion: pulumi.Output<string>,
    parent: pulumi.Resource | undefined,
): pulumi.Input<string> {
    let instanceTypes: pulumi.Input<pulumi.Input<string>[]> | undefined;
    let instanceTypesPropertyPath: string = "";
    if ("instanceType" in args && args.instanceType) {
        instanceTypes = [args.instanceType];
        instanceTypesPropertyPath = "instanceType";
    } else if ("instanceTypes" in args) {
        instanceTypes = args.instanceTypes;
        instanceTypesPropertyPath = "instanceTypes";
    }

    const os = pulumi
        .all([args.amiType, args.operatingSystem])
        .apply(([amiType, operatingSystem]) => {
            return getOperatingSystem(amiType, operatingSystem);
        });

    const amiType = args.amiType
        ? pulumi.output(args.amiType).apply((amiType) => {
              const resolvedType = toAmiType(amiType);
              if (resolvedType === undefined) {
                  throw new pulumi.InputPropertyError({
                      propertyPath: "amiType",
                      reason: `Cannot resolve recommended AMI for AMI type: ${amiType}. Please provide the AMI ID and userdata.`,
                  });
              }
              return resolvedType;
          })
        : determineAmiType(os, args.gpu, instanceTypes, instanceTypesPropertyPath, parent);

    // if specified use the version from the args, otherwise use the version from the cluster.
    const version = args.version ? args.version : k8sVersion;

    return pulumi.all([amiType, version]).apply(([amiType, version]) => {
        const parameterName = getAmiMetadata(amiType).ssmParameterName(version);
        return pulumi.output(aws.ssm.getParameter({ name: parameterName }, { parent, async: true }))
            .value;
    });
}

/**
 * ec2InstanceRegex is a regular expression that can be used to parse an EC2
 * instance type string into its component parts. The component parts are:
 * - family: The instance family (e.g., "c5")
 * - generation: The instance generation (e.g., "2")
 * - processor: The processor type (e.g., "g")
 * - additionalCapabilities: Additional capabilities (e.g., "n")
 * - size: The instance size (e.g., "large")
 * These parts result in a string of the form: `c52gn.large`
 */
const ec2InstanceRegex = /([a-z]+)([0-9]+)([a-z])?\-?([a-z]+)?\.([a-zA-Z0-9\-]+)/;

/**
 * isGravitonInstance returns true if the instance type is a Graviton instance.
 * We determine this by checking if the third character of the instance type is
 * a "g".
 *
 * See https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html.
 */
export function isGravitonInstance(instanceType: string, propertyPath: string): boolean {
    const match = instanceType.toString().match(ec2InstanceRegex);
    if (!match) {
        throw new pulumi.InputPropertyError({
            propertyPath,
            reason: `Invalid EC2 instance type: ${instanceType}`,
        });
    }

    const processorFamily = match[3];

    return processorFamily === "g";
}

/**
 * Determines the AMI type to use for the given configuration based on the OS, GPU support, and
 * architecture of the instance types.
 */
function determineAmiType(
    os: pulumi.Input<OperatingSystem>,
    gpu: pulumi.Input<boolean> | undefined,
    instanceTypes: pulumi.Input<pulumi.Input<string>[]> | undefined,
    instanceTypesPropertyPath: string,
    parent: pulumi.Resource | undefined,
): pulumi.Output<AmiType> {
    const architecture = pulumi.output(instanceTypes).apply((instanceTypes) => {
        return pulumi
            .all(instanceTypes ?? [])
            .apply((instanceTypes) => getArchitecture(instanceTypes, instanceTypesPropertyPath));
    });

    return pulumi
        .all([os, gpu, architecture])
        .apply(([os, gpu, architecture]) => getAmiType(os, gpu ?? false, architecture, parent));
}

/**
 * Determines the architecture based on the provided instance types. Defaults to "x86_64" if no instance types are provided.
 *
 * @param instanceTypes - An array of instance types.
 * @returns The architecture of the instance types, either "arm64" or "x86_64".
 * @throws {pulumi.InputPropertyError} If the provided instance types do not share a common architecture.
 */
export function getArchitecture(instanceTypes: string[], propertyPath: string): CpuArchitecture {
    let hasGravitonInstances = false;
    let hasX64Instances = false;

    instanceTypes.forEach((instanceType) => {
        if (isGravitonInstance(instanceType, propertyPath)) {
            hasGravitonInstances = true;
        } else {
            hasX64Instances = true;
        }

        if (hasGravitonInstances && hasX64Instances) {
            throw new pulumi.InputPropertyError({
                propertyPath,
                reason: "Cannot determine architecture of instance types. The provided instance types do not share a common architecture",
            });
        }
    });

    return hasGravitonInstances ? "arm64" : "x86_64";
}
