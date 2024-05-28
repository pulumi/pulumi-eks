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
    /// Defines the core set of data associated with an EKS cluster, including the network in which it runs.
    /// </summary>
    public sealed class CoreDataArgs : global::Pulumi.ResourceArgs
    {
        [Input("accessEntries")]
        private InputList<Inputs.AccessPolicyAssociationArgs>? _accessEntries;

        /// <summary>
        /// The access entries added to the cluster.
        /// </summary>
        public InputList<Inputs.AccessPolicyAssociationArgs> AccessEntries
        {
            get => _accessEntries ?? (_accessEntries = new InputList<Inputs.AccessPolicyAssociationArgs>());
            set => _accessEntries = value;
        }

        [Input("awsProvider")]
        public Input<Pulumi.Aws.Provider>? AwsProvider { get; set; }

        [Input("cluster", required: true)]
        public Input<Pulumi.Aws.Eks.Cluster> Cluster { get; set; } = null!;

        /// <summary>
        /// The IAM Role attached to the EKS Cluster
        /// </summary>
        [Input("clusterIamRole", required: true)]
        public Input<Pulumi.Aws.Iam.Role> ClusterIamRole { get; set; } = null!;

        [Input("clusterSecurityGroup", required: true)]
        public Input<Pulumi.Aws.Ec2.SecurityGroup> ClusterSecurityGroup { get; set; } = null!;

        [Input("eksNodeAccess")]
        public Input<Pulumi.Kubernetes.Core.V1.ConfigMap>? EksNodeAccess { get; set; }

        [Input("encryptionConfig")]
        public Input<Pulumi.Aws.Eks.Inputs.ClusterEncryptionConfigArgs>? EncryptionConfig { get; set; }

        /// <summary>
        /// The EKS cluster's Kubernetes API server endpoint.
        /// </summary>
        [Input("endpoint", required: true)]
        public Input<string> Endpoint { get; set; } = null!;

        /// <summary>
        /// The Fargate profile used to manage which pods run on Fargate.
        /// </summary>
        [Input("fargateProfile")]
        public Input<Pulumi.Aws.Eks.FargateProfile>? FargateProfile { get; set; }

        [Input("instanceRoles", required: true)]
        private InputList<Pulumi.Aws.Iam.Role>? _instanceRoles;

        /// <summary>
        /// The IAM instance roles for the cluster's nodes.
        /// </summary>
        public InputList<Pulumi.Aws.Iam.Role> InstanceRoles
        {
            get => _instanceRoles ?? (_instanceRoles = new InputList<Pulumi.Aws.Iam.Role>());
            set => _instanceRoles = value;
        }

        /// <summary>
        /// The kubeconfig file for the cluster.
        /// </summary>
        [Input("kubeconfig")]
        public Input<object>? Kubeconfig { get; set; }

        /// <summary>
        /// The cluster's node group options.
        /// </summary>
        [Input("nodeGroupOptions", required: true)]
        public Input<Inputs.ClusterNodeGroupOptionsArgs> NodeGroupOptions { get; set; } = null!;

        [Input("nodeSecurityGroupTags")]
        private InputMap<string>? _nodeSecurityGroupTags;

        /// <summary>
        /// Tags attached to the security groups associated with the cluster's worker nodes.
        /// </summary>
        public InputMap<string> NodeSecurityGroupTags
        {
            get => _nodeSecurityGroupTags ?? (_nodeSecurityGroupTags = new InputMap<string>());
            set => _nodeSecurityGroupTags = value;
        }

        [Input("oidcProvider")]
        public Input<Pulumi.Aws.Iam.OpenIdConnectProvider>? OidcProvider { get; set; }

        [Input("privateSubnetIds")]
        private InputList<string>? _privateSubnetIds;

        /// <summary>
        /// List of subnet IDs for the private subnets.
        /// </summary>
        public InputList<string> PrivateSubnetIds
        {
            get => _privateSubnetIds ?? (_privateSubnetIds = new InputList<string>());
            set => _privateSubnetIds = value;
        }

        [Input("provider", required: true)]
        public Input<Pulumi.Kubernetes.Provider> Provider { get; set; } = null!;

        [Input("publicSubnetIds")]
        private InputList<string>? _publicSubnetIds;

        /// <summary>
        /// List of subnet IDs for the public subnets.
        /// </summary>
        public InputList<string> PublicSubnetIds
        {
            get => _publicSubnetIds ?? (_publicSubnetIds = new InputList<string>());
            set => _publicSubnetIds = value;
        }

        [Input("storageClasses")]
        private InputMap<Pulumi.Kubernetes.Storage.V1.StorageClass>? _storageClasses;

        /// <summary>
        /// The storage class used for persistent storage by the cluster.
        /// </summary>
        public InputMap<Pulumi.Kubernetes.Storage.V1.StorageClass> StorageClasses
        {
            get => _storageClasses ?? (_storageClasses = new InputMap<Pulumi.Kubernetes.Storage.V1.StorageClass>());
            set => _storageClasses = value;
        }

        [Input("subnetIds", required: true)]
        private InputList<string>? _subnetIds;

        /// <summary>
        /// List of subnet IDs for the EKS cluster.
        /// </summary>
        public InputList<string> SubnetIds
        {
            get => _subnetIds ?? (_subnetIds = new InputList<string>());
            set => _subnetIds = value;
        }

        [Input("tags")]
        private InputMap<string>? _tags;

        /// <summary>
        /// A map of tags assigned to the EKS cluster.
        /// </summary>
        public InputMap<string> Tags
        {
            get => _tags ?? (_tags = new InputMap<string>());
            set => _tags = value;
        }

        /// <summary>
        /// The VPC CNI for the cluster.
        /// </summary>
        [Input("vpcCni")]
        public Input<Pulumi.Eks.VpcCni>? VpcCni { get; set; }

        /// <summary>
        /// ID of the cluster's VPC.
        /// </summary>
        [Input("vpcId", required: true)]
        public Input<string> VpcId { get; set; } = null!;

        public CoreDataArgs()
        {
        }
        public static new CoreDataArgs Empty => new CoreDataArgs();
    }
}
