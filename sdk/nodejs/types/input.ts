// *** WARNING: this file was generated by pulumi-gen-eks. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import * as inputs from "../types/input";
import * as outputs from "../types/output";
import * as enums from "../types/enums";

import * as pulumiAws from "@pulumi/aws";
import * as pulumiKubernetes from "@pulumi/kubernetes";
import * as utilities from "../utilities";

import {VpcCniAddon} from "..";

/**
 * Access entries allow an IAM principal to access your cluster.
 *
 * You have the following options for authorizing an IAM principal to access Kubernetes objects on your cluster: Kubernetes role-based access control (RBAC), Amazon EKS, or both.
 * Kubernetes RBAC authorization requires you to create and manage Kubernetes Role , ClusterRole , RoleBinding , and ClusterRoleBinding objects, in addition to managing access entries. If you use Amazon EKS authorization exclusively, you don't need to create and manage Kubernetes Role , ClusterRole , RoleBinding , and ClusterRoleBinding objects.
 */
export interface AccessEntryArgs {
    /**
     * The access policies to associate to the access entry.
     */
    accessPolicies?: {[key: string]: pulumi.Input<inputs.AccessPolicyAssociationArgs>};
    /**
     * A list of groups within Kubernetes to which the IAM principal is mapped to.
     */
    kubernetesGroups?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * The IAM Principal ARN which requires Authentication access to the EKS cluster.
     */
    principalArn: pulumi.Input<string>;
    /**
     * The tags to apply to the AccessEntry.
     */
    tags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    /**
     * The type of the new access entry. Valid values are STANDARD, FARGATE_LINUX, EC2_LINUX, and EC2_WINDOWS.
     * Defaults to STANDARD which provides the standard workflow. EC2_LINUX, EC2_WINDOWS, FARGATE_LINUX types disallow users to input a username or kubernetesGroup, and prevent associating access policies.
     */
    type?: pulumi.Input<enums.AccessEntryType>;
    /**
     * Defaults to the principalArn if the principal is a user, else defaults to assume-role/session-name.
     */
    username?: pulumi.Input<string>;
}

/**
 * Associates an access policy and its scope to an IAM principal.
 *
 * See for more details:
 * https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
 */
export interface AccessPolicyAssociationArgs {
    /**
     * The scope of the access policy association. This controls whether the access policy is scoped to the cluster or to a particular namespace.
     */
    accessScope: pulumi.Input<pulumiAws.types.input.eks.AccessPolicyAssociationAccessScope>;
    /**
     * The ARN of the access policy to associate with the principal
     */
    policyArn: pulumi.Input<string>;
}

/**
 * Describes the configuration options accepted by a cluster to create its own node groups.
 */
export interface ClusterNodeGroupOptionsArgs {
    /**
     * The AMI ID to use for the worker nodes.
     *
     * Defaults to the latest recommended EKS Optimized Linux AMI from the AWS Systems Manager Parameter Store.
     *
     * Note: `amiId` and `gpu` are mutually exclusive.
     *
     * See for more details:
     * - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
     */
    amiId?: pulumi.Input<string>;
    /**
     * The AMI Type to use for the worker nodes. 
     *
     * Only applicable when setting an AMI ID that is of type `arm64`. 
     *
     * Note: `amiType` and `gpu` are mutually exclusive.
     */
    amiType?: pulumi.Input<string>;
    /**
     * The tags to apply to the NodeGroup's AutoScalingGroup in the CloudFormation Stack.
     *
     * Per AWS, all stack-level tags, including automatically created tags, and the `cloudFormationTags` option are propagated to resources that AWS CloudFormation supports, including the AutoScalingGroup. See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html
     *
     * Note: Given the inheritance of auto-generated CF tags and `cloudFormationTags`, you should either supply the tag in `autoScalingGroupTags` or `cloudFormationTags`, but not both.
     */
    autoScalingGroupTags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    /**
     * Additional args to pass directly to `/etc/eks/bootstrap.sh`. For details on available options, see: https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh. Note that the `--apiserver-endpoint`, `--b64-cluster-ca` and `--kubelet-extra-args` flags are included automatically based on other configuration parameters.
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
     * The tags to apply to the CloudFormation Stack of the Worker NodeGroup.
     *
     * Note: Given the inheritance of auto-generated CF tags and `cloudFormationTags`, you should either supply the tag in `autoScalingGroupTags` or `cloudFormationTags`, but not both.
     */
    cloudFormationTags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    /**
     * The ingress rule that gives node group access.
     */
    clusterIngressRule?: pulumi.Input<pulumiAws.ec2.SecurityGroupRule>;
    /**
     * The number of worker nodes that should be running in the cluster. Defaults to 2.
     */
    desiredCapacity?: pulumi.Input<number>;
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
     * Encrypt the root block device of the nodes in the node group.
     */
    encryptRootBlockDevice?: pulumi.Input<boolean>;
    /**
     * Extra security groups to attach on all nodes in this worker node group.
     *
     * This additional set of security groups captures any user application rules that will be needed for the nodes.
     */
    extraNodeSecurityGroups?: pulumi.Input<pulumi.Input<pulumiAws.ec2.SecurityGroup>[]>;
    /**
     * Use the latest recommended EKS Optimized Linux AMI with GPU support for the worker nodes from the AWS Systems Manager Parameter Store.
     *
     * Defaults to false.
     *
     * Note: `gpu` and `amiId` are mutually exclusive.
     *
     * See for more details:
     * - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
     * - https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
     */
    gpu?: pulumi.Input<boolean>;
    /**
     * Whether to ignore changes to the desired size of the Auto Scaling Group. This is useful when using Cluster Autoscaler.
     *
     * See [EKS best practices](https://aws.github.io/aws-eks-best-practices/cluster-autoscaling/) for more details.
     */
    ignoreScalingChanges?: boolean;
    /**
     * The ingress rule that gives node group access.
     */
    instanceProfile?: pulumiAws.iam.InstanceProfile;
    /**
     * The instance type to use for the cluster's nodes. Defaults to "t2.medium".
     */
    instanceType?: pulumi.Input<string>;
    /**
     * Name of the key pair to use for SSH access to worker nodes.
     */
    keyName?: pulumi.Input<string>;
    /**
     * Extra args to pass to the Kubelet. Corresponds to the options passed in the `--kubeletExtraArgs` flag to `/etc/eks/bootstrap.sh`. For example, '--port=10251 --address=0.0.0.0'. Note that the `labels` and `taints` properties will be applied to this list (using `--node-labels` and `--register-with-taints` respectively) after to the explicit `kubeletExtraArgs`.
     */
    kubeletExtraArgs?: string;
    /**
     * Custom k8s node labels to be attached to each worker node. Adds the given key/value pairs to the `--node-labels` kubelet argument.
     */
    labels?: {[key: string]: string};
    /**
     * The tag specifications to apply to the launch template.
     */
    launchTemplateTagSpecifications?: pulumi.Input<pulumi.Input<pulumiAws.types.input.ec2.LaunchTemplateTagSpecification>[]>;
    /**
     * The maximum number of worker nodes running in the cluster. Defaults to 2.
     */
    maxSize?: pulumi.Input<number>;
    /**
     * The minimum amount of instances that should remain available during an instance refresh, expressed as a percentage. Defaults to 50.
     */
    minRefreshPercentage?: pulumi.Input<number>;
    /**
     * The minimum number of worker nodes running in the cluster. Defaults to 1.
     */
    minSize?: pulumi.Input<number>;
    /**
     * Whether or not to auto-assign public IP addresses on the EKS worker nodes. If this toggle is set to true, the EKS workers will be auto-assigned public IPs. If false, they will not be auto-assigned public IPs.
     */
    nodeAssociatePublicIpAddress?: boolean;
    /**
     * Public key material for SSH access to worker nodes. See allowed formats at:
     * https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
     * If not provided, no SSH access is enabled on VMs.
     */
    nodePublicKey?: pulumi.Input<string>;
    /**
     * Whether the root block device should be deleted on termination of the instance. Defaults to true.
     */
    nodeRootVolumeDeleteOnTermination?: pulumi.Input<boolean>;
    /**
     * Whether to encrypt a cluster node's root volume. Defaults to false.
     */
    nodeRootVolumeEncrypted?: pulumi.Input<boolean>;
    /**
     * The amount of provisioned IOPS. This is only valid with a volumeType of 'io1'.
     */
    nodeRootVolumeIops?: pulumi.Input<number>;
    /**
     * The size in GiB of a cluster node's root volume. Defaults to 20.
     */
    nodeRootVolumeSize?: pulumi.Input<number>;
    /**
     * Provisioned throughput performance in integer MiB/s for a cluster node's root volume. This is only valid with a volumeType of 'gp3'.
     */
    nodeRootVolumeThroughput?: pulumi.Input<number>;
    /**
     * Configured EBS type for a cluster node's root volume. Default is 'gp2'. Supported values are 'standard', 'gp2', 'gp3', 'st1', 'sc1', 'io1'.
     */
    nodeRootVolumeType?: pulumi.Input<string>;
    /**
     * The security group for the worker node group to communicate with the cluster.
     *
     * This security group requires specific inbound and outbound rules.
     *
     * See for more details:
     * https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html
     *
     * Note: The `nodeSecurityGroup` option and the cluster option`nodeSecurityGroupTags` are mutually exclusive.
     */
    nodeSecurityGroup?: pulumi.Input<pulumiAws.ec2.SecurityGroup>;
    /**
     * The set of subnets to override and use for the worker node group.
     *
     * Setting this option overrides which subnets to use for the worker node group, regardless if the cluster's `subnetIds` is set, or if `publicSubnetIds` and/or `privateSubnetIds` were set.
     */
    nodeSubnetIds?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * Extra code to run on node startup. This code will run after the AWS EKS bootstrapping code and before the node signals its readiness to the managing CloudFormation stack. This code must be a typical user data script: critically it must begin with an interpreter directive (i.e. a `#!`).
     */
    nodeUserData?: pulumi.Input<string>;
    /**
     * User specified code to run on node startup. This code is expected to handle the full AWS EKS bootstrapping code and signal node readiness to the managing CloudFormation stack. This code must be a complete and executable user data script in bash (Linux) or powershell (Windows).
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/worker.html
     */
    nodeUserDataOverride?: pulumi.Input<string>;
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
     * Valid values are `AL2`, `AL2023` and `Bottlerocket`.
     *
     * Defaults to `AL2023`.
     */
    operatingSystem?: pulumi.Input<enums.OperatingSystem>;
    /**
     * Bidding price for spot instance. If set, only spot instances will be added as worker node.
     */
    spotPrice?: pulumi.Input<string>;
    /**
     * Custom k8s node taints to be attached to each worker node. Adds the given taints to the `--register-with-taints` kubelet argument
     */
    taints?: {[key: string]: inputs.TaintArgs};
    /**
     * Desired Kubernetes master / control plane version. If you do not specify a value, the latest available version is used.
     */
    version?: pulumi.Input<string>;
}

/**
 * Defines the core set of data associated with an EKS cluster, including the network in which it runs.
 */
export interface CoreDataArgs {
    /**
     * The access entries added to the cluster.
     */
    accessEntries?: pulumi.Input<pulumi.Input<inputs.AccessEntryArgs>[]>;
    awsProvider?: pulumi.Input<pulumiAws.Provider>;
    cluster: pulumi.Input<pulumiAws.eks.Cluster>;
    /**
     * The IAM Role attached to the EKS Cluster
     */
    clusterIamRole: pulumi.Input<pulumiAws.iam.Role>;
    clusterSecurityGroup: pulumi.Input<pulumiAws.ec2.SecurityGroup>;
    eksNodeAccess?: pulumi.Input<pulumiKubernetes.core.v1.ConfigMap>;
    encryptionConfig?: pulumi.Input<pulumiAws.types.input.eks.ClusterEncryptionConfig>;
    /**
     * The EKS cluster's Kubernetes API server endpoint.
     */
    endpoint: pulumi.Input<string>;
    /**
     * The Fargate profile used to manage which pods run on Fargate.
     */
    fargateProfile?: pulumi.Input<pulumiAws.eks.FargateProfile>;
    /**
     * The IAM instance roles for the cluster's nodes.
     */
    instanceRoles: pulumi.Input<pulumi.Input<pulumiAws.iam.Role>[]>;
    /**
     * The kubeconfig file for the cluster.
     */
    kubeconfig?: any;
    /**
     * The cluster's node group options.
     */
    nodeGroupOptions: pulumi.Input<inputs.ClusterNodeGroupOptionsArgs>;
    /**
     * Tags attached to the security groups associated with the cluster's worker nodes.
     */
    nodeSecurityGroupTags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    oidcProvider?: pulumi.Input<pulumiAws.iam.OpenIdConnectProvider>;
    /**
     * List of subnet IDs for the private subnets.
     */
    privateSubnetIds?: pulumi.Input<pulumi.Input<string>[]>;
    provider: pulumi.Input<pulumiKubernetes.Provider>;
    /**
     * List of subnet IDs for the public subnets.
     */
    publicSubnetIds?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * The storage class used for persistent storage by the cluster.
     */
    storageClasses?: pulumi.Input<{[key: string]: pulumi.Input<pulumiKubernetes.storage.v1.StorageClass>}>;
    /**
     * List of subnet IDs for the EKS cluster.
     */
    subnetIds: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * A map of tags assigned to the EKS cluster.
     */
    tags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    /**
     * The VPC CNI for the cluster.
     */
    vpcCni?: pulumi.Input<VpcCniAddon>;
    /**
     * ID of the cluster's VPC.
     */
    vpcId: pulumi.Input<string>;
}

export interface CoreDnsAddonOptionsArgs {
    /**
     * Custom configuration values for the coredns addon. This object must match the schema derived from [describe-addon-configuration](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-configuration.html).
     */
    configurationValues?: pulumi.Input<{[key: string]: any}>;
    /**
     * Whether or not to create the `coredns` Addon in the cluster
     *
     * The managed addon can only be enabled if the cluster is a Fargate cluster or if the cluster
     * uses the default node group, otherwise the self-managed addon is used.
     */
    enabled?: boolean;
    /**
     * How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on. Valid values are `NONE` and `OVERWRITE`. For more details see the [CreateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html) API Docs.
     */
    resolveConflictsOnCreate?: enums.ResolveConflictsOnCreate;
    /**
     * How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from the Amazon EKS default value. Valid values are `NONE`, `OVERWRITE`, and `PRESERVE`. For more details see the [UpdateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateAddon.html) API Docs.
     */
    resolveConflictsOnUpdate?: enums.ResolveConflictsOnUpdate;
    /**
     * The version of the EKS add-on. The version must match one of the versions returned by [describe-addon-versions](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-versions.html).
     */
    version?: pulumi.Input<string>;
}
/**
 * coreDnsAddonOptionsArgsProvideDefaults sets the appropriate defaults for CoreDnsAddonOptionsArgs
 */
export function coreDnsAddonOptionsArgsProvideDefaults(val: CoreDnsAddonOptionsArgs): CoreDnsAddonOptionsArgs {
    return {
        ...val,
        enabled: (val.enabled) ?? true,
        resolveConflictsOnCreate: (val.resolveConflictsOnCreate) ?? "OVERWRITE",
        resolveConflictsOnUpdate: (val.resolveConflictsOnUpdate) ?? "OVERWRITE",
    };
}

/**
 * Contains the AWS Role and Provider necessary to override the `[system:master]` entity ARN. This is an optional argument used when creating `Cluster`. Read more: https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html
 *
 * Note: This option is only supported with Pulumi nodejs programs. Please use `ProviderCredentialOpts` as an alternative instead.
 */
export interface CreationRoleProviderArgs {
    provider: pulumiAws.Provider;
    role: pulumiAws.iam.Role;
}

/**
 * Defines how Kubernetes pods are executed in Fargate. See aws.eks.FargateProfileArgs for reference.
 */
export interface FargateProfileArgs {
    /**
     * Specify a custom role to use for executing pods in Fargate. Defaults to creating a new role with the `arn:aws:iam::aws:policy/AmazonEKSFargatePodExecutionRolePolicy` policy attached.
     */
    podExecutionRoleArn?: pulumi.Input<string>;
    /**
     * Specify the namespace and label selectors to use for launching pods into Fargate.
     */
    selectors?: pulumi.Input<pulumi.Input<pulumiAws.types.input.eks.FargateProfileSelector>[]>;
    /**
     * Specify the subnets in which to execute Fargate tasks for pods. Defaults to the private subnets associated with the cluster.
     */
    subnetIds?: pulumi.Input<pulumi.Input<string>[]>;
}

export interface KubeProxyAddonOptionsArgs {
    /**
     * Custom configuration values for the kube-proxy addon. This object must match the schema derived from [describe-addon-configuration](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-configuration.html).
     */
    configurationValues?: pulumi.Input<{[key: string]: any}>;
    /**
     * Whether or not to create the `kube-proxy` Addon in the cluster
     */
    enabled?: boolean;
    /**
     * How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on. Valid values are `NONE` and `OVERWRITE`. For more details see the [CreateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html) API Docs.
     */
    resolveConflictsOnCreate?: enums.ResolveConflictsOnCreate;
    /**
     * How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from the Amazon EKS default value. Valid values are `NONE`, `OVERWRITE`, and `PRESERVE`. For more details see the [UpdateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateAddon.html) API Docs.
     */
    resolveConflictsOnUpdate?: enums.ResolveConflictsOnUpdate;
    /**
     * The version of the EKS add-on. The version must match one of the versions returned by [describe-addon-versions](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-versions.html).
     */
    version?: pulumi.Input<string>;
}
/**
 * kubeProxyAddonOptionsArgsProvideDefaults sets the appropriate defaults for KubeProxyAddonOptionsArgs
 */
export function kubeProxyAddonOptionsArgsProvideDefaults(val: KubeProxyAddonOptionsArgs): KubeProxyAddonOptionsArgs {
    return {
        ...val,
        enabled: (val.enabled) ?? true,
        resolveConflictsOnCreate: (val.resolveConflictsOnCreate) ?? "OVERWRITE",
        resolveConflictsOnUpdate: (val.resolveConflictsOnUpdate) ?? "OVERWRITE",
    };
}

/**
 * Represents the AWS credentials to scope a given kubeconfig when using a non-default credential chain.
 *
 * The options can be used independently, or additively.
 *
 * A scoped kubeconfig is necessary for certain auth scenarios. For example:
 *   1. Assume a role on the default account caller,
 *   2. Use an AWS creds profile instead of the default account caller,
 *   3. Use an AWS creds creds profile instead of the default account caller,
 *      and then assume a given role on the profile. This scenario is also
 *      possible by only using a profile, iff the profile includes a role to
 *      assume in its settings.
 *
 * See for more details:
 * - https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
 * - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html
 * - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html
 */
export interface KubeconfigOptionsArgs {
    /**
     * AWS credential profile name to always use instead of the default AWS credential provider chain.
     *
     * The profile is passed to kubeconfig as an authentication environment setting.
     */
    profileName?: pulumi.Input<string>;
    /**
     * Role ARN to assume instead of the default AWS credential provider chain.
     *
     * The role is passed to kubeconfig as an authentication exec argument.
     */
    roleArn?: pulumi.Input<string>;
}

/**
 * MIME document parts for nodeadm configuration. This can be shell scripts, nodeadm configuration or any other user data compatible script.
 *
 * See for more details: https://awslabs.github.io/amazon-eks-ami/nodeadm/.
 */
export interface NodeadmOptionsArgs {
    /**
     * The ARN of the access policy to associate with the principal
     */
    content: pulumi.Input<string>;
    /**
     * The MIME type of the content. Examples are `text/x-shellscript; charset="us-ascii"` for shell scripts, and `application/node.eks.aws` nodeadm configuration.
     */
    contentType: pulumi.Input<string>;
}

/**
 * Describes a mapping from an AWS IAM role to a Kubernetes user and groups.
 */
export interface RoleMappingArgs {
    /**
     * A list of groups within Kubernetes to which the role is mapped.
     */
    groups: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * The ARN of the IAM role to add.
     */
    roleArn: pulumi.Input<string>;
    /**
     * The user name within Kubernetes to map to the IAM role. By default, the user name is the ARN of the IAM role.
     */
    username: pulumi.Input<string>;
}

/**
 * StorageClass describes the inputs to a single Kubernetes StorageClass provisioned by AWS. Any number of storage classes can be added to a cluster at creation time. One of these storage classes may be configured the default storage class for the cluster.
 */
export interface StorageClassArgs {
    /**
     * AllowVolumeExpansion shows whether the storage class allow volume expand.
     */
    allowVolumeExpansion?: pulumi.Input<boolean>;
    /**
     * True if this storage class should be a default storage class for the cluster.
     *
     * Note: As of Kubernetes v1.11+ on EKS, a default `gp2` storage class will always be created automatically for the cluster by the EKS service. See https://docs.aws.amazon.com/eks/latest/userguide/storage-classes.html
     *
     * Please note that at most one storage class can be marked as default. If two or more of them are marked as default, a PersistentVolumeClaim without `storageClassName` explicitly specified cannot be created. See: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/#changing-the-default-storageclass
     */
    default?: pulumi.Input<boolean>;
    /**
     * Denotes whether the EBS volume should be encrypted.
     */
    encrypted?: pulumi.Input<boolean>;
    /**
     * I/O operations per second per GiB for "io1" volumes. The AWS volume plugin multiplies this with the size of a requested volume to compute IOPS of the volume and caps the result at 20,000 IOPS.
     */
    iopsPerGb?: pulumi.Input<number>;
    /**
     * The full Amazon Resource Name of the key to use when encrypting the volume. If none is supplied but encrypted is true, a key is generated by AWS.
     */
    kmsKeyId?: pulumi.Input<string>;
    /**
     * Standard object's metadata. More info: https://git.k8s.io/community/contributors/devel/api-conventions.md#metadata
     */
    metadata?: pulumi.Input<pulumiKubernetes.types.input.meta.v1.ObjectMeta>;
    /**
     * Dynamically provisioned PersistentVolumes of this storage class are created with these mountOptions, e.g. ["ro", "soft"]. Not validated - mount of the PVs will simply fail if one is invalid.
     */
    mountOptions?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * Dynamically provisioned PersistentVolumes of this storage class are created with this reclaimPolicy. Defaults to Delete.
     */
    reclaimPolicy?: pulumi.Input<string>;
    /**
     * The EBS volume type.
     */
    type: pulumi.Input<string>;
    /**
     * VolumeBindingMode indicates how PersistentVolumeClaims should be provisioned and bound. When unset, VolumeBindingImmediate is used. This field is alpha-level and is only honored by servers that enable the VolumeScheduling feature.
     */
    volumeBindingMode?: pulumi.Input<string>;
    /**
     * The AWS zone or zones for the EBS volume. If zones is not specified, volumes are generally round-robin-ed across all active zones where Kubernetes cluster has a node. zone and zones parameters must not be used at the same time.
     */
    zones?: pulumi.Input<pulumi.Input<string>[]>;
}

/**
 * Represents a Kubernetes `taint` to apply to all Nodes in a NodeGroup. See https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/.
 */
export interface TaintArgs {
    /**
     * The effect of the taint.
     */
    effect: string;
    /**
     * The value of the taint.
     */
    value: string;
}

/**
 * Describes a mapping from an AWS IAM user to a Kubernetes user and groups.
 */
export interface UserMappingArgs {
    /**
     * A list of groups within Kubernetes to which the user is mapped to.
     */
    groups: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * The ARN of the IAM user to add.
     */
    userArn: pulumi.Input<string>;
    /**
     * The user name within Kubernetes to map to the IAM user. By default, the user name is the ARN of the IAM user.
     */
    username: pulumi.Input<string>;
}

/**
 * Describes the configuration options available for the Amazon VPC CNI plugin for Kubernetes.
 */
export interface VpcCniOptionsArgs {
    /**
     * The version of the addon to use. If not specified, the latest version of the addon for the cluster's Kubernetes version will be used.
     */
    addonVersion?: pulumi.Input<string>;
    /**
     * Specifies whether ipamd should configure rp filter for primary interface. Default is `false`.
     */
    cniConfigureRpfilter?: pulumi.Input<boolean>;
    /**
     * Specifies that your pods may use subnets and security groups that are independent of your worker node's VPC configuration. By default, pods share the same subnet and security groups as the worker node's primary interface. Setting this variable to true causes ipamd to use the security groups and VPC subnet in a worker node's ENIConfig for elastic network interface allocation. You must create an ENIConfig custom resource for each subnet that your pods will reside in, and then annotate or label each worker node to use a specific ENIConfig (multiple worker nodes can be annotated or labelled with the same ENIConfig). Worker nodes can only be annotated with a single ENIConfig at a time, and the subnet in the ENIConfig must belong to the same Availability Zone that the worker node resides in. For more information, see CNI Custom Networking in the Amazon EKS User Guide. Default is `false`
     */
    cniCustomNetworkCfg?: pulumi.Input<boolean>;
    /**
     * Specifies whether an external NAT gateway should be used to provide SNAT of secondary ENI IP addresses. If set to true, the SNAT iptables rule and off-VPC IP rule are not applied, and these rules are removed if they have already been applied. Disable SNAT if you need to allow inbound communication to your pods from external VPNs, direct connections, and external VPCs, and your pods do not need to access the Internet directly via an Internet Gateway. However, your nodes must be running in a private subnet and connected to the internet through an AWS NAT Gateway or another external NAT device. Default is `false`
     */
    cniExternalSnat?: pulumi.Input<boolean>;
    /**
     * Custom configuration values for the vpc-cni addon. This object must match the schema derived from [describe-addon-configuration](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-configuration.html).
     */
    configurationValues?: pulumi.Input<{[key: string]: any}>;
    /**
     * Specifies that your pods may use subnets and security groups (within the same VPC as your control plane resources) that are independent of your cluster's `resourcesVpcConfig`.
     *
     * Defaults to false.
     */
    customNetworkConfig?: pulumi.Input<boolean>;
    /**
     * Allows the kubelet's liveness and readiness probes to connect via TCP when pod ENI is enabled. This will slightly increase local TCP connection latency.
     */
    disableTcpEarlyDemux?: pulumi.Input<boolean>;
    /**
     * Enables using Kubernetes network policies. In Kubernetes, by default, all pod-to-pod communication is allowed. Communication can be restricted with Kubernetes NetworkPolicy objects.
     *
     * See for more information: [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/).
     */
    enableNetworkPolicy?: pulumi.Input<boolean>;
    /**
     * Specifies whether to allow IPAMD to add the `vpc.amazonaws.com/has-trunk-attached` label to the node if the instance has capacity to attach an additional ENI. Default is `false`. If using liveness and readiness probes, you will also need to disable TCP early demux.
     */
    enablePodEni?: pulumi.Input<boolean>;
    /**
     * IPAMD will start allocating (/28) prefixes to the ENIs with ENABLE_PREFIX_DELEGATION set to true.
     */
    enablePrefixDelegation?: pulumi.Input<boolean>;
    /**
     * Specifies the ENI_CONFIG_LABEL_DEF environment variable value for worker nodes. This is used to tell Kubernetes to automatically apply the ENIConfig for each Availability Zone
     * Ref: https://docs.aws.amazon.com/eks/latest/userguide/cni-custom-network.html (step 5(c))
     *
     * Defaults to the official AWS CNI image in ECR.
     */
    eniConfigLabelDef?: pulumi.Input<string>;
    /**
     * Used to configure the MTU size for attached ENIs. The valid range is from 576 to 9001.
     *
     * Defaults to 9001.
     */
    eniMtu?: pulumi.Input<number>;
    /**
     * Specifies whether an external NAT gateway should be used to provide SNAT of secondary ENI IP addresses. If set to true, the SNAT iptables rule and off-VPC IP rule are not applied, and these rules are removed if they have already been applied.
     *
     * Defaults to false.
     */
    externalSnat?: pulumi.Input<boolean>;
    /**
     * Specifies the file path used for logs.
     *
     * Defaults to "stdout" to emit Pod logs for `kubectl logs`.
     */
    logFile?: pulumi.Input<string>;
    /**
     * Specifies the log level used for logs.
     *
     * Defaults to "DEBUG"
     * Valid values: "DEBUG", "INFO", "WARN", "ERROR", or "FATAL".
     */
    logLevel?: pulumi.Input<string>;
    /**
     * Specifies whether NodePort services are enabled on a worker node's primary network interface. This requires additional iptables rules and that the kernel's reverse path filter on the primary interface is set to loose.
     *
     * Defaults to true.
     */
    nodePortSupport?: pulumi.Input<boolean>;
    /**
     * How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on. Valid values are `NONE` and `OVERWRITE`. For more details see the [CreateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html) API Docs.
     */
    resolveConflictsOnCreate?: enums.ResolveConflictsOnCreate;
    /**
     * How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from the Amazon EKS default value.  Valid values are `NONE`, `OVERWRITE`, and `PRESERVE`. For more details see the [UpdateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateAddon.html) API Docs.
     */
    resolveConflictsOnUpdate?: enums.ResolveConflictsOnUpdate;
    /**
     * Pass privilege to containers securityContext. This is required when SELinux is enabled. This value will not be passed to the CNI config by default
     */
    securityContextPrivileged?: pulumi.Input<boolean>;
    /**
     * The Amazon Resource Name (ARN) of an existing IAM role to bind to the add-on's service account. The role must be assigned the IAM permissions required by the add-on. If you don't specify an existing IAM role, then the add-on uses the permissions assigned to the node IAM role.
     *
     * For more information, see [Amazon EKS node IAM role](https://docs.aws.amazon.com/eks/latest/userguide/create-node-role.html) in the Amazon EKS User Guide.
     *
     * Note: To specify an existing IAM role, you must have an IAM OpenID Connect (OIDC) provider created for your cluster. For more information, see [Enabling IAM roles for service accounts on your cluster](https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html) in the Amazon EKS User Guide.
     */
    serviceAccountRoleArn?: pulumi.Input<string>;
    /**
     * Specifies the veth prefix used to generate the host-side veth device name for the CNI.
     *
     * The prefix can be at most 4 characters long.
     *
     * Defaults to "eni".
     */
    vethPrefix?: pulumi.Input<string>;
    /**
     * Specifies the number of free elastic network interfaces (and all of their available IP addresses) that the ipamD daemon should attempt to keep available for pod assignment on the node.
     *
     * Defaults to 1.
     */
    warmEniTarget?: pulumi.Input<number>;
    /**
     * Specifies the number of free IP addresses that the ipamD daemon should attempt to keep available for pod assignment on the node.
     */
    warmIpTarget?: pulumi.Input<number>;
    /**
     * WARM_PREFIX_TARGET will allocate one full (/28) prefix even if a single IP  is consumed with the existing prefix. Ref: https://github.com/aws/amazon-vpc-cni-k8s/blob/master/docs/prefix-and-ip-target.md
     */
    warmPrefixTarget?: pulumi.Input<number>;
}
/**
 * vpcCniOptionsArgsProvideDefaults sets the appropriate defaults for VpcCniOptionsArgs
 */
export function vpcCniOptionsArgsProvideDefaults(val: VpcCniOptionsArgs): VpcCniOptionsArgs {
    return {
        ...val,
        resolveConflictsOnCreate: (val.resolveConflictsOnCreate) ?? "OVERWRITE",
        resolveConflictsOnUpdate: (val.resolveConflictsOnUpdate) ?? "OVERWRITE",
    };
}
