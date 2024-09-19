// *** WARNING: this file was generated by pulumi-gen-eks. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import * as utilities from "./utilities";

/**
 * VpcCniAddon manages the configuration of the Amazon VPC CNI plugin for Kubernetes by leveraging the EKS managed add-on.
 * For more information see: https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html
 */
export class VpcCniAddon extends pulumi.CustomResource {
    /**
     * Get an existing VpcCniAddon resource's state with the given name, ID, and optional extra
     * properties used to qualify the lookup.
     *
     * @param name The _unique_ name of the resulting resource.
     * @param id The _unique_ provider ID of the resource to lookup.
     * @param opts Optional settings to control the behavior of the CustomResource.
     */
    public static get(name: string, id: pulumi.Input<pulumi.ID>, opts?: pulumi.CustomResourceOptions): VpcCniAddon {
        return new VpcCniAddon(name, undefined as any, { ...opts, id: id });
    }

    /** @internal */
    public static readonly __pulumiType = 'eks:index:VpcCniAddon';

    /**
     * Returns true if the given object is an instance of VpcCniAddon.  This is designed to work even
     * when multiple copies of the Pulumi SDK have been loaded into the same process.
     */
    public static isInstance(obj: any): obj is VpcCniAddon {
        if (obj === undefined || obj === null) {
            return false;
        }
        return obj['__pulumiType'] === VpcCniAddon.__pulumiType;
    }


    /**
     * Create a VpcCniAddon resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args: VpcCniAddonArgs, opts?: pulumi.CustomResourceOptions) {
        let resourceInputs: pulumi.Inputs = {};
        opts = opts || {};
        if (!opts.id) {
            if ((!args || args.clusterName === undefined) && !opts.urn) {
                throw new Error("Missing required property 'clusterName'");
            }
            resourceInputs["addonVersion"] = args ? args.addonVersion : undefined;
            resourceInputs["clusterName"] = args ? args.clusterName : undefined;
            resourceInputs["clusterVersion"] = args ? args.clusterVersion : undefined;
            resourceInputs["cniConfigureRpfilter"] = args ? args.cniConfigureRpfilter : undefined;
            resourceInputs["cniCustomNetworkCfg"] = args ? args.cniCustomNetworkCfg : undefined;
            resourceInputs["cniExternalSnat"] = args ? args.cniExternalSnat : undefined;
            resourceInputs["configurationValues"] = args ? args.configurationValues : undefined;
            resourceInputs["customNetworkConfig"] = args ? args.customNetworkConfig : undefined;
            resourceInputs["disableTcpEarlyDemux"] = args ? args.disableTcpEarlyDemux : undefined;
            resourceInputs["enableNetworkPolicy"] = args ? args.enableNetworkPolicy : undefined;
            resourceInputs["enablePodEni"] = args ? args.enablePodEni : undefined;
            resourceInputs["enablePrefixDelegation"] = args ? args.enablePrefixDelegation : undefined;
            resourceInputs["eniConfigLabelDef"] = args ? args.eniConfigLabelDef : undefined;
            resourceInputs["eniMtu"] = args ? args.eniMtu : undefined;
            resourceInputs["externalSnat"] = args ? args.externalSnat : undefined;
            resourceInputs["logFile"] = args ? args.logFile : undefined;
            resourceInputs["logLevel"] = args ? args.logLevel : undefined;
            resourceInputs["nodePortSupport"] = args ? args.nodePortSupport : undefined;
            resourceInputs["resolveConflictsOnCreate"] = args ? args.resolveConflictsOnCreate : undefined;
            resourceInputs["resolveConflictsOnUpdate"] = args ? args.resolveConflictsOnUpdate : undefined;
            resourceInputs["securityContextPrivileged"] = args ? args.securityContextPrivileged : undefined;
            resourceInputs["serviceAccountRoleArn"] = args ? args.serviceAccountRoleArn : undefined;
            resourceInputs["tags"] = args ? args.tags : undefined;
            resourceInputs["vethPrefix"] = args ? args.vethPrefix : undefined;
            resourceInputs["warmEniTarget"] = args ? args.warmEniTarget : undefined;
            resourceInputs["warmIpTarget"] = args ? args.warmIpTarget : undefined;
            resourceInputs["warmPrefixTarget"] = args ? args.warmPrefixTarget : undefined;
        } else {
        }
        opts = pulumi.mergeOptions(utilities.resourceOptsDefaults(), opts);
        super(VpcCniAddon.__pulumiType, name, resourceInputs, opts);
    }
}

/**
 * The set of arguments for constructing a VpcCniAddon resource.
 */
export interface VpcCniAddonArgs {
    /**
     * The version of the addon to use. If not specified, the latest version of the addon for the cluster's Kubernetes version will be used.
     */
    addonVersion?: pulumi.Input<string>;
    /**
     * The name of the EKS cluster.
     */
    clusterName: pulumi.Input<string>;
    /**
     * The Kubernetes version of the cluster. This is used to determine the addon version to use if `addonVersion` is not specified.
     */
    clusterVersion?: pulumi.Input<string>;
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
     * How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on.
     * Valid values are NONE and OVERWRITE.
     *
     * For more details see the [CreateAddon API Docs](https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html).
     */
    resolveConflictsOnCreate?: pulumi.Input<string>;
    /**
     * How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from theAmazon EKS default value.
     * Valid values are NONE, OVERWRITE, and PRESERVE.
     *
     * For more details see the [UpdateAddon API Docs](https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateAddon.html).
     */
    resolveConflictsOnUpdate?: pulumi.Input<string>;
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
     * Key-value map of resource tags. If configured with a provider default_tags configuration block present, tags with matching keys will overwrite those defined at the provider-level.
     */
    tags?: pulumi.Input<pulumi.Input<{[key: string]: pulumi.Input<string>}>[]>;
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
