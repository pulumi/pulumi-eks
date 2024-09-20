// *** WARNING: this file was generated by pulumi-gen-eks. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Eks.Inputs
{

    public sealed class CoreDnsAddonOptionsArgs : global::Pulumi.ResourceArgs
    {
        /// <summary>
        /// Whether or not to create the Addon in the cluster
        /// 
        /// The managed addon can only be enabled if the cluster is a Fargate cluster or if the cluster
        /// uses the default node group, otherwise the self-managed addon is used.
        /// </summary>
        [Input("enabled")]
        public bool? Enabled { get; set; }

        /// <summary>
        /// How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on. Valid values are `NONE` and `OVERWRITE`. For more details see the [CreateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html) API Docs.
        /// </summary>
        [Input("resolveConflictsOnCreate")]
        public Pulumi.Eks.ResolveConflictsOnCreate? ResolveConflictsOnCreate { get; set; }

        /// <summary>
        /// How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from the Amazon EKS default value. Valid values are `NONE`, `OVERWRITE`, and `PRESERVE`. For more details see the [UpdateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateAddon.html) API Docs.
        /// </summary>
        [Input("resolveConflictsOnUpdate")]
        public Pulumi.Eks.ResolveConflictsOnUpdate? ResolveConflictsOnUpdate { get; set; }

        /// <summary>
        /// The version of the EKS add-on. The version must match one of the versions returned by [describe-addon-versions](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-versions.html).
        /// </summary>
        [Input("version")]
        public Input<string>? Version { get; set; }

        public CoreDnsAddonOptionsArgs()
        {
            Enabled = true;
            ResolveConflictsOnCreate = Pulumi.Eks.ResolveConflictsOnCreate.Overwrite;
            ResolveConflictsOnUpdate = Pulumi.Eks.ResolveConflictsOnUpdate.Overwrite;
        }
        public static new CoreDnsAddonOptionsArgs Empty => new CoreDnsAddonOptionsArgs();
    }
}
