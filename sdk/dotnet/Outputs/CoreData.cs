// *** WARNING: this file was generated by pulumi. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Eks.Outputs
{

    /// <summary>
    /// Defines the core set of data associated with an EKS cluster, including the network in which it runs.
    /// </summary>
    [OutputType]
    public sealed class CoreData
    {
        /// <summary>
        /// The access entries added to the cluster.
        /// </summary>
        public readonly ImmutableArray<Outputs.AccessEntry> AccessEntries;
        public readonly Pulumi.Aws.Provider? AwsProvider;
        public readonly Pulumi.Aws.Eks.Cluster Cluster;
        /// <summary>
        /// The IAM Role attached to the EKS Cluster
        /// </summary>
        public readonly Pulumi.Aws.Iam.Role ClusterIamRole;
        public readonly Pulumi.Aws.Ec2.SecurityGroup ClusterSecurityGroup;
        public readonly Pulumi.Kubernetes.Core.V1.ConfigMap? EksNodeAccess;
        public readonly Pulumi.Aws.Eks.Outputs.ClusterEncryptionConfig? EncryptionConfig;
        /// <summary>
        /// The EKS cluster's Kubernetes API server endpoint.
        /// </summary>
        public readonly string Endpoint;
        /// <summary>
        /// The Fargate profile used to manage which pods run on Fargate.
        /// </summary>
        public readonly Pulumi.Aws.Eks.FargateProfile? FargateProfile;
        /// <summary>
        /// The IAM instance roles for the cluster's nodes.
        /// </summary>
        public readonly ImmutableArray<Pulumi.Aws.Iam.Role> InstanceRoles;
        /// <summary>
        /// The kubeconfig file for the cluster.
        /// </summary>
        public readonly object? Kubeconfig;
        /// <summary>
        /// The cluster's node group options.
        /// </summary>
        public readonly Outputs.ClusterNodeGroupOptions NodeGroupOptions;
        /// <summary>
        /// Tags attached to the security groups associated with the cluster's worker nodes.
        /// </summary>
        public readonly ImmutableDictionary<string, string>? NodeSecurityGroupTags;
        public readonly Pulumi.Aws.Iam.OpenIdConnectProvider? OidcProvider;
        /// <summary>
        /// List of subnet IDs for the private subnets.
        /// </summary>
        public readonly ImmutableArray<string> PrivateSubnetIds;
        public readonly Pulumi.Kubernetes.Provider Provider;
        /// <summary>
        /// List of subnet IDs for the public subnets.
        /// </summary>
        public readonly ImmutableArray<string> PublicSubnetIds;
        /// <summary>
        /// The storage class used for persistent storage by the cluster.
        /// </summary>
        public readonly ImmutableDictionary<string, Pulumi.Kubernetes.Storage.V1.StorageClass>? StorageClasses;
        /// <summary>
        /// List of subnet IDs for the EKS cluster.
        /// </summary>
        public readonly ImmutableArray<string> SubnetIds;
        /// <summary>
        /// A map of tags assigned to the EKS cluster.
        /// </summary>
        public readonly ImmutableDictionary<string, string>? Tags;
        /// <summary>
        /// The VPC CNI for the cluster.
        /// </summary>
        public readonly Pulumi.Eks.VpcCni? VpcCni;
        /// <summary>
        /// ID of the cluster's VPC.
        /// </summary>
        public readonly string VpcId;

        [OutputConstructor]
        private CoreData(
            ImmutableArray<Outputs.AccessEntry> accessEntries,

            Pulumi.Aws.Provider? awsProvider,

            Pulumi.Aws.Eks.Cluster cluster,

            Pulumi.Aws.Iam.Role clusterIamRole,

            Pulumi.Aws.Ec2.SecurityGroup clusterSecurityGroup,

            Pulumi.Kubernetes.Core.V1.ConfigMap? eksNodeAccess,

            Pulumi.Aws.Eks.Outputs.ClusterEncryptionConfig? encryptionConfig,

            string endpoint,

            Pulumi.Aws.Eks.FargateProfile? fargateProfile,

            ImmutableArray<Pulumi.Aws.Iam.Role> instanceRoles,

            object? kubeconfig,

            Outputs.ClusterNodeGroupOptions nodeGroupOptions,

            ImmutableDictionary<string, string>? nodeSecurityGroupTags,

            Pulumi.Aws.Iam.OpenIdConnectProvider? oidcProvider,

            ImmutableArray<string> privateSubnetIds,

            Pulumi.Kubernetes.Provider provider,

            ImmutableArray<string> publicSubnetIds,

            ImmutableDictionary<string, Pulumi.Kubernetes.Storage.V1.StorageClass>? storageClasses,

            ImmutableArray<string> subnetIds,

            ImmutableDictionary<string, string>? tags,

            Pulumi.Eks.VpcCni? vpcCni,

            string vpcId)
        {
            AccessEntries = accessEntries;
            AwsProvider = awsProvider;
            Cluster = cluster;
            ClusterIamRole = clusterIamRole;
            ClusterSecurityGroup = clusterSecurityGroup;
            EksNodeAccess = eksNodeAccess;
            EncryptionConfig = encryptionConfig;
            Endpoint = endpoint;
            FargateProfile = fargateProfile;
            InstanceRoles = instanceRoles;
            Kubeconfig = kubeconfig;
            NodeGroupOptions = nodeGroupOptions;
            NodeSecurityGroupTags = nodeSecurityGroupTags;
            OidcProvider = oidcProvider;
            PrivateSubnetIds = privateSubnetIds;
            Provider = provider;
            PublicSubnetIds = publicSubnetIds;
            StorageClasses = storageClasses;
            SubnetIds = subnetIds;
            Tags = tags;
            VpcCni = vpcCni;
            VpcId = vpcId;
        }
    }
}
