// *** WARNING: this file was generated by pulumi-gen-eks. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Eks.Outputs
{

    /// <summary>
    /// Describes the configuration options accepted by a cluster to create its own node groups.
    /// </summary>
    [OutputType]
    public sealed class ClusterNodeGroupOptions
    {
        /// <summary>
        /// The AMI ID to use for the worker nodes.
        /// 
        /// Defaults to the latest recommended EKS Optimized Linux AMI from the AWS Systems Manager Parameter Store.
        /// 
        /// Note: `amiId` and `gpu` are mutually exclusive.
        /// 
        /// See for more details:
        /// - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
        /// </summary>
        public readonly string? AmiId;
        /// <summary>
        /// The AMI Type to use for the worker nodes. 
        /// 
        /// Only applicable when setting an AMI ID that is of type `arm64`. 
        /// 
        /// Note: `amiType` and `gpu` are mutually exclusive.
        /// </summary>
        public readonly string? AmiType;
        /// <summary>
        /// The tags to apply to the NodeGroup's AutoScalingGroup in the CloudFormation Stack.
        /// 
        /// Per AWS, all stack-level tags, including automatically created tags, and the `cloudFormationTags` option are propagated to resources that AWS CloudFormation supports, including the AutoScalingGroup. See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html
        /// 
        /// Note: Given the inheritance of auto-generated CF tags and `cloudFormationTags`, you should either supply the tag in `autoScalingGroupTags` or `cloudFormationTags`, but not both.
        /// </summary>
        public readonly ImmutableDictionary<string, string>? AutoScalingGroupTags;
        /// <summary>
        /// Additional args to pass directly to `/etc/eks/bootstrap.sh`. For details on available options, see: https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh. Note that the `--apiserver-endpoint`, `--b64-cluster-ca` and `--kubelet-extra-args` flags are included automatically based on other configuration parameters.
        /// </summary>
        public readonly string? BootstrapExtraArgs;
        /// <summary>
        /// The configuration settings for Bottlerocket OS.
        /// The settings will get merged with the base settings the provider uses to configure Bottlerocket.
        /// 
        /// This includes:
        ///   - settings.kubernetes.api-server
        ///   - settings.kubernetes.cluster-certificate
        ///   - settings.kubernetes.cluster-name
        ///   - settings.kubernetes.cluster-dns-ip
        /// 
        /// For an overview of the available settings, see https://bottlerocket.dev/en/os/1.20.x/api/settings/.
        /// </summary>
        public readonly ImmutableDictionary<string, object>? BottlerocketSettings;
        /// <summary>
        /// The tags to apply to the CloudFormation Stack of the Worker NodeGroup.
        /// 
        /// Note: Given the inheritance of auto-generated CF tags and `cloudFormationTags`, you should either supply the tag in `autoScalingGroupTags` or `cloudFormationTags`, but not both.
        /// </summary>
        public readonly ImmutableDictionary<string, string>? CloudFormationTags;
        /// <summary>
        /// The ingress rule that gives node group access.
        /// </summary>
        public readonly Pulumi.Aws.Ec2.SecurityGroupRule? ClusterIngressRule;
        /// <summary>
        /// The number of worker nodes that should be running in the cluster. Defaults to 2.
        /// </summary>
        public readonly int? DesiredCapacity;
        /// <summary>
        /// Enables/disables detailed monitoring of the EC2 instances.
        /// 
        /// With detailed monitoring, all metrics, including status check metrics, are available in 1-minute intervals.
        /// When enabled, you can also get aggregated data across groups of similar instances.
        /// 
        /// Note: You are charged per metric that is sent to CloudWatch. You are not charged for data storage.
        /// For more information, see "Paid tier" and "Example 1 - EC2 Detailed Monitoring" here https://aws.amazon.com/cloudwatch/pricing/.
        /// </summary>
        public readonly bool? EnableDetailedMonitoring;
        /// <summary>
        /// Encrypt the root block device of the nodes in the node group.
        /// </summary>
        public readonly bool? EncryptRootBlockDevice;
        /// <summary>
        /// Extra security groups to attach on all nodes in this worker node group.
        /// 
        /// This additional set of security groups captures any user application rules that will be needed for the nodes.
        /// </summary>
        public readonly ImmutableArray<Pulumi.Aws.Ec2.SecurityGroup> ExtraNodeSecurityGroups;
        /// <summary>
        /// Use the latest recommended EKS Optimized Linux AMI with GPU support for the worker nodes from the AWS Systems Manager Parameter Store.
        /// 
        /// Defaults to false.
        /// 
        /// Note: `gpu` and `amiId` are mutually exclusive.
        /// 
        /// See for more details:
        /// - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
        /// - https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
        /// </summary>
        public readonly bool? Gpu;
        /// <summary>
        /// Whether to ignore changes to the desired size of the Auto Scaling Group. This is useful when using Cluster Autoscaler.
        /// 
        /// See [EKS best practices](https://aws.github.io/aws-eks-best-practices/cluster-autoscaling/) for more details.
        /// </summary>
        public readonly bool? IgnoreScalingChanges;
        /// <summary>
        /// The ingress rule that gives node group access.
        /// </summary>
        public readonly Pulumi.Aws.Iam.InstanceProfile? InstanceProfile;
        /// <summary>
        /// The instance type to use for the cluster's nodes. Defaults to "t2.medium".
        /// </summary>
        public readonly string? InstanceType;
        /// <summary>
        /// Name of the key pair to use for SSH access to worker nodes.
        /// </summary>
        public readonly string? KeyName;
        /// <summary>
        /// Extra args to pass to the Kubelet. Corresponds to the options passed in the `--kubeletExtraArgs` flag to `/etc/eks/bootstrap.sh`. For example, '--port=10251 --address=0.0.0.0'. Note that the `labels` and `taints` properties will be applied to this list (using `--node-labels` and `--register-with-taints` respectively) after to the explicit `kubeletExtraArgs`.
        /// </summary>
        public readonly string? KubeletExtraArgs;
        /// <summary>
        /// Custom k8s node labels to be attached to each worker node. Adds the given key/value pairs to the `--node-labels` kubelet argument.
        /// </summary>
        public readonly ImmutableDictionary<string, string>? Labels;
        /// <summary>
        /// The tag specifications to apply to the launch template.
        /// </summary>
        public readonly ImmutableArray<Pulumi.Aws.Ec2.Outputs.LaunchTemplateTagSpecification> LaunchTemplateTagSpecifications;
        /// <summary>
        /// The maximum number of worker nodes running in the cluster. Defaults to 2.
        /// </summary>
        public readonly int? MaxSize;
        /// <summary>
        /// The minimum amount of instances that should remain available during an instance refresh, expressed as a percentage. Defaults to 50.
        /// </summary>
        public readonly int? MinRefreshPercentage;
        /// <summary>
        /// The minimum number of worker nodes running in the cluster. Defaults to 1.
        /// </summary>
        public readonly int? MinSize;
        /// <summary>
        /// Whether or not to auto-assign public IP addresses on the EKS worker nodes. If this toggle is set to true, the EKS workers will be auto-assigned public IPs. If false, they will not be auto-assigned public IPs.
        /// </summary>
        public readonly bool? NodeAssociatePublicIpAddress;
        /// <summary>
        /// Public key material for SSH access to worker nodes. See allowed formats at:
        /// https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
        /// If not provided, no SSH access is enabled on VMs.
        /// </summary>
        public readonly string? NodePublicKey;
        /// <summary>
        /// Whether the root block device should be deleted on termination of the instance. Defaults to true.
        /// </summary>
        public readonly bool? NodeRootVolumeDeleteOnTermination;
        /// <summary>
        /// Whether to encrypt a cluster node's root volume. Defaults to false.
        /// </summary>
        public readonly bool? NodeRootVolumeEncrypted;
        /// <summary>
        /// The amount of provisioned IOPS. This is only valid with a volumeType of 'io1'.
        /// </summary>
        public readonly int? NodeRootVolumeIops;
        /// <summary>
        /// The size in GiB of a cluster node's root volume. Defaults to 20.
        /// </summary>
        public readonly int? NodeRootVolumeSize;
        /// <summary>
        /// Provisioned throughput performance in integer MiB/s for a cluster node's root volume. This is only valid with a volumeType of 'gp3'.
        /// </summary>
        public readonly int? NodeRootVolumeThroughput;
        /// <summary>
        /// Configured EBS type for a cluster node's root volume. Default is 'gp2'. Supported values are 'standard', 'gp2', 'gp3', 'st1', 'sc1', 'io1'.
        /// </summary>
        public readonly string? NodeRootVolumeType;
        /// <summary>
        /// The security group for the worker node group to communicate with the cluster.
        /// 
        /// This security group requires specific inbound and outbound rules.
        /// 
        /// See for more details:
        /// https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html
        /// 
        /// Note: The `nodeSecurityGroup` option and the cluster option`nodeSecurityGroupTags` are mutually exclusive.
        /// </summary>
        public readonly Pulumi.Aws.Ec2.SecurityGroup? NodeSecurityGroup;
        /// <summary>
        /// The set of subnets to override and use for the worker node group.
        /// 
        /// Setting this option overrides which subnets to use for the worker node group, regardless if the cluster's `subnetIds` is set, or if `publicSubnetIds` and/or `privateSubnetIds` were set.
        /// </summary>
        public readonly ImmutableArray<string> NodeSubnetIds;
        /// <summary>
        /// Extra code to run on node startup. This code will run after the AWS EKS bootstrapping code and before the node signals its readiness to the managing CloudFormation stack. This code must be a typical user data script: critically it must begin with an interpreter directive (i.e. a `#!`).
        /// </summary>
        public readonly string? NodeUserData;
        /// <summary>
        /// User specified code to run on node startup. This code is expected to handle the full AWS EKS bootstrapping code and signal node readiness to the managing CloudFormation stack. This code must be a complete and executable user data script in bash (Linux) or powershell (Windows).
        /// 
        /// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/worker.html
        /// </summary>
        public readonly string? NodeUserDataOverride;
        /// <summary>
        /// Extra nodeadm configuration sections to be added to the nodeadm user data. This can be shell scripts, nodeadm NodeConfig or any other user data compatible script. When configuring additional nodeadm NodeConfig sections, they'll be merged with the base settings the provider sets. You can overwrite base settings or provide additional settings this way.
        /// The base settings the provider sets are:
        ///   - cluster.name
        ///   - cluster.apiServerEndpoint
        ///   - cluster.certificateAuthority
        ///   - cluster.cidr
        /// 
        /// Note: This is only applicable when using AL2023.
        /// See for more details:
        ///   - https://awslabs.github.io/amazon-eks-ami/nodeadm/
        ///   - https://awslabs.github.io/amazon-eks-ami/nodeadm/doc/api/
        /// </summary>
        public readonly ImmutableArray<Outputs.NodeadmOptions> NodeadmExtraOptions;
        /// <summary>
        /// The type of OS to use for the node group. Will be used to determine the right EKS optimized AMI to use based on the instance types and gpu configuration.
        /// Valid values are `RECOMMENDED`, `AL2`, `AL2023` and `Bottlerocket`.
        /// 
        /// Defaults to the current recommended OS.
        /// </summary>
        public readonly Pulumi.Eks.OperatingSystem? OperatingSystem;
        /// <summary>
        /// Bidding price for spot instance. If set, only spot instances will be added as worker node.
        /// </summary>
        public readonly string? SpotPrice;
        /// <summary>
        /// Custom k8s node taints to be attached to each worker node. Adds the given taints to the `--register-with-taints` kubelet argument
        /// </summary>
        public readonly ImmutableDictionary<string, Outputs.Taint>? Taints;
        /// <summary>
        /// Desired Kubernetes master / control plane version. If you do not specify a value, the latest available version is used.
        /// </summary>
        public readonly string? Version;

        [OutputConstructor]
        private ClusterNodeGroupOptions(
            string? amiId,

            string? amiType,

            ImmutableDictionary<string, string>? autoScalingGroupTags,

            string? bootstrapExtraArgs,

            ImmutableDictionary<string, object>? bottlerocketSettings,

            ImmutableDictionary<string, string>? cloudFormationTags,

            Pulumi.Aws.Ec2.SecurityGroupRule? clusterIngressRule,

            int? desiredCapacity,

            bool? enableDetailedMonitoring,

            bool? encryptRootBlockDevice,

            ImmutableArray<Pulumi.Aws.Ec2.SecurityGroup> extraNodeSecurityGroups,

            bool? gpu,

            bool? ignoreScalingChanges,

            Pulumi.Aws.Iam.InstanceProfile? instanceProfile,

            string? instanceType,

            string? keyName,

            string? kubeletExtraArgs,

            ImmutableDictionary<string, string>? labels,

            ImmutableArray<Pulumi.Aws.Ec2.Outputs.LaunchTemplateTagSpecification> launchTemplateTagSpecifications,

            int? maxSize,

            int? minRefreshPercentage,

            int? minSize,

            bool? nodeAssociatePublicIpAddress,

            string? nodePublicKey,

            bool? nodeRootVolumeDeleteOnTermination,

            bool? nodeRootVolumeEncrypted,

            int? nodeRootVolumeIops,

            int? nodeRootVolumeSize,

            int? nodeRootVolumeThroughput,

            string? nodeRootVolumeType,

            Pulumi.Aws.Ec2.SecurityGroup? nodeSecurityGroup,

            ImmutableArray<string> nodeSubnetIds,

            string? nodeUserData,

            string? nodeUserDataOverride,

            ImmutableArray<Outputs.NodeadmOptions> nodeadmExtraOptions,

            Pulumi.Eks.OperatingSystem? operatingSystem,

            string? spotPrice,

            ImmutableDictionary<string, Outputs.Taint>? taints,

            string? version)
        {
            AmiId = amiId;
            AmiType = amiType;
            AutoScalingGroupTags = autoScalingGroupTags;
            BootstrapExtraArgs = bootstrapExtraArgs;
            BottlerocketSettings = bottlerocketSettings;
            CloudFormationTags = cloudFormationTags;
            ClusterIngressRule = clusterIngressRule;
            DesiredCapacity = desiredCapacity;
            EnableDetailedMonitoring = enableDetailedMonitoring;
            EncryptRootBlockDevice = encryptRootBlockDevice;
            ExtraNodeSecurityGroups = extraNodeSecurityGroups;
            Gpu = gpu;
            IgnoreScalingChanges = ignoreScalingChanges;
            InstanceProfile = instanceProfile;
            InstanceType = instanceType;
            KeyName = keyName;
            KubeletExtraArgs = kubeletExtraArgs;
            Labels = labels;
            LaunchTemplateTagSpecifications = launchTemplateTagSpecifications;
            MaxSize = maxSize;
            MinRefreshPercentage = minRefreshPercentage;
            MinSize = minSize;
            NodeAssociatePublicIpAddress = nodeAssociatePublicIpAddress;
            NodePublicKey = nodePublicKey;
            NodeRootVolumeDeleteOnTermination = nodeRootVolumeDeleteOnTermination;
            NodeRootVolumeEncrypted = nodeRootVolumeEncrypted;
            NodeRootVolumeIops = nodeRootVolumeIops;
            NodeRootVolumeSize = nodeRootVolumeSize;
            NodeRootVolumeThroughput = nodeRootVolumeThroughput;
            NodeRootVolumeType = nodeRootVolumeType;
            NodeSecurityGroup = nodeSecurityGroup;
            NodeSubnetIds = nodeSubnetIds;
            NodeUserData = nodeUserData;
            NodeUserDataOverride = nodeUserDataOverride;
            NodeadmExtraOptions = nodeadmExtraOptions;
            OperatingSystem = operatingSystem;
            SpotPrice = spotPrice;
            Taints = taints;
            Version = version;
        }
    }
}
