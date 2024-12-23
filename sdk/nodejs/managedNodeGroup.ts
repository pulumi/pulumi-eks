// *** WARNING: this file was generated by pulumi-gen-eks. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import * as inputs from "./types/input";
import * as outputs from "./types/output";
import * as enums from "./types/enums";
import * as utilities from "./utilities";

import * as pulumiAws from "@pulumi/aws";
import * as pulumiKubernetes from "@pulumi/kubernetes";

import {Cluster, VpcCniAddon} from "./index";

/**
 * ManagedNodeGroup is a component that wraps creating an AWS managed node group.
 *
 * See for more details:
 * https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
 */
export class ManagedNodeGroup extends pulumi.ComponentResource {
    /** @internal */
    public static readonly __pulumiType = 'eks:index:ManagedNodeGroup';

    /**
     * Returns true if the given object is an instance of ManagedNodeGroup.  This is designed to work even
     * when multiple copies of the Pulumi SDK have been loaded into the same process.
     */
    public static isInstance(obj: any): obj is ManagedNodeGroup {
        if (obj === undefined || obj === null) {
            return false;
        }
        return obj['__pulumiType'] === ManagedNodeGroup.__pulumiType;
    }

    /**
     * The AWS managed node group.
     */
    public /*out*/ readonly nodeGroup!: pulumi.Output<pulumiAws.eks.NodeGroup>;

    /**
     * Create a ManagedNodeGroup resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args: ManagedNodeGroupArgs, opts?: pulumi.ComponentResourceOptions) {
        let resourceInputs: pulumi.Inputs = {};
        opts = opts || {};
        if (!opts.id) {
            if ((!args || args.cluster === undefined) && !opts.urn) {
                throw new Error("Missing required property 'cluster'");
            }
            resourceInputs["amiId"] = args ? args.amiId : undefined;
            resourceInputs["amiType"] = args ? args.amiType : undefined;
            resourceInputs["bootstrapExtraArgs"] = args ? args.bootstrapExtraArgs : undefined;
            resourceInputs["bottlerocketSettings"] = args ? args.bottlerocketSettings : undefined;
            resourceInputs["capacityType"] = args ? args.capacityType : undefined;
            resourceInputs["cluster"] = args ? args.cluster : undefined;
            resourceInputs["clusterName"] = args ? args.clusterName : undefined;
            resourceInputs["diskSize"] = args ? args.diskSize : undefined;
            resourceInputs["enableIMDSv2"] = args ? args.enableIMDSv2 : undefined;
            resourceInputs["forceUpdateVersion"] = args ? args.forceUpdateVersion : undefined;
            resourceInputs["gpu"] = args ? args.gpu : undefined;
            resourceInputs["ignoreScalingChanges"] = args ? args.ignoreScalingChanges : undefined;
            resourceInputs["instanceTypes"] = args ? args.instanceTypes : undefined;
            resourceInputs["kubeletExtraArgs"] = args ? args.kubeletExtraArgs : undefined;
            resourceInputs["labels"] = args ? args.labels : undefined;
            resourceInputs["launchTemplate"] = args ? args.launchTemplate : undefined;
            resourceInputs["nodeGroupName"] = args ? args.nodeGroupName : undefined;
            resourceInputs["nodeGroupNamePrefix"] = args ? args.nodeGroupNamePrefix : undefined;
            resourceInputs["nodeRole"] = args ? args.nodeRole : undefined;
            resourceInputs["nodeRoleArn"] = args ? args.nodeRoleArn : undefined;
            resourceInputs["nodeadmExtraOptions"] = args ? args.nodeadmExtraOptions : undefined;
            resourceInputs["operatingSystem"] = args ? args.operatingSystem : undefined;
            resourceInputs["releaseVersion"] = args ? args.releaseVersion : undefined;
            resourceInputs["remoteAccess"] = args ? args.remoteAccess : undefined;
            resourceInputs["scalingConfig"] = args ? args.scalingConfig : undefined;
            resourceInputs["subnetIds"] = args ? args.subnetIds : undefined;
            resourceInputs["tags"] = args ? args.tags : undefined;
            resourceInputs["taints"] = args ? args.taints : undefined;
            resourceInputs["userData"] = args ? args.userData : undefined;
            resourceInputs["version"] = args ? args.version : undefined;
            resourceInputs["nodeGroup"] = undefined /*out*/;
        } else {
            resourceInputs["nodeGroup"] = undefined /*out*/;
        }
        opts = pulumi.mergeOptions(utilities.resourceOptsDefaults(), opts);
        super(ManagedNodeGroup.__pulumiType, name, resourceInputs, opts, true /*remote*/);
    }
}

/**
 * The set of arguments for constructing a ManagedNodeGroup resource.
 */
export interface ManagedNodeGroupArgs {
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
     * Type of Amazon Machine Image (AMI) associated with the EKS Node Group. Defaults to `AL2_x86_64`.
     * Note: `amiType` and `amiId` are mutually exclusive.
     *
     * See the AWS documentation (https://docs.aws.amazon.com/eks/latest/APIReference/API_Nodegroup.html#AmazonEKS-Type-Nodegroup-amiType) for valid AMI Types. This provider will only perform drift detection if a configuration value is provided.
     */
    amiType?: pulumi.Input<string>;
    /**
     * Additional args to pass directly to `/etc/eks/bootstrap.sh`. For details on available options, see: https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh. Note that the `--apiserver-endpoint`, `--b64-cluster-ca` and `--kubelet-extra-args` flags are included automatically based on other configuration parameters.
     *
     * Note that this field conflicts with `launchTemplate`.
     */
    bootstrapExtraArgs?: string;
    /**
     * The configuration settings for Bottlerocket OS.
     * The settings will get merged with the base settings the provider uses to configure Bottlerocket.
     *
     * This includes:
     *   - settings.kubernetes.api-server
     *   - settings.kubernetes.cluster-certificate
     *   - settings.kubernetes.cluster-name
     *   - settings.kubernetes.cluster-dns-ip
     *
     * For an overview of the available settings, see https://bottlerocket.dev/en/os/1.20.x/api/settings/.
     */
    bottlerocketSettings?: pulumi.Input<{[key: string]: any}>;
    /**
     * Type of capacity associated with the EKS Node Group. Valid values: `ON_DEMAND`, `SPOT`. This provider will only perform drift detection if a configuration value is provided.
     */
    capacityType?: pulumi.Input<string>;
    /**
     * The target EKS cluster.
     */
    cluster: pulumi.Input<Cluster | inputs.CoreDataArgs>;
    /**
     * Name of the EKS Cluster.
     */
    clusterName?: pulumi.Input<string>;
    /**
     * Disk size in GiB for worker nodes. Defaults to `20`. This provider will only perform drift detection if a configuration value is provided.
     */
    diskSize?: pulumi.Input<number>;
    /**
     * Enables the ability to use EC2 Instance Metadata Service v2, which provides a more secure way to access instance metadata. For more information, see: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html.
     * Defaults to `false`.
     *
     * Note that this field conflicts with `launchTemplate`. If you are providing a custom `launchTemplate`, you should enable this feature within the `launchTemplateMetadataOptions` of the supplied `launchTemplate`.
     */
    enableIMDSv2?: boolean;
    /**
     * Force version update if existing pods are unable to be drained due to a pod disruption budget issue.
     */
    forceUpdateVersion?: pulumi.Input<boolean>;
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
     * Whether to ignore changes to the desired size of the Auto Scaling Group. This is useful when using Cluster Autoscaler.
     *
     * See [EKS best practices](https://aws.github.io/aws-eks-best-practices/cluster-autoscaling/) for more details.
     */
    ignoreScalingChanges?: boolean;
    /**
     * Set of instance types associated with the EKS Node Group. Defaults to `["t3.medium"]`. This provider will only perform drift detection if a configuration value is provided. Currently, the EKS API only accepts a single value in the set.
     */
    instanceTypes?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * Extra args to pass to the Kubelet. Corresponds to the options passed in the `--kubeletExtraArgs` flag to `/etc/eks/bootstrap.sh`. For example, '--port=10251 --address=0.0.0.0'. To escape characters in the extra argsvalue, wrap the value in quotes. For example, `kubeletExtraArgs = '--allowed-unsafe-sysctls "net.core.somaxconn"'`.
     * Note that this field conflicts with `launchTemplate`.
     */
    kubeletExtraArgs?: string;
    /**
     * Key-value map of Kubernetes labels. Only labels that are applied with the EKS API are managed by this argument. Other Kubernetes labels applied to the EKS Node Group will not be managed.
     */
    labels?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    /**
     * Launch Template settings.
     *
     * Note: This field is mutually exclusive with `kubeletExtraArgs` and `bootstrapExtraArgs`.
     */
    launchTemplate?: pulumi.Input<pulumiAws.types.input.eks.NodeGroupLaunchTemplate>;
    /**
     * Name of the EKS Node Group. If omitted, this provider will assign a random, unique name. Conflicts with `nodeGroupNamePrefix`.
     */
    nodeGroupName?: pulumi.Input<string>;
    /**
     * Creates a unique name beginning with the specified prefix. Conflicts with `nodeGroupName`.
     */
    nodeGroupNamePrefix?: pulumi.Input<string>;
    /**
     * The IAM Role that provides permissions for the EKS Node Group.
     *
     * Note, `nodeRole` and `nodeRoleArn` are mutually exclusive, and a single option must be used.
     */
    nodeRole?: pulumi.Input<pulumiAws.iam.Role>;
    /**
     * Amazon Resource Name (ARN) of the IAM Role that provides permissions for the EKS Node Group.
     *
     * Note, `nodeRoleArn` and `nodeRole` are mutually exclusive, and a single option must be used.
     */
    nodeRoleArn?: pulumi.Input<string>;
    /**
     * Extra nodeadm configuration sections to be added to the nodeadm user data. This can be shell scripts, nodeadm NodeConfig or any other user data compatible script. When configuring additional nodeadm NodeConfig sections, they'll be merged with the base settings the provider sets. You can overwrite base settings or provide additional settings this way.
     * The base settings the provider sets are:
     *   - cluster.name
     *   - cluster.apiServerEndpoint
     *   - cluster.certificateAuthority
     *   - cluster.cidr
     *
     * Note: This is only applicable when using AL2023.
     * See for more details:
     *   - https://awslabs.github.io/amazon-eks-ami/nodeadm/
     *   - https://awslabs.github.io/amazon-eks-ami/nodeadm/doc/api/
     */
    nodeadmExtraOptions?: pulumi.Input<pulumi.Input<inputs.NodeadmOptionsArgs>[]>;
    /**
     * The type of OS to use for the node group. Will be used to determine the right EKS optimized AMI to use based on the instance types and gpu configuration.
     * Valid values are `RECOMMENDED`, `AL2`, `AL2023` and `Bottlerocket`.
     *
     * Defaults to the current recommended OS.
     */
    operatingSystem?: pulumi.Input<enums.OperatingSystem>;
    /**
     * AMI version of the EKS Node Group. Defaults to latest version for Kubernetes version.
     */
    releaseVersion?: pulumi.Input<string>;
    /**
     * Remote access settings.
     */
    remoteAccess?: pulumi.Input<pulumiAws.types.input.eks.NodeGroupRemoteAccess>;
    /**
     * Scaling settings.
     *
     * Default scaling amounts of the node group autoscaling group are:
     *   - desiredSize: 2
     *   - minSize: 1
     *   - maxSize: 2
     */
    scalingConfig?: pulumi.Input<pulumiAws.types.input.eks.NodeGroupScalingConfig>;
    /**
     * Identifiers of EC2 Subnets to associate with the EKS Node Group. These subnets must have the following resource tag: `kubernetes.io/cluster/CLUSTER_NAME` (where `CLUSTER_NAME` is replaced with the name of the EKS Cluster).
     *
     * Default subnetIds is chosen from the following list, in order, if subnetIds arg is not set:
     *   - core.subnetIds
     *   - core.privateIds
     *   - core.publicSubnetIds
     *
     * This default logic is based on the existing subnet IDs logic of this package: https://git.io/JeM11
     */
    subnetIds?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * Key-value mapping of resource tags.
     */
    tags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    /**
     * The Kubernetes taints to be applied to the nodes in the node group. Maximum of 50 taints per node group.
     */
    taints?: pulumi.Input<pulumi.Input<pulumiAws.types.input.eks.NodeGroupTaint>[]>;
    /**
     * User specified code to run on node startup. This is expected to handle the full AWS EKS node bootstrapping. If omitted, the provider will configure the user data.
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html#launch-template-user-data.
     */
    userData?: pulumi.Input<string>;
    version?: pulumi.Input<string>;
}
