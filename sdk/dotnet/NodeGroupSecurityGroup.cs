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
    /// NodeGroupSecurityGroup is a component that wraps creating a security group for node groups with the default ingress &amp; egress rules required to connect and work with the EKS cluster security group.
    /// </summary>
    [EksResourceType("eks:index:NodeGroupSecurityGroup")]
    public partial class NodeGroupSecurityGroup : global::Pulumi.ComponentResource
    {
        /// <summary>
        /// The security group for node groups with the default ingress &amp; egress rules required to connect and work with the EKS cluster security group.
        /// </summary>
        [Output("securityGroup")]
        public Output<Pulumi.Aws.Ec2.SecurityGroup> SecurityGroup { get; private set; } = null!;

        /// <summary>
        /// The EKS cluster ingress rule.
        /// </summary>
        [Output("securityGroupRule")]
        public Output<Pulumi.Aws.Ec2.SecurityGroupRule> SecurityGroupRule { get; private set; } = null!;


        /// <summary>
        /// Create a NodeGroupSecurityGroup resource with the given unique name, arguments, and options.
        /// </summary>
        ///
        /// <param name="name">The unique name of the resource</param>
        /// <param name="args">The arguments used to populate this resource's properties</param>
        /// <param name="options">A bag of options that control this resource's behavior</param>
        public NodeGroupSecurityGroup(string name, NodeGroupSecurityGroupArgs args, ComponentResourceOptions? options = null)
            : base("eks:index:NodeGroupSecurityGroup", name, args ?? new NodeGroupSecurityGroupArgs(), MakeResourceOptions(options, ""), remote: true)
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

    public sealed class NodeGroupSecurityGroupArgs : global::Pulumi.ResourceArgs
    {
        /// <summary>
        /// The security group associated with the EKS cluster.
        /// </summary>
        [Input("clusterSecurityGroup", required: true)]
        public Input<Pulumi.Aws.Ec2.SecurityGroup> ClusterSecurityGroup { get; set; } = null!;

        /// <summary>
        /// The EKS cluster associated with the worker node group
        /// </summary>
        [Input("eksCluster", required: true)]
        public Input<Pulumi.Aws.Eks.Cluster> EksCluster { get; set; } = null!;

        [Input("tags")]
        private InputMap<string>? _tags;

        /// <summary>
        /// Key-value mapping of tags to apply to this security group.
        /// </summary>
        public InputMap<string> Tags
        {
            get => _tags ?? (_tags = new InputMap<string>());
            set => _tags = value;
        }

        /// <summary>
        /// The VPC in which to create the worker node group.
        /// </summary>
        [Input("vpcId", required: true)]
        public Input<string> VpcId { get; set; } = null!;

        public NodeGroupSecurityGroupArgs()
        {
        }
        public static new NodeGroupSecurityGroupArgs Empty => new NodeGroupSecurityGroupArgs();
    }
}
