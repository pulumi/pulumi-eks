// *** WARNING: this file was generated by pulumi-gen-eks. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import * as inputs from "./types/input";
import * as outputs from "./types/output";
import * as enums from "./types/enums";
import * as utilities from "./utilities";

import * as pulumiAws from "@pulumi/aws";
import * as pulumiKubernetes from "@pulumi/kubernetes";

import {VpcCniAddon} from "./index";

/**
 * Cluster is a component that wraps the AWS and Kubernetes resources necessary to run an EKS cluster, its worker nodes, its optional StorageClasses, and an optional deployment of the Kubernetes Dashboard.
 *
 * ## Example Usage
 *
 * ### Provisioning a New EKS Cluster
 *
 * <!--Start PulumiCodeChooser -->
 * ```typescript
 * import * as pulumi from "@pulumi/pulumi";
 * import * as eks from "@pulumi/eks";
 *
 * // Create an EKS cluster with the default configuration.
 * const cluster = new eks.Cluster("cluster", {});
 *
 * // Export the cluster's kubeconfig.
 * export const kubeconfig = cluster.kubeconfig;
 * ```
 * <!--End PulumiCodeChooser -->
 */
export class Cluster extends pulumi.ComponentResource {
    /** @internal */
    public static readonly __pulumiType = 'eks:index:Cluster';

    /**
     * Returns true if the given object is an instance of Cluster.  This is designed to work even
     * when multiple copies of the Pulumi SDK have been loaded into the same process.
     */
    public static isInstance(obj: any): obj is Cluster {
        if (obj === undefined || obj === null) {
            return false;
        }
        return obj['__pulumiType'] === Cluster.__pulumiType;
    }

    /**
     * The name of the IAM role created for nodes managed by EKS Auto Mode. Defaults to an empty string.
     */
    public /*out*/ readonly autoModeNodeRoleName!: pulumi.Output<string>;
    /**
     * The AWS resource provider.
     */
    public /*out*/ readonly awsProvider!: pulumi.Output<pulumiAws.Provider>;
    /**
     * The ID of the security group rule that gives node group access to the cluster API server. Defaults to an empty string if `skipDefaultSecurityGroups` is set to true.
     */
    public /*out*/ readonly clusterIngressRuleId!: pulumi.Output<string>;
    /**
     * The security group for the EKS cluster.
     */
    public readonly clusterSecurityGroup!: pulumi.Output<pulumiAws.ec2.SecurityGroup | undefined>;
    /**
     * The cluster security group ID of the EKS cluster. Returns the EKS created security group if `skipDefaultSecurityGroups` is set to true.
     */
    public /*out*/ readonly clusterSecurityGroupId!: pulumi.Output<string>;
    /**
     * The EKS cluster and its dependencies.
     */
    public /*out*/ readonly core!: pulumi.Output<outputs.CoreData>;
    /**
     * The default Node Group configuration, or undefined if `skipDefaultNodeGroup` was specified.
     */
    public /*out*/ readonly defaultNodeGroup!: pulumi.Output<outputs.NodeGroupData | undefined>;
    /**
     * The name of the default node group's AutoScaling Group. Defaults to an empty string if `skipDefaultNodeGroup` is set to true.
     */
    public /*out*/ readonly defaultNodeGroupAsgName!: pulumi.Output<string>;
    /**
     * The EKS cluster.
     */
    public /*out*/ readonly eksCluster!: pulumi.Output<pulumiAws.eks.Cluster>;
    /**
     * The ingress rule that gives node group access to cluster API server.
     */
    public /*out*/ readonly eksClusterIngressRule!: pulumi.Output<pulumiAws.ec2.SecurityGroupRule | undefined>;
    /**
     * The ID of the Fargate Profile. Defaults to an empty string if no Fargate profile is configured.
     */
    public /*out*/ readonly fargateProfileId!: pulumi.Output<string>;
    /**
     * The status of the Fargate Profile. Defaults to an empty string if no Fargate profile is configured.
     */
    public /*out*/ readonly fargateProfileStatus!: pulumi.Output<string>;
    /**
     * The service roles used by the EKS cluster. Only supported with authentication mode `CONFIG_MAP` or `API_AND_CONFIG_MAP`.
     */
    public readonly instanceRoles!: pulumi.Output<pulumiAws.iam.Role[]>;
    /**
     * A kubeconfig that can be used to connect to the EKS cluster.
     */
    public /*out*/ readonly kubeconfig!: pulumi.Output<any>;
    /**
     * A kubeconfig that can be used to connect to the EKS cluster as a JSON string.
     */
    public /*out*/ readonly kubeconfigJson!: pulumi.Output<string>;
    /**
     * The security group for the cluster's nodes.
     */
    public /*out*/ readonly nodeSecurityGroup!: pulumi.Output<pulumiAws.ec2.SecurityGroup | undefined>;
    /**
     * The node security group ID of the EKS cluster. Returns the EKS created security group if `skipDefaultSecurityGroups` is set to true.
     */
    public /*out*/ readonly nodeSecurityGroupId!: pulumi.Output<string>;
    /**
     * The OIDC Issuer of the EKS cluster (OIDC Provider URL without leading `https://`).
     *
     * This value can be used to associate kubernetes service accounts with IAM roles. For more information, see https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html.
     */
    public /*out*/ readonly oidcIssuer!: pulumi.Output<string>;
    /**
     * The ARN of the IAM OpenID Connect Provider for the EKS cluster. Defaults to an empty string if no OIDC provider is configured.
     */
    public /*out*/ readonly oidcProviderArn!: pulumi.Output<string>;
    /**
     * Issuer URL for the OpenID Connect identity provider of the EKS cluster.
     */
    public /*out*/ readonly oidcProviderUrl!: pulumi.Output<string>;

    /**
     * Create a Cluster resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args?: ClusterArgs, opts?: pulumi.ComponentResourceOptions) {
        let resourceInputs: pulumi.Inputs = {};
        opts = opts || {};
        if (!opts.id) {
            resourceInputs["accessEntries"] = args ? args.accessEntries : undefined;
            resourceInputs["authenticationMode"] = args ? args.authenticationMode : undefined;
            resourceInputs["autoMode"] = args ? (args.autoMode ? inputs.autoModeOptionsArgsProvideDefaults(args.autoMode) : undefined) : undefined;
            resourceInputs["clusterSecurityGroup"] = args ? args.clusterSecurityGroup : undefined;
            resourceInputs["clusterSecurityGroupTags"] = args ? args.clusterSecurityGroupTags : undefined;
            resourceInputs["clusterTags"] = args ? args.clusterTags : undefined;
            resourceInputs["corednsAddonOptions"] = args ? (args.corednsAddonOptions ? inputs.coreDnsAddonOptionsArgsProvideDefaults(args.corednsAddonOptions) : undefined) : undefined;
            resourceInputs["createInstanceRole"] = args ? args.createInstanceRole : undefined;
            resourceInputs["createOidcProvider"] = args ? args.createOidcProvider : undefined;
            resourceInputs["creationRoleProvider"] = args ? args.creationRoleProvider : undefined;
            resourceInputs["defaultAddonsToRemove"] = args ? args.defaultAddonsToRemove : undefined;
            resourceInputs["desiredCapacity"] = args ? args.desiredCapacity : undefined;
            resourceInputs["enableConfigMapMutable"] = args ? args.enableConfigMapMutable : undefined;
            resourceInputs["enabledClusterLogTypes"] = args ? args.enabledClusterLogTypes : undefined;
            resourceInputs["encryptionConfigKeyArn"] = args ? args.encryptionConfigKeyArn : undefined;
            resourceInputs["endpointPrivateAccess"] = args ? args.endpointPrivateAccess : undefined;
            resourceInputs["endpointPublicAccess"] = args ? args.endpointPublicAccess : undefined;
            resourceInputs["fargate"] = args ? args.fargate : undefined;
            resourceInputs["gpu"] = args ? args.gpu : undefined;
            resourceInputs["instanceProfileName"] = args ? args.instanceProfileName : undefined;
            resourceInputs["instanceRole"] = args ? args.instanceRole : undefined;
            resourceInputs["instanceRoles"] = args ? args.instanceRoles : undefined;
            resourceInputs["instanceType"] = args ? args.instanceType : undefined;
            resourceInputs["ipFamily"] = args ? args.ipFamily : undefined;
            resourceInputs["kubeProxyAddonOptions"] = args ? (args.kubeProxyAddonOptions ? inputs.kubeProxyAddonOptionsArgsProvideDefaults(args.kubeProxyAddonOptions) : undefined) : undefined;
            resourceInputs["kubernetesServiceIpAddressRange"] = args ? args.kubernetesServiceIpAddressRange : undefined;
            resourceInputs["maxSize"] = args ? args.maxSize : undefined;
            resourceInputs["minSize"] = args ? args.minSize : undefined;
            resourceInputs["name"] = args ? args.name : undefined;
            resourceInputs["nodeAmiId"] = args ? args.nodeAmiId : undefined;
            resourceInputs["nodeAssociatePublicIpAddress"] = args ? args.nodeAssociatePublicIpAddress : undefined;
            resourceInputs["nodeGroupOptions"] = args ? args.nodeGroupOptions : undefined;
            resourceInputs["nodePublicKey"] = args ? args.nodePublicKey : undefined;
            resourceInputs["nodeRootVolumeEncrypted"] = args ? args.nodeRootVolumeEncrypted : undefined;
            resourceInputs["nodeRootVolumeSize"] = args ? args.nodeRootVolumeSize : undefined;
            resourceInputs["nodeSecurityGroupTags"] = args ? args.nodeSecurityGroupTags : undefined;
            resourceInputs["nodeSubnetIds"] = args ? args.nodeSubnetIds : undefined;
            resourceInputs["nodeUserData"] = args ? args.nodeUserData : undefined;
            resourceInputs["privateSubnetIds"] = args ? args.privateSubnetIds : undefined;
            resourceInputs["providerCredentialOpts"] = args ? args.providerCredentialOpts : undefined;
            resourceInputs["proxy"] = args ? args.proxy : undefined;
            resourceInputs["publicAccessCidrs"] = args ? args.publicAccessCidrs : undefined;
            resourceInputs["publicSubnetIds"] = args ? args.publicSubnetIds : undefined;
            resourceInputs["roleMappings"] = args ? args.roleMappings : undefined;
            resourceInputs["serviceRole"] = args ? args.serviceRole : undefined;
            resourceInputs["skipDefaultNodeGroup"] = args ? args.skipDefaultNodeGroup : undefined;
            resourceInputs["skipDefaultSecurityGroups"] = args ? args.skipDefaultSecurityGroups : undefined;
            resourceInputs["storageClasses"] = args ? args.storageClasses : undefined;
            resourceInputs["subnetIds"] = args ? args.subnetIds : undefined;
            resourceInputs["tags"] = args ? args.tags : undefined;
            resourceInputs["useDefaultVpcCni"] = args ? args.useDefaultVpcCni : undefined;
            resourceInputs["userMappings"] = args ? args.userMappings : undefined;
            resourceInputs["version"] = args ? args.version : undefined;
            resourceInputs["vpcCniOptions"] = args ? (args.vpcCniOptions ? inputs.vpcCniOptionsArgsProvideDefaults(args.vpcCniOptions) : undefined) : undefined;
            resourceInputs["vpcId"] = args ? args.vpcId : undefined;
            resourceInputs["autoModeNodeRoleName"] = undefined /*out*/;
            resourceInputs["awsProvider"] = undefined /*out*/;
            resourceInputs["clusterIngressRuleId"] = undefined /*out*/;
            resourceInputs["clusterSecurityGroupId"] = undefined /*out*/;
            resourceInputs["core"] = undefined /*out*/;
            resourceInputs["defaultNodeGroup"] = undefined /*out*/;
            resourceInputs["defaultNodeGroupAsgName"] = undefined /*out*/;
            resourceInputs["eksCluster"] = undefined /*out*/;
            resourceInputs["eksClusterIngressRule"] = undefined /*out*/;
            resourceInputs["fargateProfileId"] = undefined /*out*/;
            resourceInputs["fargateProfileStatus"] = undefined /*out*/;
            resourceInputs["kubeconfig"] = undefined /*out*/;
            resourceInputs["kubeconfigJson"] = undefined /*out*/;
            resourceInputs["nodeSecurityGroup"] = undefined /*out*/;
            resourceInputs["nodeSecurityGroupId"] = undefined /*out*/;
            resourceInputs["oidcIssuer"] = undefined /*out*/;
            resourceInputs["oidcProviderArn"] = undefined /*out*/;
            resourceInputs["oidcProviderUrl"] = undefined /*out*/;
        } else {
            resourceInputs["autoModeNodeRoleName"] = undefined /*out*/;
            resourceInputs["awsProvider"] = undefined /*out*/;
            resourceInputs["clusterIngressRuleId"] = undefined /*out*/;
            resourceInputs["clusterSecurityGroup"] = undefined /*out*/;
            resourceInputs["clusterSecurityGroupId"] = undefined /*out*/;
            resourceInputs["core"] = undefined /*out*/;
            resourceInputs["defaultNodeGroup"] = undefined /*out*/;
            resourceInputs["defaultNodeGroupAsgName"] = undefined /*out*/;
            resourceInputs["eksCluster"] = undefined /*out*/;
            resourceInputs["eksClusterIngressRule"] = undefined /*out*/;
            resourceInputs["fargateProfileId"] = undefined /*out*/;
            resourceInputs["fargateProfileStatus"] = undefined /*out*/;
            resourceInputs["instanceRoles"] = undefined /*out*/;
            resourceInputs["kubeconfig"] = undefined /*out*/;
            resourceInputs["kubeconfigJson"] = undefined /*out*/;
            resourceInputs["nodeSecurityGroup"] = undefined /*out*/;
            resourceInputs["nodeSecurityGroupId"] = undefined /*out*/;
            resourceInputs["oidcIssuer"] = undefined /*out*/;
            resourceInputs["oidcProviderArn"] = undefined /*out*/;
            resourceInputs["oidcProviderUrl"] = undefined /*out*/;
        }
        opts = pulumi.mergeOptions(utilities.resourceOptsDefaults(), opts);
        super(Cluster.__pulumiType, name, resourceInputs, opts, true /*remote*/);
    }

    /**
     * Generate a kubeconfig for cluster authentication that does not use the default AWS credential provider chain, and instead is scoped to the supported options in `KubeconfigOptions`.
     *
     * The kubeconfig generated is automatically stringified for ease of use with the pulumi/kubernetes provider.
     *
     * See for more details:
     * - https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
     * - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html
     * - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html
     */
    getKubeconfig(args?: Cluster.GetKubeconfigArgs): pulumi.Output<Cluster.GetKubeconfigResult> {
        args = args || {};
        return pulumi.runtime.call("eks:index:Cluster/getKubeconfig", {
            "__self__": this,
            "profileName": args.profileName,
            "roleArn": args.roleArn,
        }, this);
    }
}

/**
 * The set of arguments for constructing a Cluster resource.
 */
export interface ClusterArgs {
    /**
     * Access entries to add to the EKS cluster. They can be used to allow IAM principals to access the cluster. Access entries are only supported with authentication mode `API` or `API_AND_CONFIG_MAP`.
     *
     * See for more details:
     * https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
     */
    accessEntries?: {[key: string]: inputs.AccessEntryArgs};
    /**
     * The authentication mode of the cluster. Valid values are `CONFIG_MAP`, `API` or `API_AND_CONFIG_MAP`.
     *
     * See for more details:
     * https://docs.aws.amazon.com/eks/latest/userguide/grant-k8s-access.html#set-cam
     */
    authenticationMode?: enums.AuthenticationMode;
    /**
     * Configuration Options for EKS Auto Mode. If EKS Auto Mode is enabled, AWS will manage cluster infrastructure on your behalf.
     *
     * For more information, see: https://docs.aws.amazon.com/eks/latest/userguide/automode.html
     */
    autoMode?: inputs.AutoModeOptionsArgs;
    /**
     * The security group to use for the cluster API endpoint. If not provided, a new security group will be created with full internet egress and ingress from node groups.
     *
     * Note: The security group resource should not contain any inline ingress or egress rules.
     */
    clusterSecurityGroup?: pulumi.Input<pulumiAws.ec2.SecurityGroup>;
    /**
     * The tags to apply to the cluster security group.
     */
    clusterSecurityGroupTags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    /**
     * The tags to apply to the EKS cluster.
     */
    clusterTags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    /**
     * Options for managing the `coredns` addon.
     */
    corednsAddonOptions?: inputs.CoreDnsAddonOptionsArgs;
    /**
     * Whether to create the instance role for the EKS cluster. Defaults to true when using the default node group, false otherwise.
     * If set to false when using the default node group, an instance role or instance profile must be provided.n
     * Note: this option has no effect if a custom instance role is provided with `instanceRole` or `instanceRoles`.
     */
    createInstanceRole?: boolean;
    /**
     * Indicates whether an IAM OIDC Provider is created for the EKS cluster.
     *
     * The OIDC provider is used in the cluster in combination with k8s Service Account annotations to provide IAM roles at the k8s Pod level.
     *
     * See for more details:
     *  - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
     *  - https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
     *  - https://aws.amazon.com/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/
     *  - https://www.pulumi.com/registry/packages/aws/api-docs/eks/cluster/#enabling-iam-roles-for-service-accounts
     */
    createOidcProvider?: pulumi.Input<boolean>;
    /**
     * The IAM Role Provider used to create & authenticate against the EKS cluster. This role is given `[system:masters]` permission in K8S, See: https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html
     *
     * Note: This option is only supported with Pulumi nodejs programs. Please use `ProviderCredentialOpts` as an alternative instead.
     */
    creationRoleProvider?: inputs.CreationRoleProviderArgs;
    /**
     * List of addons to remove upon creation. Any addon listed will be "adopted" and then removed. This allows for the creation of a baremetal cluster where no addon is deployed and direct management of addons via Pulumi Kubernetes resources. Valid entries are kube-proxy, coredns and vpc-cni. Only works on first creation of a cluster.
     */
    defaultAddonsToRemove?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * The number of worker nodes that should be running in the cluster. Defaults to 2.
     */
    desiredCapacity?: pulumi.Input<number>;
    /**
     * Sets the 'enableConfigMapMutable' option on the cluster kubernetes provider.
     *
     * Applies updates to the aws-auth ConfigMap in place over a replace operation if set to true.
     * https://www.pulumi.com/registry/packages/kubernetes/api-docs/provider/#enableconfigmapmutable_nodejs
     */
    enableConfigMapMutable?: pulumi.Input<boolean>;
    /**
     * Enable EKS control plane logging. This sends logs to cloudwatch. Possible list of values are: ["api", "audit", "authenticator", "controllerManager", "scheduler"]. By default it is off.
     */
    enabledClusterLogTypes?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * KMS Key ARN to use with the encryption configuration for the cluster.
     *
     * Only available on Kubernetes 1.13+ clusters created after March 6, 2020.
     * See for more details:
     * - https://aws.amazon.com/about-aws/whats-new/2020/03/amazon-eks-adds-envelope-encryption-for-secrets-with-aws-kms/
     */
    encryptionConfigKeyArn?: pulumi.Input<string>;
    /**
     * Indicates whether or not the Amazon EKS private API server endpoint is enabled. Default is `false`.
     */
    endpointPrivateAccess?: pulumi.Input<boolean>;
    /**
     * Indicates whether or not the Amazon EKS public API server endpoint is enabled. Default is `true`.
     */
    endpointPublicAccess?: pulumi.Input<boolean>;
    /**
     * Add support for launching pods in Fargate. Defaults to launching pods in the `default` namespace.  If specified, the default node group is skipped as though `skipDefaultNodeGroup: true` had been passed.
     */
    fargate?: pulumi.Input<boolean | inputs.FargateProfileArgs>;
    /**
     * Use the latest recommended EKS Optimized Linux AMI with GPU support for the worker nodes from the AWS Systems Manager Parameter Store.
     *
     * Defaults to false.
     *
     * Note: `gpu` and `nodeAmiId` are mutually exclusive.
     *
     * See for more details:
     * - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
     * - https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
     */
    gpu?: pulumi.Input<boolean>;
    /**
     * The default IAM InstanceProfile to use on the Worker NodeGroups, if one is not already set in the NodeGroup.
     */
    instanceProfileName?: pulumi.Input<string>;
    /**
     * This enables the simple case of only registering a *single* IAM instance role with the cluster, that is required to be shared by *all* node groups in their instance profiles.
     *
     * Note: options `instanceRole` and `instanceRoles` are mutually exclusive.
     */
    instanceRole?: pulumi.Input<pulumiAws.iam.Role>;
    /**
     * This enables the advanced case of registering *many* IAM instance roles with the cluster for per node group IAM, instead of the simpler, shared case of `instanceRole`.
     *
     * Note: options `instanceRole` and `instanceRoles` are mutually exclusive.
     */
    instanceRoles?: pulumi.Input<pulumi.Input<pulumiAws.iam.Role>[]>;
    /**
     * The instance type to use for the cluster's nodes. Defaults to "t3.medium".
     */
    instanceType?: pulumi.Input<string>;
    /**
     * The IP family used to assign Kubernetes pod and service addresses. Valid values are `ipv4` (default) and `ipv6`.
     * You can only specify an IP family when you create a cluster, changing this value will force a new cluster to be created.
     */
    ipFamily?: pulumi.Input<string>;
    /**
     * Options for managing the `kube-proxy` addon.
     */
    kubeProxyAddonOptions?: inputs.KubeProxyAddonOptionsArgs;
    /**
     * The CIDR block to assign Kubernetes service IP addresses from. If you don't
     * specify a block, Kubernetes assigns addresses from either the 10.100.0.0/16 or
     * 172.20.0.0/16 CIDR blocks. This setting only applies to IPv4 clusters. We recommend that you specify a block
     * that does not overlap with resources in other networks that are peered or connected to your VPC. You can only specify
     * a custom CIDR block when you create a cluster, changing this value will force a new cluster to be created.
     *
     * The block must meet the following requirements:
     * - Within one of the following private IP address blocks: 10.0.0.0/8, 172.16.0.0.0/12, or 192.168.0.0/16.
     * - Doesn't overlap with any CIDR block assigned to the VPC that you selected for VPC.
     * - Between /24 and /12.
     */
    kubernetesServiceIpAddressRange?: pulumi.Input<string>;
    /**
     * The maximum number of worker nodes running in the cluster. Defaults to 2.
     */
    maxSize?: pulumi.Input<number>;
    /**
     * The minimum number of worker nodes running in the cluster. Defaults to 1.
     */
    minSize?: pulumi.Input<number>;
    /**
     * The cluster's physical resource name.
     *
     * If not specified, the default is to use auto-naming for the cluster's name, resulting in a physical name with the format `${name}-eksCluster-0123abcd`.
     *
     * See for more details: https://www.pulumi.com/docs/intro/concepts/programming-model/#autonaming
     */
    name?: pulumi.Input<string>;
    /**
     * The AMI ID to use for the worker nodes.
     *
     * Defaults to the latest recommended EKS Optimized Linux AMI from the AWS Systems Manager Parameter Store.
     *
     * Note: `nodeAmiId` and `gpu` are mutually exclusive.
     *
     * See for more details:
     * - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
     */
    nodeAmiId?: pulumi.Input<string>;
    /**
     * Whether or not to auto-assign the EKS worker nodes public IP addresses. If this toggle is set to true, the EKS workers will be auto-assigned public IPs. If false, they will not be auto-assigned public IPs.
     */
    nodeAssociatePublicIpAddress?: boolean;
    /**
     * The common configuration settings for NodeGroups.
     */
    nodeGroupOptions?: inputs.ClusterNodeGroupOptionsArgs;
    /**
     * Public key material for SSH access to worker nodes. See allowed formats at:
     * https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
     * If not provided, no SSH access is enabled on VMs.
     */
    nodePublicKey?: pulumi.Input<string>;
    /**
     * Encrypt the root block device of the nodes in the node group.
     */
    nodeRootVolumeEncrypted?: pulumi.Input<boolean>;
    /**
     * The size in GiB of a cluster node's root volume. Defaults to 20.
     */
    nodeRootVolumeSize?: pulumi.Input<number>;
    /**
     * The tags to apply to the default `nodeSecurityGroup` created by the cluster.
     *
     * Note: The `nodeSecurityGroupTags` option and the node group option `nodeSecurityGroup` are mutually exclusive.
     */
    nodeSecurityGroupTags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    /**
     * The subnets to use for worker nodes. Defaults to the value of subnetIds.
     */
    nodeSubnetIds?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * Extra code to run on node startup. This code will run after the AWS EKS bootstrapping code and before the node signals its readiness to the managing CloudFormation stack. This code must be a typical user data script: critically it must begin with an interpreter directive (i.e. a `#!`).
     */
    nodeUserData?: pulumi.Input<string>;
    /**
     * The set of private subnets to use for the worker node groups on the EKS cluster. These subnets are automatically tagged by EKS for Kubernetes purposes.
     *
     * If `vpcId` is not set, the cluster will use the AWS account's default VPC subnets.
     *
     * Worker network architecture options:
     *  - Private-only: Only set `privateSubnetIds`.
     *    - Default workers to run in a private subnet. In this setting, Kubernetes cannot create public, internet-facing load balancers for your pods.
     *  - Public-only: Only set `publicSubnetIds`.
     *    - Default workers to run in a public subnet.
     *  - Mixed (recommended): Set both `privateSubnetIds` and `publicSubnetIds`.
     *    - Default all worker nodes to run in private subnets, and use the public subnets for internet-facing load balancers.
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.Note: The use of `subnetIds`, along with `publicSubnetIds` and/or `privateSubnetIds` is mutually exclusive. The use of `publicSubnetIds` and `privateSubnetIds` is encouraged.
     *
     * Also consider setting `nodeAssociatePublicIpAddress: false` for fully private workers.
     */
    privateSubnetIds?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * The AWS provider credential options to scope the cluster's kubeconfig authentication when using a non-default credential chain.
     *
     * This is required for certain auth scenarios. For example:
     * - Creating and using a new AWS provider instance, or
     * - Setting the AWS_PROFILE environment variable, or
     * - Using a named profile configured on the AWS provider via:
     * `pulumi config set aws:profile <profileName>`
     *
     * See for more details:
     * - https://www.pulumi.com/registry/packages/aws/api-docs/provider/
     * - https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/
     * - https://www.pulumi.com/docs/intro/cloud-providers/aws/#configuration
     * - https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
     */
    providerCredentialOpts?: pulumi.Input<inputs.KubeconfigOptionsArgs>;
    /**
     * The HTTP(S) proxy to use within a proxied environment.
     *
     *  The proxy is used during cluster creation, and OIDC configuration.
     *
     * This is an alternative option to setting the proxy environment variables: HTTP(S)_PROXY and/or http(s)_proxy.
     *
     * This option is required iff the proxy environment variables are not set.
     *
     * Format:      <protocol>://<host>:<port>
     * Auth Format: <protocol>://<username>:<password>@<host>:<port>
     *
     * Ex:
     *   - "http://proxy.example.com:3128"
     *   - "https://proxy.example.com"
     *   - "http://username:password@proxy.example.com:3128"
     */
    proxy?: string;
    /**
     * Indicates which CIDR blocks can access the Amazon EKS public API server endpoint.
     */
    publicAccessCidrs?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * The set of public subnets to use for the worker node groups on the EKS cluster. These subnets are automatically tagged by EKS for Kubernetes purposes.
     *
     * If `vpcId` is not set, the cluster will use the AWS account's default VPC subnets.
     *
     * Worker network architecture options:
     *  - Private-only: Only set `privateSubnetIds`.
     *    - Default workers to run in a private subnet. In this setting, Kubernetes cannot create public, internet-facing load balancers for your pods.
     *  - Public-only: Only set `publicSubnetIds`.
     *    - Default workers to run in a public subnet.
     *  - Mixed (recommended): Set both `privateSubnetIds` and `publicSubnetIds`.
     *    - Default all worker nodes to run in private subnets, and use the public subnets for internet-facing load balancers.
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.Note: The use of `subnetIds`, along with `publicSubnetIds` and/or `privateSubnetIds` is mutually exclusive. The use of `publicSubnetIds` and `privateSubnetIds` is encouraged.
     */
    publicSubnetIds?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * Optional mappings from AWS IAM roles to Kubernetes users and groups. Only supported with authentication mode `CONFIG_MAP` or `API_AND_CONFIG_MAP`
     */
    roleMappings?: pulumi.Input<pulumi.Input<inputs.RoleMappingArgs>[]>;
    /**
     * IAM Service Role for EKS to use to manage the cluster.
     */
    serviceRole?: pulumi.Input<pulumiAws.iam.Role>;
    /**
     * If this toggle is set to true, the EKS cluster will be created without node group attached. Defaults to false, unless `fargate` or `autoMode` is enabled.
     */
    skipDefaultNodeGroup?: boolean;
    /**
     * If this toggle is set to true, the EKS cluster will be created without the default node and cluster security groups. Defaults to false, unless `autoMode` is enabled.
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html
     */
    skipDefaultSecurityGroups?: boolean;
    /**
     * An optional set of StorageClasses to enable for the cluster. If this is a single volume type rather than a map, a single StorageClass will be created for that volume type.
     *
     * Note: As of Kubernetes v1.11+ on EKS, a default `gp2` storage class will always be created automatically for the cluster by the EKS service. See https://docs.aws.amazon.com/eks/latest/userguide/storage-classes.html
     */
    storageClasses?: string | {[key: string]: inputs.StorageClassArgs};
    /**
     * The set of all subnets, public and private, to use for the worker node groups on the EKS cluster. These subnets are automatically tagged by EKS for Kubernetes purposes.
     *
     * If `vpcId` is not set, the cluster will use the AWS account's default VPC subnets.
     *
     * If the list of subnets includes both public and private subnets, the worker nodes will only be attached to the private subnets, and the public subnets will be used for internet-facing load balancers.
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.
     *
     * Note: The use of `subnetIds`, along with `publicSubnetIds` and/or `privateSubnetIds` is mutually exclusive. The use of `publicSubnetIds` and `privateSubnetIds` is encouraged.
     */
    subnetIds?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * Key-value mapping of tags that are automatically applied to all AWS resources directly under management with this cluster, which support tagging.
     */
    tags?: pulumi.Input<{[key: string]: pulumi.Input<string>}>;
    /**
     * Use the default VPC CNI instead of creating a custom one. Should not be used in conjunction with `vpcCniOptions`.
     */
    useDefaultVpcCni?: boolean;
    /**
     * Optional mappings from AWS IAM users to Kubernetes users and groups. Only supported with authentication mode `CONFIG_MAP` or `API_AND_CONFIG_MAP`.
     */
    userMappings?: pulumi.Input<pulumi.Input<inputs.UserMappingArgs>[]>;
    /**
     * Desired Kubernetes master / control plane version. If you do not specify a value, the latest available version is used.
     */
    version?: pulumi.Input<string>;
    /**
     * The configuration of the Amazon VPC CNI plugin for this instance. Defaults are described in the documentation for the VpcCniOptions type.
     */
    vpcCniOptions?: inputs.VpcCniOptionsArgs;
    /**
     * The VPC in which to create the cluster and its worker nodes. If unset, the cluster will be created in the default VPC.
     */
    vpcId?: pulumi.Input<string>;
}

export namespace Cluster {
    /**
     * The set of arguments for the Cluster.getKubeconfig method.
     */
    export interface GetKubeconfigArgs {
        /**
         * AWS credential profile name to always use instead of the default AWS credential provider chain.
         *
         * The profile is passed to kubeconfig as an authentication environment setting.
         */
        profileName?: pulumi.Input<string>;
        /**
         * Role ARN to assume instead of the default AWS credential provider chain.
         *
         * The role is passed to kubeconfig as an authentication exec argument.
         */
        roleArn?: pulumi.Input<string>;
    }

    /**
     * The results of the Cluster.getKubeconfig method.
     */
    export interface GetKubeconfigResult {
        /**
         * The kubeconfig for the cluster.
         */
        readonly result: string;
    }

}
