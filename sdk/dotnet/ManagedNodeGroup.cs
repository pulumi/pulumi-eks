// *** WARNING: this file was generated by pulumi-gen-eks. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Eks
{
    /// <summary>
    /// ManagedNodeGroup is a component that wraps creating an AWS managed node group.
    /// 
    /// See for more details:
    /// https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
    /// </summary>
    [EksResourceType("eks:index:ManagedNodeGroup")]
    public partial class ManagedNodeGroup : global::Pulumi.ComponentResource
    {
        /// <summary>
        /// The AWS managed node group.
        /// </summary>
        [Output("nodeGroup")]
        public Output<Pulumi.Aws.Eks.NodeGroup> NodeGroup { get; private set; } = null!;


        /// <summary>
        /// Create a ManagedNodeGroup resource with the given unique name, arguments, and options.
        /// </summary>
        ///
        /// <param name="name">The unique name of the resource</param>
        /// <param name="args">The arguments used to populate this resource's properties</param>
        /// <param name="options">A bag of options that control this resource's behavior</param>
        public ManagedNodeGroup(string name, ManagedNodeGroupArgs args, ComponentResourceOptions? options = null)
            : base("eks:index:ManagedNodeGroup", name, args ?? new ManagedNodeGroupArgs(), MakeResourceOptions(options, ""), remote: true)
        {
        }

        private static ComponentResourceOptions MakeResourceOptions(ComponentResourceOptions? options, Input<string>? id)
        {
            var defaultOptions = new ComponentResourceOptions
            {
                Version = Utilities.Version,
            };
            var merged = ComponentResourceOptions.Merge(defaultOptions, options);
            // Override the ID if one was specified for consistency with other language SDKs.
            merged.Id = id ?? merged.Id;
            return merged;
        }
    }

    public sealed class ManagedNodeGroupArgs : global::Pulumi.ResourceArgs
    {
        /// <summary>
        /// Type of Amazon Machine Image (AMI) associated with the EKS Node Group. Defaults to `AL2_x86_64`. See the AWS documentation (https://docs.aws.amazon.com/eks/latest/APIReference/API_Nodegroup.html#AmazonEKS-Type-Nodegroup-amiType) for valid AMI Types. This provider will only perform drift detection if a configuration value is provided.
        /// </summary>
        [Input("amiType")]
        public Input<string>? AmiType { get; set; }

        /// <summary>
        /// Additional args to pass directly to `/etc/eks/bootstrap.sh`. For details on available options, see: https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh. Note that the `--apiserver-endpoint`, `--b64-cluster-ca` and `--kubelet-extra-args` flags are included automatically based on other configuration parameters.
        /// 
        /// Note that this field conflicts with `launchTemplate`.
        /// </summary>
        [Input("bootstrapExtraArgs")]
        public string? BootstrapExtraArgs { get; set; }

        /// <summary>
        /// Type of capacity associated with the EKS Node Group. Valid values: `ON_DEMAND`, `SPOT`. This provider will only perform drift detection if a configuration value is provided.
        /// </summary>
        [Input("capacityType")]
        public Input<string>? CapacityType { get; set; }

        /// <summary>
        /// The target EKS cluster.
        /// </summary>
        [Input("cluster", required: true)]
        public InputUnion<Pulumi.Eks.Cluster, Inputs.CoreDataArgs> Cluster { get; set; } = null!;

        /// <summary>
        /// Name of the EKS Cluster.
        /// </summary>
        [Input("clusterName")]
        public Input<string>? ClusterName { get; set; }

        /// <summary>
        /// Disk size in GiB for worker nodes. Defaults to `20`. This provider will only perform drift detection if a configuration value is provided.
        /// </summary>
        [Input("diskSize")]
        public Input<int>? DiskSize { get; set; }

        /// <summary>
        /// Force version update if existing pods are unable to be drained due to a pod disruption budget issue.
        /// </summary>
        [Input("forceUpdateVersion")]
        public Input<bool>? ForceUpdateVersion { get; set; }

        [Input("instanceTypes")]
        private InputList<string>? _instanceTypes;

        /// <summary>
        /// Set of instance types associated with the EKS Node Group. Defaults to `["t3.medium"]`. This provider will only perform drift detection if a configuration value is provided. Currently, the EKS API only accepts a single value in the set.
        /// </summary>
        public InputList<string> InstanceTypes
        {
            get => _instanceTypes ?? (_instanceTypes = new InputList<string>());
            set => _instanceTypes = value;
        }

        /// <summary>
        /// Extra args to pass to the Kubelet. Corresponds to the options passed in the `--kubeletExtraArgs` flag to `/etc/eks/bootstrap.sh`. For example, '--port=10251 --address=0.0.0.0'. To escape characters in the extra argsvalue, wrap the value in quotes. For example, `kubeletExtraArgs = '--allowed-unsafe-sysctls "net.core.somaxconn"'`.
        /// Note that this field conflicts with `launchTemplate`.
        /// </summary>
        [Input("kubeletExtraArgs")]
        public string? KubeletExtraArgs { get; set; }

        [Input("labels")]
        private InputMap<string>? _labels;

        /// <summary>
        /// Key-value map of Kubernetes labels. Only labels that are applied with the EKS API are managed by this argument. Other Kubernetes labels applied to the EKS Node Group will not be managed.
        /// </summary>
        public InputMap<string> Labels
        {
            get => _labels ?? (_labels = new InputMap<string>());
            set => _labels = value;
        }

        /// <summary>
        /// Launch Template settings.
        /// 
        /// Note: This field is mutually exclusive with `kubeletExtraArgs` and `bootstrapExtraArgs`.
        /// </summary>
        [Input("launchTemplate")]
        public Input<Pulumi.Aws.Eks.Inputs.NodeGroupLaunchTemplateArgs>? LaunchTemplate { get; set; }

        /// <summary>
        /// Name of the EKS Node Group. If omitted, this provider will assign a random, unique name. Conflicts with `nodeGroupNamePrefix`.
        /// </summary>
        [Input("nodeGroupName")]
        public Input<string>? NodeGroupName { get; set; }

        /// <summary>
        /// Creates a unique name beginning with the specified prefix. Conflicts with `nodeGroupName`.
        /// </summary>
        [Input("nodeGroupNamePrefix")]
        public Input<string>? NodeGroupNamePrefix { get; set; }

        /// <summary>
        /// The IAM Role that provides permissions for the EKS Node Group.
        /// 
        /// Note, `nodeRole` and `nodeRoleArn` are mutually exclusive, and a single option must be used.
        /// </summary>
        [Input("nodeRole")]
        public Input<Pulumi.Aws.Iam.Role>? NodeRole { get; set; }

        /// <summary>
        /// Amazon Resource Name (ARN) of the IAM Role that provides permissions for the EKS Node Group.
        /// 
        /// Note, `nodeRoleArn` and `nodeRole` are mutually exclusive, and a single option must be used.
        /// </summary>
        [Input("nodeRoleArn")]
        public Input<string>? NodeRoleArn { get; set; }

        /// <summary>
        /// AMI version of the EKS Node Group. Defaults to latest version for Kubernetes version.
        /// </summary>
        [Input("releaseVersion")]
        public Input<string>? ReleaseVersion { get; set; }

        /// <summary>
        /// Remote access settings.
        /// </summary>
        [Input("remoteAccess")]
        public Input<Pulumi.Aws.Eks.Inputs.NodeGroupRemoteAccessArgs>? RemoteAccess { get; set; }

        /// <summary>
        /// Scaling settings.
        /// 
        /// Default scaling amounts of the node group autoscaling group are:
        ///   - desiredSize: 2
        ///   - minSize: 1
        ///   - maxSize: 2
        /// </summary>
        [Input("scalingConfig")]
        public Input<Pulumi.Aws.Eks.Inputs.NodeGroupScalingConfigArgs>? ScalingConfig { get; set; }

        [Input("subnetIds")]
        private InputList<string>? _subnetIds;

        /// <summary>
        /// Identifiers of EC2 Subnets to associate with the EKS Node Group. These subnets must have the following resource tag: `kubernetes.io/cluster/CLUSTER_NAME` (where `CLUSTER_NAME` is replaced with the name of the EKS Cluster).
        /// 
        /// Default subnetIds is chosen from the following list, in order, if subnetIds arg is not set:
        ///   - core.subnetIds
        ///   - core.privateIds
        ///   - core.publicSubnetIds
        /// 
        /// This default logic is based on the existing subnet IDs logic of this package: https://git.io/JeM11
        /// </summary>
        public InputList<string> SubnetIds
        {
            get => _subnetIds ?? (_subnetIds = new InputList<string>());
            set => _subnetIds = value;
        }

        [Input("tags")]
        private InputMap<string>? _tags;

        /// <summary>
        /// Key-value mapping of resource tags.
        /// </summary>
        public InputMap<string> Tags
        {
            get => _tags ?? (_tags = new InputMap<string>());
            set => _tags = value;
        }

        [Input("taints")]
        private InputList<Pulumi.Aws.Eks.Inputs.NodeGroupTaintArgs>? _taints;

        /// <summary>
        /// The Kubernetes taints to be applied to the nodes in the node group. Maximum of 50 taints per node group.
        /// </summary>
        public InputList<Pulumi.Aws.Eks.Inputs.NodeGroupTaintArgs> Taints
        {
            get => _taints ?? (_taints = new InputList<Pulumi.Aws.Eks.Inputs.NodeGroupTaintArgs>());
            set => _taints = value;
        }

        [Input("version")]
        public Input<string>? Version { get; set; }

        public ManagedNodeGroupArgs()
        {
        }
        public static new ManagedNodeGroupArgs Empty => new ManagedNodeGroupArgs();
    }
}
