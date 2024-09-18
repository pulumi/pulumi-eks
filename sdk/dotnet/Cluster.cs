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
    /// Cluster is a component that wraps the AWS and Kubernetes resources necessary to run an EKS cluster, its worker nodes, its optional StorageClasses, and an optional deployment of the Kubernetes Dashboard.
    /// 
    /// ## Example Usage
    /// 
    /// ### Provisioning a New EKS Cluster
    /// 
    /// &lt;!--Start PulumiCodeChooser --&gt;
    /// 
    /// ```csharp
    ///  using System.Collections.Generic;
    ///  using Pulumi;
    ///  using Eks = Pulumi.Eks;
    ///  
    ///  return await Deployment.RunAsync(() =&gt;
    ///  {
    ///  	// Create an EKS cluster with the default configuration.
    /// 	var cluster = new Eks.Cluster("cluster");
    ///  
    ///  	return new Dictionary&lt;string, object?&gt;
    ///  	{
    ///  		// Export the cluster's kubeconfig.
    ///  		["kubeconfig"] = cluster.Kubeconfig,
    ///  	};
    ///  });
    /// 
    /// ```
    /// &lt;!--End PulumiCodeChooser --&gt;
    /// </summary>
    [EksResourceType("eks:index:Cluster")]
    public partial class Cluster : global::Pulumi.ComponentResource
    {
        /// <summary>
        /// The AWS resource provider.
        /// </summary>
        [Output("awsProvider")]
        public Output<Pulumi.Aws.Provider> AwsProvider { get; private set; } = null!;

        /// <summary>
        /// The security group for the EKS cluster.
        /// </summary>
        [Output("clusterSecurityGroup")]
        public Output<Pulumi.Aws.Ec2.SecurityGroup> ClusterSecurityGroup { get; private set; } = null!;

        /// <summary>
        /// The EKS cluster and its dependencies.
        /// </summary>
        [Output("core")]
        public Output<Outputs.CoreData> Core { get; private set; } = null!;

        /// <summary>
        /// The default Node Group configuration, or undefined if `skipDefaultNodeGroup` was specified.
        /// </summary>
        [Output("defaultNodeGroup")]
        public Output<Outputs.NodeGroupData?> DefaultNodeGroup { get; private set; } = null!;

        /// <summary>
        /// The EKS cluster.
        /// </summary>
        [Output("eksCluster")]
        public Output<Pulumi.Aws.Eks.Cluster> EksCluster { get; private set; } = null!;

        /// <summary>
        /// The ingress rule that gives node group access to cluster API server.
        /// </summary>
        [Output("eksClusterIngressRule")]
        public Output<Pulumi.Aws.Ec2.SecurityGroupRule> EksClusterIngressRule { get; private set; } = null!;

        /// <summary>
        /// The service roles used by the EKS cluster. Only supported with authentication mode `CONFIG_MAP` or `API_AND_CONFIG_MAP`.
        /// </summary>
        [Output("instanceRoles")]
        public Output<ImmutableArray<Pulumi.Aws.Iam.Role>> InstanceRoles { get; private set; } = null!;

        /// <summary>
        /// A kubeconfig that can be used to connect to the EKS cluster.
        /// </summary>
        [Output("kubeconfig")]
        public Output<object> Kubeconfig { get; private set; } = null!;

        /// <summary>
        /// A kubeconfig that can be used to connect to the EKS cluster as a JSON string.
        /// </summary>
        [Output("kubeconfigJson")]
        public Output<string> KubeconfigJson { get; private set; } = null!;

        /// <summary>
        /// The security group for the cluster's nodes.
        /// </summary>
        [Output("nodeSecurityGroup")]
        public Output<Pulumi.Aws.Ec2.SecurityGroup> NodeSecurityGroup { get; private set; } = null!;


        /// <summary>
        /// Create a Cluster resource with the given unique name, arguments, and options.
        /// </summary>
        ///
        /// <param name="name">The unique name of the resource</param>
        /// <param name="args">The arguments used to populate this resource's properties</param>
        /// <param name="options">A bag of options that control this resource's behavior</param>
        public Cluster(string name, ClusterArgs? args = null, ComponentResourceOptions? options = null)
            : base("eks:index:Cluster", name, args ?? new ClusterArgs(), MakeResourceOptions(options, ""), remote: true)
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

        /// <summary>
        /// Generate a kubeconfig for cluster authentication that does not use the default AWS credential provider chain, and instead is scoped to the supported options in `KubeconfigOptions`.
        /// 
        /// The kubeconfig generated is automatically stringified for ease of use with the pulumi/kubernetes provider.
        /// 
        /// See for more details:
        /// - https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
        /// - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html
        /// - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html
        /// </summary>
        public global::Pulumi.Output<string> GetKubeconfig(ClusterGetKubeconfigArgs? args = null)
            => global::Pulumi.Deployment.Instance.Call<ClusterGetKubeconfigResult>("eks:index:Cluster/getKubeconfig", args ?? new ClusterGetKubeconfigArgs(), this).Apply(v => v.Result);
    }

    public sealed class ClusterArgs : global::Pulumi.ResourceArgs
    {
        [Input("accessEntries")]
        private Dictionary<string, Inputs.AccessEntryArgs>? _accessEntries;

        /// <summary>
        /// Access entries to add to the EKS cluster. They can be used to allow IAM principals to access the cluster. Access entries are only supported with authentication mode `API` or `API_AND_CONFIG_MAP`.
        /// 
        /// See for more details:
        /// https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
        /// </summary>
        public Dictionary<string, Inputs.AccessEntryArgs> AccessEntries
        {
            get => _accessEntries ?? (_accessEntries = new Dictionary<string, Inputs.AccessEntryArgs>());
            set => _accessEntries = value;
        }

        /// <summary>
        /// The authentication mode of the cluster. Valid values are `CONFIG_MAP`, `API` or `API_AND_CONFIG_MAP`.
        /// 
        /// See for more details:
        /// https://docs.aws.amazon.com/eks/latest/userguide/grant-k8s-access.html#set-cam
        /// </summary>
        [Input("authenticationMode")]
        public Pulumi.Eks.AuthenticationMode? AuthenticationMode { get; set; }

        /// <summary>
        /// The security group to use for the cluster API endpoint. If not provided, a new security group will be created with full internet egress and ingress from node groups.
        /// 
        /// Note: The security group resource should not contain any inline ingress or egress rules.
        /// </summary>
        [Input("clusterSecurityGroup")]
        public Input<Pulumi.Aws.Ec2.SecurityGroup>? ClusterSecurityGroup { get; set; }

        [Input("clusterSecurityGroupTags")]
        private InputMap<string>? _clusterSecurityGroupTags;

        /// <summary>
        /// The tags to apply to the cluster security group.
        /// </summary>
        public InputMap<string> ClusterSecurityGroupTags
        {
            get => _clusterSecurityGroupTags ?? (_clusterSecurityGroupTags = new InputMap<string>());
            set => _clusterSecurityGroupTags = value;
        }

        [Input("clusterTags")]
        private InputMap<string>? _clusterTags;

        /// <summary>
        /// The tags to apply to the EKS cluster.
        /// </summary>
        public InputMap<string> ClusterTags
        {
            get => _clusterTags ?? (_clusterTags = new InputMap<string>());
            set => _clusterTags = value;
        }

        /// <summary>
        /// Options for managing the `coredns` addon.
        /// </summary>
        [Input("corednsAddonOptions")]
        public Inputs.CoreDnsAddonOptionsArgs? CorednsAddonOptions { get; set; }

        /// <summary>
        /// Indicates whether an IAM OIDC Provider is created for the EKS cluster.
        /// 
        /// The OIDC provider is used in the cluster in combination with k8s Service Account annotations to provide IAM roles at the k8s Pod level.
        /// 
        /// See for more details:
        ///  - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
        ///  - https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
        ///  - https://aws.amazon.com/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/
        ///  - https://www.pulumi.com/registry/packages/aws/api-docs/eks/cluster/#enabling-iam-roles-for-service-accounts
        /// </summary>
        [Input("createOidcProvider")]
        public Input<bool>? CreateOidcProvider { get; set; }

        /// <summary>
        /// The IAM Role Provider used to create &amp; authenticate against the EKS cluster. This role is given `[system:masters]` permission in K8S, See: https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html
        /// 
        /// Note: This option is only supported with Pulumi nodejs programs. Please use `ProviderCredentialOpts` as an alternative instead.
        /// </summary>
        [Input("creationRoleProvider")]
        public Inputs.CreationRoleProviderArgs? CreationRoleProvider { get; set; }

        [Input("defaultAddonsToRemove")]
        private InputList<string>? _defaultAddonsToRemove;

        /// <summary>
        /// List of addons to remove upon creation. Any addon listed will be "adopted" and then removed. This allows for the creation of a baremetal cluster where no addon is deployed and direct management of addons via Pulumi Kubernetes resources. Valid entries are kube-proxy, coredns and vpc-cni. Only works on first creation of a cluster.
        /// </summary>
        public InputList<string> DefaultAddonsToRemove
        {
            get => _defaultAddonsToRemove ?? (_defaultAddonsToRemove = new InputList<string>());
            set => _defaultAddonsToRemove = value;
        }

        /// <summary>
        /// The number of worker nodes that should be running in the cluster. Defaults to 2.
        /// </summary>
        [Input("desiredCapacity")]
        public Input<int>? DesiredCapacity { get; set; }

        /// <summary>
        /// Sets the 'enableConfigMapMutable' option on the cluster kubernetes provider.
        /// 
        /// Applies updates to the aws-auth ConfigMap in place over a replace operation if set to true.
        /// https://www.pulumi.com/registry/packages/kubernetes/api-docs/provider/#enableconfigmapmutable_nodejs
        /// </summary>
        [Input("enableConfigMapMutable")]
        public Input<bool>? EnableConfigMapMutable { get; set; }

        [Input("enabledClusterLogTypes")]
        private InputList<string>? _enabledClusterLogTypes;

        /// <summary>
        /// Enable EKS control plane logging. This sends logs to cloudwatch. Possible list of values are: ["api", "audit", "authenticator", "controllerManager", "scheduler"]. By default it is off.
        /// </summary>
        public InputList<string> EnabledClusterLogTypes
        {
            get => _enabledClusterLogTypes ?? (_enabledClusterLogTypes = new InputList<string>());
            set => _enabledClusterLogTypes = value;
        }

        /// <summary>
        /// KMS Key ARN to use with the encryption configuration for the cluster.
        /// 
        /// Only available on Kubernetes 1.13+ clusters created after March 6, 2020.
        /// See for more details:
        /// - https://aws.amazon.com/about-aws/whats-new/2020/03/amazon-eks-adds-envelope-encryption-for-secrets-with-aws-kms/
        /// </summary>
        [Input("encryptionConfigKeyArn")]
        public Input<string>? EncryptionConfigKeyArn { get; set; }

        /// <summary>
        /// Indicates whether or not the Amazon EKS private API server endpoint is enabled. Default is `false`.
        /// </summary>
        [Input("endpointPrivateAccess")]
        public Input<bool>? EndpointPrivateAccess { get; set; }

        /// <summary>
        /// Indicates whether or not the Amazon EKS public API server endpoint is enabled. Default is `true`.
        /// </summary>
        [Input("endpointPublicAccess")]
        public Input<bool>? EndpointPublicAccess { get; set; }

        /// <summary>
        /// Add support for launching pods in Fargate. Defaults to launching pods in the `default` namespace.  If specified, the default node group is skipped as though `skipDefaultNodeGroup: true` had been passed.
        /// </summary>
        [Input("fargate")]
        public InputUnion<bool, Inputs.FargateProfileArgs>? Fargate { get; set; }

        /// <summary>
        /// Use the latest recommended EKS Optimized Linux AMI with GPU support for the worker nodes from the AWS Systems Manager Parameter Store.
        /// 
        /// Defaults to false.
        /// 
        /// Note: `gpu` and `nodeAmiId` are mutually exclusive.
        /// 
        /// See for more details:
        /// - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
        /// - https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
        /// </summary>
        [Input("gpu")]
        public Input<bool>? Gpu { get; set; }

        /// <summary>
        /// The default IAM InstanceProfile to use on the Worker NodeGroups, if one is not already set in the NodeGroup.
        /// </summary>
        [Input("instanceProfileName")]
        public Input<string>? InstanceProfileName { get; set; }

        /// <summary>
        /// This enables the simple case of only registering a *single* IAM instance role with the cluster, that is required to be shared by *all* node groups in their instance profiles.
        /// 
        /// Note: options `instanceRole` and `instanceRoles` are mutually exclusive.
        /// </summary>
        [Input("instanceRole")]
        public Input<Pulumi.Aws.Iam.Role>? InstanceRole { get; set; }

        [Input("instanceRoles")]
        private InputList<Pulumi.Aws.Iam.Role>? _instanceRoles;

        /// <summary>
        /// This enables the advanced case of registering *many* IAM instance roles with the cluster for per node group IAM, instead of the simpler, shared case of `instanceRole`.
        /// 
        /// Note: options `instanceRole` and `instanceRoles` are mutually exclusive.
        /// </summary>
        public InputList<Pulumi.Aws.Iam.Role> InstanceRoles
        {
            get => _instanceRoles ?? (_instanceRoles = new InputList<Pulumi.Aws.Iam.Role>());
            set => _instanceRoles = value;
        }

        /// <summary>
        /// The instance type to use for the cluster's nodes. Defaults to "t2.medium".
        /// </summary>
        [Input("instanceType")]
        public Input<string>? InstanceType { get; set; }

        /// <summary>
        /// The IP family used to assign Kubernetes pod and service addresses. Valid values are `ipv4` (default) and `ipv6`.
        /// You can only specify an IP family when you create a cluster, changing this value will force a new cluster to be created.
        /// </summary>
        [Input("ipFamily")]
        public Input<string>? IpFamily { get; set; }

        /// <summary>
        /// Options for managing the `kube-proxy` addon.
        /// </summary>
        [Input("kubeProxyAddonOptions")]
        public Inputs.KubeProxyAddonOptionsArgs? KubeProxyAddonOptions { get; set; }

        /// <summary>
        /// The CIDR block to assign Kubernetes service IP addresses from. If you don't
        /// specify a block, Kubernetes assigns addresses from either the 10.100.0.0/16 or
        /// 172.20.0.0/16 CIDR blocks. This setting only applies to IPv4 clusters. We recommend that you specify a block
        /// that does not overlap with resources in other networks that are peered or connected to your VPC. You can only specify
        /// a custom CIDR block when you create a cluster, changing this value will force a new cluster to be created.
        /// 
        /// The block must meet the following requirements:
        /// - Within one of the following private IP address blocks: 10.0.0.0/8, 172.16.0.0.0/12, or 192.168.0.0/16.
        /// - Doesn't overlap with any CIDR block assigned to the VPC that you selected for VPC.
        /// - Between /24 and /12.
        /// </summary>
        [Input("kubernetesServiceIpAddressRange")]
        public Input<string>? KubernetesServiceIpAddressRange { get; set; }

        /// <summary>
        /// The maximum number of worker nodes running in the cluster. Defaults to 2.
        /// </summary>
        [Input("maxSize")]
        public Input<int>? MaxSize { get; set; }

        /// <summary>
        /// The minimum number of worker nodes running in the cluster. Defaults to 1.
        /// </summary>
        [Input("minSize")]
        public Input<int>? MinSize { get; set; }

        /// <summary>
        /// The cluster's physical resource name.
        /// 
        /// If not specified, the default is to use auto-naming for the cluster's name, resulting in a physical name with the format `${name}-eksCluster-0123abcd`.
        /// 
        /// See for more details: https://www.pulumi.com/docs/intro/concepts/programming-model/#autonaming
        /// </summary>
        [Input("name")]
        public Input<string>? Name { get; set; }

        /// <summary>
        /// The AMI ID to use for the worker nodes.
        /// 
        /// Defaults to the latest recommended EKS Optimized Linux AMI from the AWS Systems Manager Parameter Store.
        /// 
        /// Note: `nodeAmiId` and `gpu` are mutually exclusive.
        /// 
        /// See for more details:
        /// - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
        /// </summary>
        [Input("nodeAmiId")]
        public Input<string>? NodeAmiId { get; set; }

        /// <summary>
        /// Whether or not to auto-assign the EKS worker nodes public IP addresses. If this toggle is set to true, the EKS workers will be auto-assigned public IPs. If false, they will not be auto-assigned public IPs.
        /// </summary>
        [Input("nodeAssociatePublicIpAddress")]
        public bool? NodeAssociatePublicIpAddress { get; set; }

        /// <summary>
        /// The common configuration settings for NodeGroups.
        /// </summary>
        [Input("nodeGroupOptions")]
        public Inputs.ClusterNodeGroupOptionsArgs? NodeGroupOptions { get; set; }

        /// <summary>
        /// Public key material for SSH access to worker nodes. See allowed formats at:
        /// https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
        /// If not provided, no SSH access is enabled on VMs.
        /// </summary>
        [Input("nodePublicKey")]
        public Input<string>? NodePublicKey { get; set; }

        /// <summary>
        /// Encrypt the root block device of the nodes in the node group.
        /// </summary>
        [Input("nodeRootVolumeEncrypted")]
        public Input<bool>? NodeRootVolumeEncrypted { get; set; }

        /// <summary>
        /// The size in GiB of a cluster node's root volume. Defaults to 20.
        /// </summary>
        [Input("nodeRootVolumeSize")]
        public Input<int>? NodeRootVolumeSize { get; set; }

        [Input("nodeSecurityGroupTags")]
        private InputMap<string>? _nodeSecurityGroupTags;

        /// <summary>
        /// The tags to apply to the default `nodeSecurityGroup` created by the cluster.
        /// 
        /// Note: The `nodeSecurityGroupTags` option and the node group option `nodeSecurityGroup` are mutually exclusive.
        /// </summary>
        public InputMap<string> NodeSecurityGroupTags
        {
            get => _nodeSecurityGroupTags ?? (_nodeSecurityGroupTags = new InputMap<string>());
            set => _nodeSecurityGroupTags = value;
        }

        [Input("nodeSubnetIds")]
        private InputList<string>? _nodeSubnetIds;

        /// <summary>
        /// The subnets to use for worker nodes. Defaults to the value of subnetIds.
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

        [Input("privateSubnetIds")]
        private InputList<string>? _privateSubnetIds;

        /// <summary>
        /// The set of private subnets to use for the worker node groups on the EKS cluster. These subnets are automatically tagged by EKS for Kubernetes purposes.
        /// 
        /// If `vpcId` is not set, the cluster will use the AWS account's default VPC subnets.
        /// 
        /// Worker network architecture options:
        ///  - Private-only: Only set `privateSubnetIds`.
        ///    - Default workers to run in a private subnet. In this setting, Kubernetes cannot create public, internet-facing load balancers for your pods.
        ///  - Public-only: Only set `publicSubnetIds`.
        ///    - Default workers to run in a public subnet.
        ///  - Mixed (recommended): Set both `privateSubnetIds` and `publicSubnetIds`.
        ///    - Default all worker nodes to run in private subnets, and use the public subnets for internet-facing load balancers.
        /// 
        /// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.Note: The use of `subnetIds`, along with `publicSubnetIds` and/or `privateSubnetIds` is mutually exclusive. The use of `publicSubnetIds` and `privateSubnetIds` is encouraged.
        /// 
        /// Also consider setting `nodeAssociatePublicIpAddress: false` for fully private workers.
        /// </summary>
        public InputList<string> PrivateSubnetIds
        {
            get => _privateSubnetIds ?? (_privateSubnetIds = new InputList<string>());
            set => _privateSubnetIds = value;
        }

        /// <summary>
        /// The AWS provider credential options to scope the cluster's kubeconfig authentication when using a non-default credential chain.
        /// 
        /// This is required for certain auth scenarios. For example:
        /// - Creating and using a new AWS provider instance, or
        /// - Setting the AWS_PROFILE environment variable, or
        /// - Using a named profile configured on the AWS provider via:
        /// `pulumi config set aws:profile &lt;profileName&gt;`
        /// 
        /// See for more details:
        /// - https://www.pulumi.com/registry/packages/aws/api-docs/provider/
        /// - https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/
        /// - https://www.pulumi.com/docs/intro/cloud-providers/aws/#configuration
        /// - https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
        /// </summary>
        [Input("providerCredentialOpts")]
        public Input<Inputs.KubeconfigOptionsArgs>? ProviderCredentialOpts { get; set; }

        /// <summary>
        /// The HTTP(S) proxy to use within a proxied environment.
        /// 
        ///  The proxy is used during cluster creation, and OIDC configuration.
        /// 
        /// This is an alternative option to setting the proxy environment variables: HTTP(S)_PROXY and/or http(s)_proxy.
        /// 
        /// This option is required iff the proxy environment variables are not set.
        /// 
        /// Format:      &lt;protocol&gt;://&lt;host&gt;:&lt;port&gt;
        /// Auth Format: &lt;protocol&gt;://&lt;username&gt;:&lt;password&gt;@&lt;host&gt;:&lt;port&gt;
        /// 
        /// Ex:
        ///   - "http://proxy.example.com:3128"
        ///   - "https://proxy.example.com"
        ///   - "http://username:password@proxy.example.com:3128"
        /// </summary>
        [Input("proxy")]
        public string? Proxy { get; set; }

        [Input("publicAccessCidrs")]
        private InputList<string>? _publicAccessCidrs;

        /// <summary>
        /// Indicates which CIDR blocks can access the Amazon EKS public API server endpoint.
        /// </summary>
        public InputList<string> PublicAccessCidrs
        {
            get => _publicAccessCidrs ?? (_publicAccessCidrs = new InputList<string>());
            set => _publicAccessCidrs = value;
        }

        [Input("publicSubnetIds")]
        private InputList<string>? _publicSubnetIds;

        /// <summary>
        /// The set of public subnets to use for the worker node groups on the EKS cluster. These subnets are automatically tagged by EKS for Kubernetes purposes.
        /// 
        /// If `vpcId` is not set, the cluster will use the AWS account's default VPC subnets.
        /// 
        /// Worker network architecture options:
        ///  - Private-only: Only set `privateSubnetIds`.
        ///    - Default workers to run in a private subnet. In this setting, Kubernetes cannot create public, internet-facing load balancers for your pods.
        ///  - Public-only: Only set `publicSubnetIds`.
        ///    - Default workers to run in a public subnet.
        ///  - Mixed (recommended): Set both `privateSubnetIds` and `publicSubnetIds`.
        ///    - Default all worker nodes to run in private subnets, and use the public subnets for internet-facing load balancers.
        /// 
        /// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.Note: The use of `subnetIds`, along with `publicSubnetIds` and/or `privateSubnetIds` is mutually exclusive. The use of `publicSubnetIds` and `privateSubnetIds` is encouraged.
        /// </summary>
        public InputList<string> PublicSubnetIds
        {
            get => _publicSubnetIds ?? (_publicSubnetIds = new InputList<string>());
            set => _publicSubnetIds = value;
        }

        [Input("roleMappings")]
        private InputList<Inputs.RoleMappingArgs>? _roleMappings;

        /// <summary>
        /// Optional mappings from AWS IAM roles to Kubernetes users and groups. Only supported with authentication mode `CONFIG_MAP` or `API_AND_CONFIG_MAP`
        /// </summary>
        public InputList<Inputs.RoleMappingArgs> RoleMappings
        {
            get => _roleMappings ?? (_roleMappings = new InputList<Inputs.RoleMappingArgs>());
            set => _roleMappings = value;
        }

        /// <summary>
        /// IAM Service Role for EKS to use to manage the cluster.
        /// </summary>
        [Input("serviceRole")]
        public Input<Pulumi.Aws.Iam.Role>? ServiceRole { get; set; }

        /// <summary>
        /// If this toggle is set to true, the EKS cluster will be created without node group attached. Defaults to false, unless `fargate` input is provided.
        /// </summary>
        [Input("skipDefaultNodeGroup")]
        public bool? SkipDefaultNodeGroup { get; set; }

        /// <summary>
        /// An optional set of StorageClasses to enable for the cluster. If this is a single volume type rather than a map, a single StorageClass will be created for that volume type.
        /// 
        /// Note: As of Kubernetes v1.11+ on EKS, a default `gp2` storage class will always be created automatically for the cluster by the EKS service. See https://docs.aws.amazon.com/eks/latest/userguide/storage-classes.html
        /// </summary>
        [Input("storageClasses")]
        public Union<string, ImmutableDictionary<string, Inputs.StorageClassArgs>>? StorageClasses { get; set; }

        [Input("subnetIds")]
        private InputList<string>? _subnetIds;

        /// <summary>
        /// The set of all subnets, public and private, to use for the worker node groups on the EKS cluster. These subnets are automatically tagged by EKS for Kubernetes purposes.
        /// 
        /// If `vpcId` is not set, the cluster will use the AWS account's default VPC subnets.
        /// 
        /// If the list of subnets includes both public and private subnets, the worker nodes will only be attached to the private subnets, and the public subnets will be used for internet-facing load balancers.
        /// 
        /// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.
        /// 
        /// Note: The use of `subnetIds`, along with `publicSubnetIds` and/or `privateSubnetIds` is mutually exclusive. The use of `publicSubnetIds` and `privateSubnetIds` is encouraged.
        /// </summary>
        public InputList<string> SubnetIds
        {
            get => _subnetIds ?? (_subnetIds = new InputList<string>());
            set => _subnetIds = value;
        }

        [Input("tags")]
        private InputMap<string>? _tags;

        /// <summary>
        /// Key-value mapping of tags that are automatically applied to all AWS resources directly under management with this cluster, which support tagging.
        /// </summary>
        public InputMap<string> Tags
        {
            get => _tags ?? (_tags = new InputMap<string>());
            set => _tags = value;
        }

        /// <summary>
        /// Use the default VPC CNI instead of creating a custom one. Should not be used in conjunction with `vpcCniOptions`.
        /// </summary>
        [Input("useDefaultVpcCni")]
        public bool? UseDefaultVpcCni { get; set; }

        [Input("userMappings")]
        private InputList<Inputs.UserMappingArgs>? _userMappings;

        /// <summary>
        /// Optional mappings from AWS IAM users to Kubernetes users and groups. Only supported with authentication mode `CONFIG_MAP` or `API_AND_CONFIG_MAP`.
        /// </summary>
        public InputList<Inputs.UserMappingArgs> UserMappings
        {
            get => _userMappings ?? (_userMappings = new InputList<Inputs.UserMappingArgs>());
            set => _userMappings = value;
        }

        /// <summary>
        /// Desired Kubernetes master / control plane version. If you do not specify a value, the latest available version is used.
        /// </summary>
        [Input("version")]
        public Input<string>? Version { get; set; }

        /// <summary>
        /// The configuration of the Amazon VPC CNI plugin for this instance. Defaults are described in the documentation for the VpcCniOptions type.
        /// </summary>
        [Input("vpcCniOptions")]
        public Inputs.VpcCniOptionsArgs? VpcCniOptions { get; set; }

        /// <summary>
        /// The VPC in which to create the cluster and its worker nodes. If unset, the cluster will be created in the default VPC.
        /// </summary>
        [Input("vpcId")]
        public Input<string>? VpcId { get; set; }

        public ClusterArgs()
        {
        }
        public static new ClusterArgs Empty => new ClusterArgs();
    }

    /// <summary>
    /// The set of arguments for the <see cref="Cluster.GetKubeconfig"/> method.
    /// </summary>
    public sealed class ClusterGetKubeconfigArgs : global::Pulumi.CallArgs
    {
        /// <summary>
        /// AWS credential profile name to always use instead of the default AWS credential provider chain.
        /// 
        /// The profile is passed to kubeconfig as an authentication environment setting.
        /// </summary>
        [Input("profileName")]
        public Input<string>? ProfileName { get; set; }

        /// <summary>
        /// Role ARN to assume instead of the default AWS credential provider chain.
        /// 
        /// The role is passed to kubeconfig as an authentication exec argument.
        /// </summary>
        [Input("roleArn")]
        public Input<string>? RoleArn { get; set; }

        public ClusterGetKubeconfigArgs()
        {
        }
        public static new ClusterGetKubeconfigArgs Empty => new ClusterGetKubeconfigArgs();
    }

    /// <summary>
    /// The results of the <see cref="Cluster.GetKubeconfig"/> method.
    /// </summary>
    [OutputType]
    internal sealed class ClusterGetKubeconfigResult
    {
        /// <summary>
        /// The kubeconfig for the cluster.
        /// </summary>
        public readonly string Result;

        [OutputConstructor]
        private ClusterGetKubeconfigResult(string result)
        {
            Result = result;
        }
    }
}
