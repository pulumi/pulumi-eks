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
    /// VpcCniAddon manages the configuration of the Amazon VPC CNI plugin for Kubernetes by leveraging the EKS managed add-on.
    /// For more information see: https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html
    /// </summary>
    [EksResourceType("eks:index:VpcCniAddon")]
    public partial class VpcCniAddon : global::Pulumi.CustomResource
    {
        /// <summary>
        /// Create a VpcCniAddon resource with the given unique name, arguments, and options.
        /// </summary>
        ///
        /// <param name="name">The unique name of the resource</param>
        /// <param name="args">The arguments used to populate this resource's properties</param>
        /// <param name="options">A bag of options that control this resource's behavior</param>
        public VpcCniAddon(string name, VpcCniAddonArgs args, CustomResourceOptions? options = null)
            : base("eks:index:VpcCniAddon", name, args ?? new VpcCniAddonArgs(), MakeResourceOptions(options, ""))
        {
        }

        private VpcCniAddon(string name, Input<string> id, CustomResourceOptions? options = null)
            : base("eks:index:VpcCniAddon", name, null, MakeResourceOptions(options, id))
        {
        }

        private static CustomResourceOptions MakeResourceOptions(CustomResourceOptions? options, Input<string>? id)
        {
            var defaultOptions = new CustomResourceOptions
            {
                Version = Utilities.Version,
            };
            var merged = CustomResourceOptions.Merge(defaultOptions, options);
            // Override the ID if one was specified for consistency with other language SDKs.
            merged.Id = id ?? merged.Id;
            return merged;
        }
        /// <summary>
        /// Get an existing VpcCniAddon resource's state with the given name, ID, and optional extra
        /// properties used to qualify the lookup.
        /// </summary>
        ///
        /// <param name="name">The unique name of the resulting resource.</param>
        /// <param name="id">The unique provider ID of the resource to lookup.</param>
        /// <param name="options">A bag of options that control this resource's behavior</param>
        public static VpcCniAddon Get(string name, Input<string> id, CustomResourceOptions? options = null)
        {
            return new VpcCniAddon(name, id, options);
        }
    }

    public sealed class VpcCniAddonArgs : global::Pulumi.ResourceArgs
    {
        /// <summary>
        /// The version of the addon to use. If not specified, the latest version of the addon for the cluster's Kubernetes version will be used.
        /// </summary>
        [Input("addonVersion")]
        public Input<string>? AddonVersion { get; set; }

        /// <summary>
        /// The name of the EKS cluster.
        /// </summary>
        [Input("clusterName", required: true)]
        public Input<string> ClusterName { get; set; } = null!;

        /// <summary>
        /// The Kubernetes version of the cluster. This is used to determine the addon version to use if `addonVersion` is not specified.
        /// </summary>
        [Input("clusterVersion")]
        public Input<string>? ClusterVersion { get; set; }

        /// <summary>
        /// Specifies whether ipamd should configure rp filter for primary interface. Default is `false`.
        /// </summary>
        [Input("cniConfigureRpfilter")]
        public Input<bool>? CniConfigureRpfilter { get; set; }

        /// <summary>
        /// Specifies that your pods may use subnets and security groups that are independent of your worker node's VPC configuration. By default, pods share the same subnet and security groups as the worker node's primary interface. Setting this variable to true causes ipamd to use the security groups and VPC subnet in a worker node's ENIConfig for elastic network interface allocation. You must create an ENIConfig custom resource for each subnet that your pods will reside in, and then annotate or label each worker node to use a specific ENIConfig (multiple worker nodes can be annotated or labelled with the same ENIConfig). Worker nodes can only be annotated with a single ENIConfig at a time, and the subnet in the ENIConfig must belong to the same Availability Zone that the worker node resides in. For more information, see CNI Custom Networking in the Amazon EKS User Guide. Default is `false`
        /// </summary>
        [Input("cniCustomNetworkCfg")]
        public Input<bool>? CniCustomNetworkCfg { get; set; }

        /// <summary>
        /// Specifies whether an external NAT gateway should be used to provide SNAT of secondary ENI IP addresses. If set to true, the SNAT iptables rule and off-VPC IP rule are not applied, and these rules are removed if they have already been applied. Disable SNAT if you need to allow inbound communication to your pods from external VPNs, direct connections, and external VPCs, and your pods do not need to access the Internet directly via an Internet Gateway. However, your nodes must be running in a private subnet and connected to the internet through an AWS NAT Gateway or another external NAT device. Default is `false`
        /// </summary>
        [Input("cniExternalSnat")]
        public Input<bool>? CniExternalSnat { get; set; }

        [Input("configurationValues")]
        private InputMap<object>? _configurationValues;

        /// <summary>
        /// Custom configuration values for the vpc-cni addon. This object must match the schema derived from [describe-addon-configuration](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-configuration.html).
        /// </summary>
        public InputMap<object> ConfigurationValues
        {
            get => _configurationValues ?? (_configurationValues = new InputMap<object>());
            set => _configurationValues = value;
        }

        /// <summary>
        /// Specifies that your pods may use subnets and security groups (within the same VPC as your control plane resources) that are independent of your cluster's `resourcesVpcConfig`.
        /// 
        /// Defaults to false.
        /// </summary>
        [Input("customNetworkConfig")]
        public Input<bool>? CustomNetworkConfig { get; set; }

        /// <summary>
        /// Allows the kubelet's liveness and readiness probes to connect via TCP when pod ENI is enabled. This will slightly increase local TCP connection latency.
        /// </summary>
        [Input("disableTcpEarlyDemux")]
        public Input<bool>? DisableTcpEarlyDemux { get; set; }

        /// <summary>
        /// Enables using Kubernetes network policies. In Kubernetes, by default, all pod-to-pod communication is allowed. Communication can be restricted with Kubernetes NetworkPolicy objects.
        /// 
        /// See for more information: [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/).
        /// </summary>
        [Input("enableNetworkPolicy")]
        public Input<bool>? EnableNetworkPolicy { get; set; }

        /// <summary>
        /// Specifies whether to allow IPAMD to add the `vpc.amazonaws.com/has-trunk-attached` label to the node if the instance has capacity to attach an additional ENI. Default is `false`. If using liveness and readiness probes, you will also need to disable TCP early demux.
        /// </summary>
        [Input("enablePodEni")]
        public Input<bool>? EnablePodEni { get; set; }

        /// <summary>
        /// IPAMD will start allocating (/28) prefixes to the ENIs with ENABLE_PREFIX_DELEGATION set to true.
        /// </summary>
        [Input("enablePrefixDelegation")]
        public Input<bool>? EnablePrefixDelegation { get; set; }

        /// <summary>
        /// Specifies the ENI_CONFIG_LABEL_DEF environment variable value for worker nodes. This is used to tell Kubernetes to automatically apply the ENIConfig for each Availability Zone
        /// Ref: https://docs.aws.amazon.com/eks/latest/userguide/cni-custom-network.html (step 5(c))
        /// 
        /// Defaults to the official AWS CNI image in ECR.
        /// </summary>
        [Input("eniConfigLabelDef")]
        public Input<string>? EniConfigLabelDef { get; set; }

        /// <summary>
        /// Used to configure the MTU size for attached ENIs. The valid range is from 576 to 9001.
        /// 
        /// Defaults to 9001.
        /// </summary>
        [Input("eniMtu")]
        public Input<int>? EniMtu { get; set; }

        /// <summary>
        /// Specifies whether an external NAT gateway should be used to provide SNAT of secondary ENI IP addresses. If set to true, the SNAT iptables rule and off-VPC IP rule are not applied, and these rules are removed if they have already been applied.
        /// 
        /// Defaults to false.
        /// </summary>
        [Input("externalSnat")]
        public Input<bool>? ExternalSnat { get; set; }

        /// <summary>
        /// Specifies the file path used for logs.
        /// 
        /// Defaults to "stdout" to emit Pod logs for `kubectl logs`.
        /// </summary>
        [Input("logFile")]
        public Input<string>? LogFile { get; set; }

        /// <summary>
        /// Specifies the log level used for logs.
        /// 
        /// Defaults to "DEBUG"
        /// Valid values: "DEBUG", "INFO", "WARN", "ERROR", or "FATAL".
        /// </summary>
        [Input("logLevel")]
        public Input<string>? LogLevel { get; set; }

        /// <summary>
        /// Specifies whether NodePort services are enabled on a worker node's primary network interface. This requires additional iptables rules and that the kernel's reverse path filter on the primary interface is set to loose.
        /// 
        /// Defaults to true.
        /// </summary>
        [Input("nodePortSupport")]
        public Input<bool>? NodePortSupport { get; set; }

        /// <summary>
        /// How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on.
        /// Valid values are NONE and OVERWRITE.
        /// 
        /// For more details see the [CreateAddon API Docs](https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html).
        /// </summary>
        [Input("resolveConflictsOnCreate")]
        public Input<string>? ResolveConflictsOnCreate { get; set; }

        /// <summary>
        /// How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from theAmazon EKS default value.
        /// Valid values are NONE, OVERWRITE, and PRESERVE.
        /// 
        /// For more details see the [UpdateAddon API Docs](https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateAddon.html).
        /// </summary>
        [Input("resolveConflictsOnUpdate")]
        public Input<string>? ResolveConflictsOnUpdate { get; set; }

        /// <summary>
        /// Pass privilege to containers securityContext. This is required when SELinux is enabled. This value will not be passed to the CNI config by default
        /// </summary>
        [Input("securityContextPrivileged")]
        public Input<bool>? SecurityContextPrivileged { get; set; }

        /// <summary>
        /// The Amazon Resource Name (ARN) of an existing IAM role to bind to the add-on's service account. The role must be assigned the IAM permissions required by the add-on. If you don't specify an existing IAM role, then the add-on uses the permissions assigned to the node IAM role.
        /// 
        /// For more information, see [Amazon EKS node IAM role](https://docs.aws.amazon.com/eks/latest/userguide/create-node-role.html) in the Amazon EKS User Guide.
        /// 
        /// Note: To specify an existing IAM role, you must have an IAM OpenID Connect (OIDC) provider created for your cluster. For more information, see [Enabling IAM roles for service accounts on your cluster](https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html) in the Amazon EKS User Guide.
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

        /// <summary>
        /// Specifies the veth prefix used to generate the host-side veth device name for the CNI.
        /// 
        /// The prefix can be at most 4 characters long.
        /// 
        /// Defaults to "eni".
        /// </summary>
        [Input("vethPrefix")]
        public Input<string>? VethPrefix { get; set; }

        /// <summary>
        /// Specifies the number of free elastic network interfaces (and all of their available IP addresses) that the ipamD daemon should attempt to keep available for pod assignment on the node.
        /// 
        /// Defaults to 1.
        /// </summary>
        [Input("warmEniTarget")]
        public Input<int>? WarmEniTarget { get; set; }

        /// <summary>
        /// Specifies the number of free IP addresses that the ipamD daemon should attempt to keep available for pod assignment on the node.
        /// </summary>
        [Input("warmIpTarget")]
        public Input<int>? WarmIpTarget { get; set; }

        /// <summary>
        /// WARM_PREFIX_TARGET will allocate one full (/28) prefix even if a single IP  is consumed with the existing prefix. Ref: https://github.com/aws/amazon-vpc-cni-k8s/blob/master/docs/prefix-and-ip-target.md
        /// </summary>
        [Input("warmPrefixTarget")]
        public Input<int>? WarmPrefixTarget { get; set; }

        public VpcCniAddonArgs()
        {
        }
        public static new VpcCniAddonArgs Empty => new VpcCniAddonArgs();
    }
}
