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
    /// Addon manages an EKS add-on.
    /// For more information about supported add-ons, see: https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html
    /// </summary>
    [EksResourceType("eks:index:Addon")]
    public partial class Addon : global::Pulumi.ComponentResource
    {
        /// <summary>
        /// Create a Addon resource with the given unique name, arguments, and options.
        /// </summary>
        ///
        /// <param name="name">The unique name of the resource</param>
        /// <param name="args">The arguments used to populate this resource's properties</param>
        /// <param name="options">A bag of options that control this resource's behavior</param>
        public Addon(string name, AddonArgs args, ComponentResourceOptions? options = null)
            : base("eks:index:Addon", name, args ?? new AddonArgs(), MakeResourceOptions(options, ""), remote: true)
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

    public sealed class AddonArgs : global::Pulumi.ResourceArgs
    {
        /// <summary>
        /// Name of the EKS add-on. The name must match one of the names returned by describe-addon-versions.
        /// </summary>
        [Input("addonName", required: true)]
        public Input<string> AddonName { get; set; } = null!;

        /// <summary>
        /// The version of the EKS add-on. The version must match one of the versions returned by describe-addon-versions.
        /// </summary>
        [Input("addonVersion")]
        public Input<string>? AddonVersion { get; set; }

        /// <summary>
        /// The target EKS cluster.
        /// </summary>
        [Input("cluster", required: true)]
        public Input<Pulumi.Eks.Cluster> Cluster { get; set; } = null!;

        [Input("configurationValues")]
        private InputMap<object>? _configurationValues;

        /// <summary>
        /// Custom configuration values for addons specified as an object. This object value must match the JSON schema derived from describe-addon-configuration.
        /// </summary>
        public InputMap<object> ConfigurationValues
        {
            get => _configurationValues ?? (_configurationValues = new InputMap<object>());
            set => _configurationValues = value;
        }

        /// <summary>
        /// Indicates if you want to preserve the created resources when deleting the EKS add-on.
        /// </summary>
        [Input("preserve")]
        public Input<bool>? Preserve { get; set; }

        /// <summary>
        /// How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on. Valid values are NONE and OVERWRITE. For more details see the CreateAddon API Docs.
        /// </summary>
        [Input("resolveConflictsOnCreate")]
        public Input<string>? ResolveConflictsOnCreate { get; set; }

        /// <summary>
        /// How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from the Amazon EKS default value. Valid values are NONE, OVERWRITE, and PRESERVE. For more details see the UpdateAddon API Docs.
        /// </summary>
        [Input("resolveConflictsOnUpdate")]
        public Input<string>? ResolveConflictsOnUpdate { get; set; }

        /// <summary>
        /// The Amazon Resource Name (ARN) of an existing IAM role to bind to the add-on's service account. The role must be assigned the IAM permissions required by the add-on. If you don't specify an existing IAM role, then the add-on uses the permissions assigned to the node IAM role. For more information, see Amazon EKS node IAM role in the Amazon EKS User Guide.
        /// 
        /// 						Note: To specify an existing IAM role, you must have an IAM OpenID Connect (OIDC) provider created for your cluster. For more information, see Enabling IAM roles for service accounts on your cluster in the Amazon EKS User Guide.
        /// </summary>
        [Input("serviceAccountRoleArn")]
        public Input<string>? ServiceAccountRoleArn { get; set; }

        [Input("tags")]
        private InputList<ImmutableDictionary<string, string>>? _tags;

        /// <summary>
        /// Key-value map of resource tags. If configured with a provider default_tags configuration block present, tags with matching keys will overwrite those defined at the provider-level.
        /// </summary>
        public InputList<ImmutableDictionary<string, string>> Tags
        {
            get => _tags ?? (_tags = new InputList<ImmutableDictionary<string, string>>());
            set => _tags = value;
        }

        public AddonArgs()
        {
        }
        public static new AddonArgs Empty => new AddonArgs();
    }
}
