// *** WARNING: this file was generated by pulumi-gen-eks. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Eks.Inputs
{

    /// <summary>
    /// Describes the configuration options accepted by a cluster to create its own node groups.
    /// </summary>
    public sealed class ClusterNodeGroupOptionsArgs : global::Pulumi.ResourceArgs
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
        [Input("amiId")]
        public Input<string>? AmiId { get; set; }

        /// <summary>
        /// The AMI Type to use for the worker nodes. 
        /// 
        /// Only applicable when setting an AMI ID that is of type `arm64`. 
        /// 
        /// Note: `amiType` and `gpu` are mutually exclusive.
        /// </summary>
        [Input("amiType")]
        public Input<string>? AmiType { get; set; }

        [Input("autoScalingGroupTags")]
        private InputMap<string>? _autoScalingGroupTags;

        /// <summary>
        /// The tags to apply to the NodeGroup's AutoScalingGroup in the CloudFormation Stack.
        /// 
        /// Per AWS, all stack-level tags, including automatically created tags, and the `cloudFormationTags` option are propagated to resources that AWS CloudFormation supports, including the AutoScalingGroup. See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html
        /// 
        /// Note: Given the inheritance of auto-generated CF tags and `cloudFormationTags`, you should either supply the tag in `autoScalingGroupTags` or `cloudFormationTags`, but not both.
        /// </summary>
        public InputMap<string> AutoScalingGroupTags
        {
            get => _autoScalingGroupTags ?? (_autoScalingGroupTags = new InputMap<string>());
            set => _autoScalingGroupTags = value;
        }

        /// <summary>
        /// Additional args to pass directly to `/etc/eks/bootstrap.sh`. For details on available options, see: https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh. Note that the `--apiserver-endpoint`, `--b64-cluster-ca` and `--kubelet-extra-args` flags are included automatically based on other configuration parameters.
        /// </summary>
        [Input("bootstrapExtraArgs")]
        public string? BootstrapExtraArgs { get; set; }

        [Input("bottlerocketSettings")]
        private InputMap<object>? _bottlerocketSettings;

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
        public InputMap<object> BottlerocketSettings
        {
            get => _bottlerocketSettings ?? (_bottlerocketSettings = new InputMap<object>());
            set => _bottlerocketSettings = value;
        }

        [Input("cloudFormationTags")]
        private InputMap<string>? _cloudFormationTags;

        /// <summary>
        /// The tags to apply to the CloudFormation Stack of the Worker NodeGroup.
        /// 
        /// Note: Given the inheritance of auto-generated CF tags and `cloudFormationTags`, you should either supply the tag in `autoScalingGroupTags` or `cloudFormationTags`, but not both.
        /// </summary>
        public InputMap<string> CloudFormationTags
        {
            get => _cloudFormationTags ?? (_cloudFormationTags = new InputMap<string>());
            set => _cloudFormationTags = value;
        }

        /// <summary>
        /// The ingress rule that gives node group access.
        /// </summary>
        [Input("clusterIngressRule")]
        public Input<Pulumi.Aws.Ec2.SecurityGroupRule>? ClusterIngressRule { get; set; }

        /// <summary>
        /// The number of worker nodes that should be running in the cluster. Defaults to 2.
        /// </summary>
        [Input("desiredCapacity")]
        public Input<int>? DesiredCapacity { get; set; }

        /// <summary>
        /// Enables/disables detailed monitoring of the EC2 instances.
        /// 
        /// With detailed monitoring, all metrics, including status check metrics, are available in 1-minute intervals.
        /// When enabled, you can also get aggregated data across groups of similar instances.
        /// 
        /// Note: You are charged per metric that is sent to CloudWatch. You are not charged for data storage.
        /// For more information, see "Paid tier" and "Example 1 - EC2 Detailed Monitoring" here https://aws.amazon.com/cloudwatch/pricing/.
        /// </summary>
        [Input("enableDetailedMonitoring")]
        public Input<bool>? EnableDetailedMonitoring { get; set; }

        /// <summary>
        /// Encrypt the root block device of the nodes in the node group.
        /// </summary>
        [Input("encryptRootBlockDevice")]
        public Input<bool>? EncryptRootBlockDevice { get; set; }

        [Input("extraNodeSecurityGroups")]
        private InputList<Pulumi.Aws.Ec2.SecurityGroup>? _extraNodeSecurityGroups;

        /// <summary>
        /// Extra security groups to attach on all nodes in this worker node group.
        /// 
        /// This additional set of security groups captures any user application rules that will be needed for the nodes.
        /// </summary>
        public InputList<Pulumi.Aws.Ec2.SecurityGroup> ExtraNodeSecurityGroups
        {
            get => _extraNodeSecurityGroups ?? (_extraNodeSecurityGroups = new InputList<Pulumi.Aws.Ec2.SecurityGroup>());
            set => _extraNodeSecurityGroups = value;
        }

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
        [Input("gpu")]
        public Input<bool>? Gpu { get; set; }

        /// <summary>
        /// The ingress rule that gives node group access.
        /// </summary>
        [Input("instanceProfile")]
        public Pulumi.Aws.Iam.InstanceProfile? InstanceProfile { get; set; }

        /// <summary>
        /// The instance type to use for the cluster's nodes. Defaults to "t2.medium".
        /// </summary>
        [Input("instanceType")]
        public Input<string>? InstanceType { get; set; }

        /// <summary>
        /// Name of the key pair to use for SSH access to worker nodes.
        /// </summary>
        [Input("keyName")]
        public Input<string>? KeyName { get; set; }

        /// <summary>
        /// Extra args to pass to the Kubelet. Corresponds to the options passed in the `--kubeletExtraArgs` flag to `/etc/eks/bootstrap.sh`. For example, '--port=10251 --address=0.0.0.0'. Note that the `labels` and `taints` properties will be applied to this list (using `--node-labels` and `--register-with-taints` respectively) after to the explicit `kubeletExtraArgs`.
        /// </summary>
        [Input("kubeletExtraArgs")]
        public string? KubeletExtraArgs { get; set; }

        [Input("labels")]
        private Dictionary<string, string>? _labels;

        /// <summary>
        /// Custom k8s node labels to be attached to each worker node. Adds the given key/value pairs to the `--node-labels` kubelet argument.
        /// </summary>
        public Dictionary<string, string> Labels
        {
            get => _labels ?? (_labels = new Dictionary<string, string>());
            set => _labels = value;
        }

        [Input("launchTemplateTagSpecifications")]
        private InputList<Pulumi.Aws.Ec2.Inputs.LaunchTemplateTagSpecificationArgs>? _launchTemplateTagSpecifications;

        /// <summary>
        /// The tag specifications to apply to the launch template.
        /// </summary>
        public InputList<Pulumi.Aws.Ec2.Inputs.LaunchTemplateTagSpecificationArgs> LaunchTemplateTagSpecifications
        {
            get => _launchTemplateTagSpecifications ?? (_launchTemplateTagSpecifications = new InputList<Pulumi.Aws.Ec2.Inputs.LaunchTemplateTagSpecificationArgs>());
            set => _launchTemplateTagSpecifications = value;
        }

        /// <summary>
        /// The maximum number of worker nodes running in the cluster. Defaults to 2.
        /// </summary>
        [Input("maxSize")]
        public Input<int>? MaxSize { get; set; }

        /// <summary>
        /// The minimum amount of instances that should remain available during an instance refresh, expressed as a percentage. Defaults to 50.
        /// </summary>
        [Input("minRefreshPercentage")]
        public Input<int>? MinRefreshPercentage { get; set; }

        /// <summary>
        /// The minimum number of worker nodes running in the cluster. Defaults to 1.
        /// </summary>
        [Input("minSize")]
        public Input<int>? MinSize { get; set; }

        /// <summary>
        /// Whether or not to auto-assign public IP addresses on the EKS worker nodes. If this toggle is set to true, the EKS workers will be auto-assigned public IPs. If false, they will not be auto-assigned public IPs.
        /// </summary>
        [Input("nodeAssociatePublicIpAddress")]
        public bool? NodeAssociatePublicIpAddress { get; set; }

        /// <summary>
        /// Public key material for SSH access to worker nodes. See allowed formats at:
        /// https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
        /// If not provided, no SSH access is enabled on VMs.
        /// </summary>
        [Input("nodePublicKey")]
        public Input<string>? NodePublicKey { get; set; }

        /// <summary>
        /// Whether the root block device should be deleted on termination of the instance. Defaults to true.
        /// </summary>
        [Input("nodeRootVolumeDeleteOnTermination")]
        public Input<bool>? NodeRootVolumeDeleteOnTermination { get; set; }

        /// <summary>
        /// Whether to encrypt a cluster node's root volume. Defaults to false.
        /// </summary>
        [Input("nodeRootVolumeEncrypted")]
        public Input<bool>? NodeRootVolumeEncrypted { get; set; }

        /// <summary>
        /// The amount of provisioned IOPS. This is only valid with a volumeType of 'io1'.
        /// </summary>
        [Input("nodeRootVolumeIops")]
        public Input<int>? NodeRootVolumeIops { get; set; }

        /// <summary>
        /// The size in GiB of a cluster node's root volume. Defaults to 20.
        /// </summary>
        [Input("nodeRootVolumeSize")]
        public Input<int>? NodeRootVolumeSize { get; set; }

        /// <summary>
        /// Provisioned throughput performance in integer MiB/s for a cluster node's root volume. This is only valid with a volumeType of 'gp3'.
        /// </summary>
        [Input("nodeRootVolumeThroughput")]
        public Input<int>? NodeRootVolumeThroughput { get; set; }

        /// <summary>
        /// Configured EBS type for a cluster node's root volume. Default is 'gp2'. Supported values are 'standard', 'gp2', 'gp3', 'st1', 'sc1', 'io1'.
        /// </summary>
        [Input("nodeRootVolumeType")]
        public Input<string>? NodeRootVolumeType { get; set; }

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
        [Input("nodeSecurityGroup")]
        public Input<Pulumi.Aws.Ec2.SecurityGroup>? NodeSecurityGroup { get; set; }

        [Input("nodeSubnetIds")]
        private InputList<string>? _nodeSubnetIds;

        /// <summary>
        /// The set of subnets to override and use for the worker node group.
        /// 
        /// Setting this option overrides which subnets to use for the worker node group, regardless if the cluster's `subnetIds` is set, or if `publicSubnetIds` and/or `privateSubnetIds` were set.
        /// </summary>
        public InputList<string> NodeSubnetIds
        {
            get => _nodeSubnetIds ?? (_nodeSubnetIds = new InputList<string>());
            set => _nodeSubnetIds = value;
        }

        /// <summary>
        /// Extra code to run on node startup. This code will run after the AWS EKS bootstrapping code and before the node signals its readiness to the managing CloudFormation stack. This code must be a typical user data script: critically it must begin with an interpreter directive (i.e. a `#!`).
        /// </summary>
        [Input("nodeUserData")]
        public Input<string>? NodeUserData { get; set; }

        /// <summary>
        /// User specified code to run on node startup. This code is expected to handle the full AWS EKS bootstrapping code and signal node readiness to the managing CloudFormation stack. This code must be a complete and executable user data script in bash (Linux) or powershell (Windows).
        /// 
        /// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/worker.html
        /// </summary>
        [Input("nodeUserDataOverride")]
        public Input<string>? NodeUserDataOverride { get; set; }

        [Input("nodeadmExtraOptions")]
        private InputList<Inputs.NodeadmOptionsArgs>? _nodeadmExtraOptions;

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
        public InputList<Inputs.NodeadmOptionsArgs> NodeadmExtraOptions
        {
            get => _nodeadmExtraOptions ?? (_nodeadmExtraOptions = new InputList<Inputs.NodeadmOptionsArgs>());
            set => _nodeadmExtraOptions = value;
        }

        /// <summary>
        /// The type of OS to use for the node group. Will be used to determine the right EKS optimized AMI to use based on the instance types and gpu configuration.
        /// Valid values are `AL2`, `AL2023` and `Bottlerocket`.
        /// 
        /// Defaults to `AL2`.
        /// </summary>
        [Input("operatingSystem")]
        public Input<Pulumi.Eks.OperatingSystem>? OperatingSystem { get; set; }

        /// <summary>
        /// Bidding price for spot instance. If set, only spot instances will be added as worker node.
        /// </summary>
        [Input("spotPrice")]
        public Input<string>? SpotPrice { get; set; }

        [Input("taints")]
        private Dictionary<string, Inputs.TaintArgs>? _taints;

        /// <summary>
        /// Custom k8s node taints to be attached to each worker node. Adds the given taints to the `--register-with-taints` kubelet argument
        /// </summary>
        public Dictionary<string, Inputs.TaintArgs> Taints
        {
            get => _taints ?? (_taints = new Dictionary<string, Inputs.TaintArgs>());
            set => _taints = value;
        }

        /// <summary>
        /// Desired Kubernetes master / control plane version. If you do not specify a value, the latest available version is used.
        /// </summary>
        [Input("version")]
        public Input<string>? Version { get; set; }

        public ClusterNodeGroupOptionsArgs()
        {
        }
        public static new ClusterNodeGroupOptionsArgs Empty => new ClusterNodeGroupOptionsArgs();
    }
}
