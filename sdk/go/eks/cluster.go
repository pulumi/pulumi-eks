// Code generated by pulumi-gen-eks DO NOT EDIT.
// *** WARNING: Do not edit by hand unless you're certain you know what you are doing! ***

package eks

import (
	"context"
	"reflect"

	"github.com/pulumi/pulumi-aws/sdk/v5/go/aws"
	"github.com/pulumi/pulumi-aws/sdk/v5/go/aws/ec2"
	"github.com/pulumi/pulumi-aws/sdk/v5/go/aws/eks"
	"github.com/pulumi/pulumi-aws/sdk/v5/go/aws/iam"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

// Cluster is a component that wraps the AWS and Kubernetes resources necessary to run an EKS cluster, its worker nodes, its optional StorageClasses, and an optional deployment of the Kubernetes Dashboard.
type Cluster struct {
	pulumi.ResourceState

	// The AWS resource provider.
	AwsProvider aws.ProviderOutput `pulumi:"awsProvider"`
	// The security group for the EKS cluster.
	ClusterSecurityGroup ec2.SecurityGroupOutput `pulumi:"clusterSecurityGroup"`
	// The EKS cluster and its dependencies.
	Core CoreDataOutput `pulumi:"core"`
	// The default Node Group configuration, or undefined if `skipDefaultNodeGroup` was specified.
	DefaultNodeGroup NodeGroupDataPtrOutput `pulumi:"defaultNodeGroup"`
	// The EKS cluster.
	EksCluster eks.ClusterOutput `pulumi:"eksCluster"`
	// The ingress rule that gives node group access to cluster API server.
	EksClusterIngressRule ec2.SecurityGroupRuleOutput `pulumi:"eksClusterIngressRule"`
	// The service roles used by the EKS cluster.
	InstanceRoles iam.RoleArrayOutput `pulumi:"instanceRoles"`
	// A kubeconfig that can be used to connect to the EKS cluster.
	Kubeconfig pulumi.AnyOutput `pulumi:"kubeconfig"`
	// A kubeconfig that can be used to connect to the EKS cluster as a JSON string.
	KubeconfigJson pulumi.StringOutput `pulumi:"kubeconfigJson"`
	// The security group for the cluster's nodes.
	NodeSecurityGroup ec2.SecurityGroupOutput `pulumi:"nodeSecurityGroup"`
}

// NewCluster registers a new resource with the given unique name, arguments, and options.
func NewCluster(ctx *pulumi.Context,
	name string, args *ClusterArgs, opts ...pulumi.ResourceOption) (*Cluster, error) {
	if args == nil {
		args = &ClusterArgs{}
	}

	var resource Cluster
	err := ctx.RegisterRemoteComponentResource("eks:index:Cluster", name, args, &resource, opts...)
	if err != nil {
		return nil, err
	}
	return &resource, nil
}

type clusterArgs struct {
	// The security group to use for the cluster API endpoint. If not provided, a new security group will be created with full internet egress and ingress from node groups.
	ClusterSecurityGroup *ec2.SecurityGroup `pulumi:"clusterSecurityGroup"`
	// The tags to apply to the cluster security group.
	ClusterSecurityGroupTags map[string]string `pulumi:"clusterSecurityGroupTags"`
	// The tags to apply to the EKS cluster.
	ClusterTags map[string]string `pulumi:"clusterTags"`
	// Indicates whether an IAM OIDC Provider is created for the EKS cluster.
	//
	// The OIDC provider is used in the cluster in combination with k8s Service Account annotations to provide IAM roles at the k8s Pod level.
	//
	// See for more details:
	//  - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
	//  - https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
	//  - https://aws.amazon.com/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/
	//  - https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/aws/eks/#enabling-iam-roles-for-service-accounts
	CreateOidcProvider *bool `pulumi:"createOidcProvider"`
	// The IAM Role Provider used to create & authenticate against the EKS cluster. This role is given `[system:masters]` permission in K8S, See: https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html
	CreationRoleProvider *CreationRoleProvider `pulumi:"creationRoleProvider"`
	// List of addons to remove upon creation. Any addon listed will be "adopted" and then removed. This allows for the creation of a baremetal cluster where no addon is deployed and direct management of addons via Pulumi Kubernetes resources. Valid entries are kube-proxy, coredns and vpc-cni. Only works on first creation of a cluster.
	DefaultAddonsToRemove []string `pulumi:"defaultAddonsToRemove"`
	// The number of worker nodes that should be running in the cluster. Defaults to 2.
	DesiredCapacity *int `pulumi:"desiredCapacity"`
	// Enable EKS control plane logging. This sends logs to cloudwatch. Possible list of values are: ["api", "audit", "authenticator", "controllerManager", "scheduler"]. By default it is off.
	EnabledClusterLogTypes []string `pulumi:"enabledClusterLogTypes"`
	// Encrypt the root block device of the nodes in the node group.
	EncryptRootBlockDevice *bool `pulumi:"encryptRootBlockDevice"`
	// KMS Key ARN to use with the encryption configuration for the cluster.
	//
	// Only available on Kubernetes 1.13+ clusters created after March 6, 2020.
	// See for more details:
	// - https://aws.amazon.com/about-aws/whats-new/2020/03/amazon-eks-adds-envelope-encryption-for-secrets-with-aws-kms/
	EncryptionConfigKeyArn *string `pulumi:"encryptionConfigKeyArn"`
	// Indicates whether or not the Amazon EKS private API server endpoint is enabled. Default is `false`.
	EndpointPrivateAccess *bool `pulumi:"endpointPrivateAccess"`
	// Indicates whether or not the Amazon EKS public API server endpoint is enabled. Default is `true`.
	EndpointPublicAccess *bool `pulumi:"endpointPublicAccess"`
	// Add support for launching pods in Fargate. Defaults to launching pods in the `default` namespace.  If specified, the default node group is skipped as though `skipDefaultNodeGroup: true` had been passed.
	Fargate interface{} `pulumi:"fargate"`
	// Use the latest recommended EKS Optimized Linux AMI with GPU support for the worker nodes from the AWS Systems Manager Parameter Store.
	//
	// Defaults to false.
	//
	// Note: `gpu` and `nodeAmiId` are mutually exclusive.
	//
	// See for more details:
	// - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
	// - https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
	Gpu *bool `pulumi:"gpu"`
	// The default IAM InstanceProfile to use on the Worker NodeGroups, if one is not already set in the NodeGroup.
	InstanceProfileName *string `pulumi:"instanceProfileName"`
	// This enables the simple case of only registering a *single* IAM instance role with the cluster, that is required to be shared by *all* node groups in their instance profiles.
	//
	// Note: options `instanceRole` and `instanceRoles` are mutually exclusive.
	InstanceRole *iam.Role `pulumi:"instanceRole"`
	// This enables the advanced case of registering *many* IAM instance roles with the cluster for per node group IAM, instead of the simpler, shared case of `instanceRole`.
	//
	// Note: options `instanceRole` and `instanceRoles` are mutually exclusive.
	InstanceRoles []*iam.Role `pulumi:"instanceRoles"`
	// The instance type to use for the cluster's nodes. Defaults to "t2.medium".
	InstanceType *string `pulumi:"instanceType"`
	// The CIDR block to assign Kubernetes service IP addresses from. If you don't
	// specify a block, Kubernetes assigns addresses from either the 10.100.0.0/16 or
	// 172.20.0.0/16 CIDR blocks. We recommend that you specify a block that does not overlap
	// with resources in other networks that are peered or connected to your VPC. You can only specify
	// a custom CIDR block when you create a cluster, changing this value will force a new cluster to be created.
	//
	// The block must meet the following requirements:
	// - Within one of the following private IP address blocks: 10.0.0.0/8, 172.16.0.0.0/12, or 192.168.0.0/16.
	// - Doesn't overlap with any CIDR block assigned to the VPC that you selected for VPC.
	// - Between /24 and /12.
	KubernetesServiceIpAddressRange *string `pulumi:"kubernetesServiceIpAddressRange"`
	// The maximum number of worker nodes running in the cluster. Defaults to 2.
	MaxSize *int `pulumi:"maxSize"`
	// The minimum number of worker nodes running in the cluster. Defaults to 1.
	MinSize *int `pulumi:"minSize"`
	// The cluster's physical resource name.
	//
	// If not specified, the default is to use auto-naming for the cluster's name, resulting in a physical name with the format `${name}-eksCluster-0123abcd`.
	//
	// See for more details: https://www.pulumi.com/docs/intro/concepts/programming-model/#autonaming
	Name *string `pulumi:"name"`
	// The AMI ID to use for the worker nodes.
	//
	// Defaults to the latest recommended EKS Optimized Linux AMI from the AWS Systems Manager Parameter Store.
	//
	// Note: `nodeAmiId` and `gpu` are mutually exclusive.
	//
	// See for more details:
	// - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
	NodeAmiId *string `pulumi:"nodeAmiId"`
	// Whether or not to auto-assign the EKS worker nodes public IP addresses. If this toggle is set to true, the EKS workers will be auto-assigned public IPs. If false, they will not be auto-assigned public IPs.
	NodeAssociatePublicIpAddress *bool `pulumi:"nodeAssociatePublicIpAddress"`
	// The common configuration settings for NodeGroups.
	NodeGroupOptions *ClusterNodeGroupOptions `pulumi:"nodeGroupOptions"`
	// Public key material for SSH access to worker nodes. See allowed formats at:
	// https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
	// If not provided, no SSH access is enabled on VMs.
	NodePublicKey *string `pulumi:"nodePublicKey"`
	// The size in GiB of a cluster node's root volume. Defaults to 20.
	NodeRootVolumeSize *int `pulumi:"nodeRootVolumeSize"`
	// The tags to apply to the default `nodeSecurityGroup` created by the cluster.
	//
	// Note: The `nodeSecurityGroupTags` option and the node group option `nodeSecurityGroup` are mutually exclusive.
	NodeSecurityGroupTags map[string]string `pulumi:"nodeSecurityGroupTags"`
	// The subnets to use for worker nodes. Defaults to the value of subnetIds.
	NodeSubnetIds []string `pulumi:"nodeSubnetIds"`
	// Extra code to run on node startup. This code will run after the AWS EKS bootstrapping code and before the node signals its readiness to the managing CloudFormation stack. This code must be a typical user data script: critically it must begin with an interpreter directive (i.e. a `#!`).
	NodeUserData *string `pulumi:"nodeUserData"`
	// The set of private subnets to use for the worker node groups on the EKS cluster. These subnets are automatically tagged by EKS for Kubernetes purposes.
	//
	// If `vpcId` is not set, the cluster will use the AWS account's default VPC subnets.
	//
	// Worker network architecture options:
	//  - Private-only: Only set `privateSubnetIds`.
	//    - Default workers to run in a private subnet. In this setting, Kubernetes cannot create public, internet-facing load balancers for your pods.
	//  - Public-only: Only set `publicSubnetIds`.
	//    - Default workers to run in a public subnet.
	//  - Mixed (recommended): Set both `privateSubnetIds` and `publicSubnetIds`.
	//    - Default all worker nodes to run in private subnets, and use the public subnets for internet-facing load balancers.
	//
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.Note: The use of `subnetIds`, along with `publicSubnetIds` and/or `privateSubnetIds` is mutually exclusive. The use of `publicSubnetIds` and `privateSubnetIds` is encouraged.
	//
	// Also consider setting `nodeAssociatePublicIpAddress: false` for fully private workers.
	PrivateSubnetIds []string `pulumi:"privateSubnetIds"`
	// The AWS provider credential options to scope the cluster's kubeconfig authentication when using a non-default credential chain.
	//
	// This is required for certain auth scenarios. For example:
	// - Creating and using a new AWS provider instance, or
	// - Setting the AWS_PROFILE environment variable, or
	// - Using a named profile configured on the AWS provider via:
	//   `pulumi config set aws:profile <profileName>`
	//
	// See for more details:
	// - https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/aws/#Provider
	// - https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/
	// - https://www.pulumi.com/docs/intro/cloud-providers/aws/#configuration
	// - https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
	ProviderCredentialOpts *KubeconfigOptions `pulumi:"providerCredentialOpts"`
	// The HTTP(S) proxy to use within a proxied environment.
	//
	//  The proxy is used during cluster creation, and OIDC configuration.
	//
	// This is an alternative option to setting the proxy environment variables: HTTP(S)_PROXY and/or http(s)_proxy.
	//
	// This option is required iff the proxy environment variables are not set.
	//
	// Format:      <protocol>://<host>:<port>
	// Auth Format: <protocol>://<username>:<password>@<host>:<port>
	//
	// Ex:
	//   - "http://proxy.example.com:3128"
	//   - "https://proxy.example.com"
	//   - "http://username:password@proxy.example.com:3128"
	Proxy *string `pulumi:"proxy"`
	// Indicates which CIDR blocks can access the Amazon EKS public API server endpoint.
	PublicAccessCidrs []string `pulumi:"publicAccessCidrs"`
	// The set of public subnets to use for the worker node groups on the EKS cluster. These subnets are automatically tagged by EKS for Kubernetes purposes.
	//
	// If `vpcId` is not set, the cluster will use the AWS account's default VPC subnets.
	//
	// Worker network architecture options:
	//  - Private-only: Only set `privateSubnetIds`.
	//    - Default workers to run in a private subnet. In this setting, Kubernetes cannot create public, internet-facing load balancers for your pods.
	//  - Public-only: Only set `publicSubnetIds`.
	//    - Default workers to run in a public subnet.
	//  - Mixed (recommended): Set both `privateSubnetIds` and `publicSubnetIds`.
	//    - Default all worker nodes to run in private subnets, and use the public subnets for internet-facing load balancers.
	//
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.Note: The use of `subnetIds`, along with `publicSubnetIds` and/or `privateSubnetIds` is mutually exclusive. The use of `publicSubnetIds` and `privateSubnetIds` is encouraged.
	PublicSubnetIds []string `pulumi:"publicSubnetIds"`
	// Optional mappings from AWS IAM roles to Kubernetes users and groups.
	RoleMappings []RoleMapping `pulumi:"roleMappings"`
	// IAM Service Role for EKS to use to manage the cluster.
	ServiceRole *iam.Role `pulumi:"serviceRole"`
	// If this toggle is set to true, the EKS cluster will be created without node group attached. Defaults to false, unless `fargate` input is provided.
	SkipDefaultNodeGroup *bool `pulumi:"skipDefaultNodeGroup"`
	// An optional set of StorageClasses to enable for the cluster. If this is a single volume type rather than a map, a single StorageClass will be created for that volume type.
	//
	// Note: As of Kubernetes v1.11+ on EKS, a default `gp2` storage class will always be created automatically for the cluster by the EKS service. See https://docs.aws.amazon.com/eks/latest/userguide/storage-classes.html
	StorageClasses interface{} `pulumi:"storageClasses"`
	// The set of all subnets, public and private, to use for the worker node groups on the EKS cluster. These subnets are automatically tagged by EKS for Kubernetes purposes.
	//
	// If `vpcId` is not set, the cluster will use the AWS account's default VPC subnets.
	//
	// If the list of subnets includes both public and private subnets, the worker nodes will only be attached to the private subnets, and the public subnets will be used for internet-facing load balancers.
	//
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.
	//
	// Note: The use of `subnetIds`, along with `publicSubnetIds` and/or `privateSubnetIds` is mutually exclusive. The use of `publicSubnetIds` and `privateSubnetIds` is encouraged.
	SubnetIds []string `pulumi:"subnetIds"`
	// Key-value mapping of tags that are automatically applied to all AWS resources directly under management with this cluster, which support tagging.
	Tags map[string]string `pulumi:"tags"`
	// Use the default VPC CNI instead of creating a custom one. Should not be used in conjunction with `vpcCniOptions`.
	UseDefaultVpcCni *bool `pulumi:"useDefaultVpcCni"`
	// Optional mappings from AWS IAM users to Kubernetes users and groups.
	UserMappings []UserMapping `pulumi:"userMappings"`
	// Desired Kubernetes master / control plane version. If you do not specify a value, the latest available version is used.
	Version *string `pulumi:"version"`
	// The configuration of the Amazon VPC CNI plugin for this instance. Defaults are described in the documentation for the VpcCniOptions type.
	VpcCniOptions *VpcCniOptions `pulumi:"vpcCniOptions"`
	// The VPC in which to create the cluster and its worker nodes. If unset, the cluster will be created in the default VPC.
	VpcId *string `pulumi:"vpcId"`
}

// The set of arguments for constructing a Cluster resource.
type ClusterArgs struct {
	// The security group to use for the cluster API endpoint. If not provided, a new security group will be created with full internet egress and ingress from node groups.
	ClusterSecurityGroup ec2.SecurityGroupInput
	// The tags to apply to the cluster security group.
	ClusterSecurityGroupTags pulumi.StringMapInput
	// The tags to apply to the EKS cluster.
	ClusterTags pulumi.StringMapInput
	// Indicates whether an IAM OIDC Provider is created for the EKS cluster.
	//
	// The OIDC provider is used in the cluster in combination with k8s Service Account annotations to provide IAM roles at the k8s Pod level.
	//
	// See for more details:
	//  - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
	//  - https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
	//  - https://aws.amazon.com/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/
	//  - https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/aws/eks/#enabling-iam-roles-for-service-accounts
	CreateOidcProvider pulumi.BoolPtrInput
	// The IAM Role Provider used to create & authenticate against the EKS cluster. This role is given `[system:masters]` permission in K8S, See: https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html
	CreationRoleProvider *CreationRoleProviderArgs
	// List of addons to remove upon creation. Any addon listed will be "adopted" and then removed. This allows for the creation of a baremetal cluster where no addon is deployed and direct management of addons via Pulumi Kubernetes resources. Valid entries are kube-proxy, coredns and vpc-cni. Only works on first creation of a cluster.
	DefaultAddonsToRemove pulumi.StringArrayInput
	// The number of worker nodes that should be running in the cluster. Defaults to 2.
	DesiredCapacity pulumi.IntPtrInput
	// Enable EKS control plane logging. This sends logs to cloudwatch. Possible list of values are: ["api", "audit", "authenticator", "controllerManager", "scheduler"]. By default it is off.
	EnabledClusterLogTypes pulumi.StringArrayInput
	// Encrypt the root block device of the nodes in the node group.
	EncryptRootBlockDevice pulumi.BoolPtrInput
	// KMS Key ARN to use with the encryption configuration for the cluster.
	//
	// Only available on Kubernetes 1.13+ clusters created after March 6, 2020.
	// See for more details:
	// - https://aws.amazon.com/about-aws/whats-new/2020/03/amazon-eks-adds-envelope-encryption-for-secrets-with-aws-kms/
	EncryptionConfigKeyArn pulumi.StringPtrInput
	// Indicates whether or not the Amazon EKS private API server endpoint is enabled. Default is `false`.
	EndpointPrivateAccess pulumi.BoolPtrInput
	// Indicates whether or not the Amazon EKS public API server endpoint is enabled. Default is `true`.
	EndpointPublicAccess pulumi.BoolPtrInput
	// Add support for launching pods in Fargate. Defaults to launching pods in the `default` namespace.  If specified, the default node group is skipped as though `skipDefaultNodeGroup: true` had been passed.
	Fargate pulumi.Input
	// Use the latest recommended EKS Optimized Linux AMI with GPU support for the worker nodes from the AWS Systems Manager Parameter Store.
	//
	// Defaults to false.
	//
	// Note: `gpu` and `nodeAmiId` are mutually exclusive.
	//
	// See for more details:
	// - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
	// - https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
	Gpu pulumi.BoolPtrInput
	// The default IAM InstanceProfile to use on the Worker NodeGroups, if one is not already set in the NodeGroup.
	InstanceProfileName pulumi.StringPtrInput
	// This enables the simple case of only registering a *single* IAM instance role with the cluster, that is required to be shared by *all* node groups in their instance profiles.
	//
	// Note: options `instanceRole` and `instanceRoles` are mutually exclusive.
	InstanceRole iam.RoleInput
	// This enables the advanced case of registering *many* IAM instance roles with the cluster for per node group IAM, instead of the simpler, shared case of `instanceRole`.
	//
	// Note: options `instanceRole` and `instanceRoles` are mutually exclusive.
	InstanceRoles iam.RoleArrayInput
	// The instance type to use for the cluster's nodes. Defaults to "t2.medium".
	InstanceType pulumi.StringPtrInput
	// The CIDR block to assign Kubernetes service IP addresses from. If you don't
	// specify a block, Kubernetes assigns addresses from either the 10.100.0.0/16 or
	// 172.20.0.0/16 CIDR blocks. We recommend that you specify a block that does not overlap
	// with resources in other networks that are peered or connected to your VPC. You can only specify
	// a custom CIDR block when you create a cluster, changing this value will force a new cluster to be created.
	//
	// The block must meet the following requirements:
	// - Within one of the following private IP address blocks: 10.0.0.0/8, 172.16.0.0.0/12, or 192.168.0.0/16.
	// - Doesn't overlap with any CIDR block assigned to the VPC that you selected for VPC.
	// - Between /24 and /12.
	KubernetesServiceIpAddressRange pulumi.StringPtrInput
	// The maximum number of worker nodes running in the cluster. Defaults to 2.
	MaxSize pulumi.IntPtrInput
	// The minimum number of worker nodes running in the cluster. Defaults to 1.
	MinSize pulumi.IntPtrInput
	// The cluster's physical resource name.
	//
	// If not specified, the default is to use auto-naming for the cluster's name, resulting in a physical name with the format `${name}-eksCluster-0123abcd`.
	//
	// See for more details: https://www.pulumi.com/docs/intro/concepts/programming-model/#autonaming
	Name pulumi.StringPtrInput
	// The AMI ID to use for the worker nodes.
	//
	// Defaults to the latest recommended EKS Optimized Linux AMI from the AWS Systems Manager Parameter Store.
	//
	// Note: `nodeAmiId` and `gpu` are mutually exclusive.
	//
	// See for more details:
	// - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
	NodeAmiId pulumi.StringPtrInput
	// Whether or not to auto-assign the EKS worker nodes public IP addresses. If this toggle is set to true, the EKS workers will be auto-assigned public IPs. If false, they will not be auto-assigned public IPs.
	NodeAssociatePublicIpAddress *bool
	// The common configuration settings for NodeGroups.
	NodeGroupOptions *ClusterNodeGroupOptionsArgs
	// Public key material for SSH access to worker nodes. See allowed formats at:
	// https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
	// If not provided, no SSH access is enabled on VMs.
	NodePublicKey pulumi.StringPtrInput
	// The size in GiB of a cluster node's root volume. Defaults to 20.
	NodeRootVolumeSize pulumi.IntPtrInput
	// The tags to apply to the default `nodeSecurityGroup` created by the cluster.
	//
	// Note: The `nodeSecurityGroupTags` option and the node group option `nodeSecurityGroup` are mutually exclusive.
	NodeSecurityGroupTags pulumi.StringMapInput
	// The subnets to use for worker nodes. Defaults to the value of subnetIds.
	NodeSubnetIds pulumi.StringArrayInput
	// Extra code to run on node startup. This code will run after the AWS EKS bootstrapping code and before the node signals its readiness to the managing CloudFormation stack. This code must be a typical user data script: critically it must begin with an interpreter directive (i.e. a `#!`).
	NodeUserData pulumi.StringPtrInput
	// The set of private subnets to use for the worker node groups on the EKS cluster. These subnets are automatically tagged by EKS for Kubernetes purposes.
	//
	// If `vpcId` is not set, the cluster will use the AWS account's default VPC subnets.
	//
	// Worker network architecture options:
	//  - Private-only: Only set `privateSubnetIds`.
	//    - Default workers to run in a private subnet. In this setting, Kubernetes cannot create public, internet-facing load balancers for your pods.
	//  - Public-only: Only set `publicSubnetIds`.
	//    - Default workers to run in a public subnet.
	//  - Mixed (recommended): Set both `privateSubnetIds` and `publicSubnetIds`.
	//    - Default all worker nodes to run in private subnets, and use the public subnets for internet-facing load balancers.
	//
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.Note: The use of `subnetIds`, along with `publicSubnetIds` and/or `privateSubnetIds` is mutually exclusive. The use of `publicSubnetIds` and `privateSubnetIds` is encouraged.
	//
	// Also consider setting `nodeAssociatePublicIpAddress: false` for fully private workers.
	PrivateSubnetIds pulumi.StringArrayInput
	// The AWS provider credential options to scope the cluster's kubeconfig authentication when using a non-default credential chain.
	//
	// This is required for certain auth scenarios. For example:
	// - Creating and using a new AWS provider instance, or
	// - Setting the AWS_PROFILE environment variable, or
	// - Using a named profile configured on the AWS provider via:
	//   `pulumi config set aws:profile <profileName>`
	//
	// See for more details:
	// - https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/aws/#Provider
	// - https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/
	// - https://www.pulumi.com/docs/intro/cloud-providers/aws/#configuration
	// - https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
	ProviderCredentialOpts KubeconfigOptionsPtrInput
	// The HTTP(S) proxy to use within a proxied environment.
	//
	//  The proxy is used during cluster creation, and OIDC configuration.
	//
	// This is an alternative option to setting the proxy environment variables: HTTP(S)_PROXY and/or http(s)_proxy.
	//
	// This option is required iff the proxy environment variables are not set.
	//
	// Format:      <protocol>://<host>:<port>
	// Auth Format: <protocol>://<username>:<password>@<host>:<port>
	//
	// Ex:
	//   - "http://proxy.example.com:3128"
	//   - "https://proxy.example.com"
	//   - "http://username:password@proxy.example.com:3128"
	Proxy *string
	// Indicates which CIDR blocks can access the Amazon EKS public API server endpoint.
	PublicAccessCidrs pulumi.StringArrayInput
	// The set of public subnets to use for the worker node groups on the EKS cluster. These subnets are automatically tagged by EKS for Kubernetes purposes.
	//
	// If `vpcId` is not set, the cluster will use the AWS account's default VPC subnets.
	//
	// Worker network architecture options:
	//  - Private-only: Only set `privateSubnetIds`.
	//    - Default workers to run in a private subnet. In this setting, Kubernetes cannot create public, internet-facing load balancers for your pods.
	//  - Public-only: Only set `publicSubnetIds`.
	//    - Default workers to run in a public subnet.
	//  - Mixed (recommended): Set both `privateSubnetIds` and `publicSubnetIds`.
	//    - Default all worker nodes to run in private subnets, and use the public subnets for internet-facing load balancers.
	//
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.Note: The use of `subnetIds`, along with `publicSubnetIds` and/or `privateSubnetIds` is mutually exclusive. The use of `publicSubnetIds` and `privateSubnetIds` is encouraged.
	PublicSubnetIds pulumi.StringArrayInput
	// Optional mappings from AWS IAM roles to Kubernetes users and groups.
	RoleMappings RoleMappingArrayInput
	// IAM Service Role for EKS to use to manage the cluster.
	ServiceRole iam.RoleInput
	// If this toggle is set to true, the EKS cluster will be created without node group attached. Defaults to false, unless `fargate` input is provided.
	SkipDefaultNodeGroup *bool
	// An optional set of StorageClasses to enable for the cluster. If this is a single volume type rather than a map, a single StorageClass will be created for that volume type.
	//
	// Note: As of Kubernetes v1.11+ on EKS, a default `gp2` storage class will always be created automatically for the cluster by the EKS service. See https://docs.aws.amazon.com/eks/latest/userguide/storage-classes.html
	StorageClasses interface{}
	// The set of all subnets, public and private, to use for the worker node groups on the EKS cluster. These subnets are automatically tagged by EKS for Kubernetes purposes.
	//
	// If `vpcId` is not set, the cluster will use the AWS account's default VPC subnets.
	//
	// If the list of subnets includes both public and private subnets, the worker nodes will only be attached to the private subnets, and the public subnets will be used for internet-facing load balancers.
	//
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.
	//
	// Note: The use of `subnetIds`, along with `publicSubnetIds` and/or `privateSubnetIds` is mutually exclusive. The use of `publicSubnetIds` and `privateSubnetIds` is encouraged.
	SubnetIds pulumi.StringArrayInput
	// Key-value mapping of tags that are automatically applied to all AWS resources directly under management with this cluster, which support tagging.
	Tags pulumi.StringMapInput
	// Use the default VPC CNI instead of creating a custom one. Should not be used in conjunction with `vpcCniOptions`.
	UseDefaultVpcCni *bool
	// Optional mappings from AWS IAM users to Kubernetes users and groups.
	UserMappings UserMappingArrayInput
	// Desired Kubernetes master / control plane version. If you do not specify a value, the latest available version is used.
	Version pulumi.StringPtrInput
	// The configuration of the Amazon VPC CNI plugin for this instance. Defaults are described in the documentation for the VpcCniOptions type.
	VpcCniOptions *VpcCniOptionsArgs
	// The VPC in which to create the cluster and its worker nodes. If unset, the cluster will be created in the default VPC.
	VpcId pulumi.StringPtrInput
}

func (ClusterArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*clusterArgs)(nil)).Elem()
}

// Generate a kubeconfig for cluster authentication that does not use the default AWS credential provider chain, and instead is scoped to the supported options in `KubeconfigOptions`.
//
// The kubeconfig generated is automatically stringified for ease of use with the pulumi/kubernetes provider.
//
// See for more details:
// - https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
// - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html
// - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html
func (r *Cluster) GetKubeconfig(ctx *pulumi.Context, args *ClusterGetKubeconfigArgs) (pulumi.StringOutput, error) {
	out, err := ctx.Call("eks:index:Cluster/getKubeconfig", args, clusterGetKubeconfigResultOutput{}, r)
	if err != nil {
		return pulumi.StringOutput{}, err
	}
	return out.(clusterGetKubeconfigResultOutput).Result(), nil
}

type clusterGetKubeconfigArgs struct {
	// AWS credential profile name to always use instead of the default AWS credential provider chain.
	//
	// The profile is passed to kubeconfig as an authentication environment setting.
	ProfileName *string `pulumi:"profileName"`
	// Role ARN to assume instead of the default AWS credential provider chain.
	//
	// The role is passed to kubeconfig as an authentication exec argument.
	RoleArn *string `pulumi:"roleArn"`
}

// The set of arguments for the GetKubeconfig method of the Cluster resource.
type ClusterGetKubeconfigArgs struct {
	// AWS credential profile name to always use instead of the default AWS credential provider chain.
	//
	// The profile is passed to kubeconfig as an authentication environment setting.
	ProfileName pulumi.StringPtrInput
	// Role ARN to assume instead of the default AWS credential provider chain.
	//
	// The role is passed to kubeconfig as an authentication exec argument.
	RoleArn pulumi.StringPtrInput
}

func (ClusterGetKubeconfigArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*clusterGetKubeconfigArgs)(nil)).Elem()
}

type clusterGetKubeconfigResult struct {
	Result string `pulumi:"result"`
}

type clusterGetKubeconfigResultOutput struct{ *pulumi.OutputState }

func (clusterGetKubeconfigResultOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*clusterGetKubeconfigResult)(nil)).Elem()
}

func (o clusterGetKubeconfigResultOutput) Result() pulumi.StringOutput {
	return o.ApplyT(func(v clusterGetKubeconfigResult) string { return v.Result }).(pulumi.StringOutput)
}

type ClusterInput interface {
	pulumi.Input

	ToClusterOutput() ClusterOutput
	ToClusterOutputWithContext(ctx context.Context) ClusterOutput
}

func (*Cluster) ElementType() reflect.Type {
	return reflect.TypeOf((**Cluster)(nil)).Elem()
}

func (i *Cluster) ToClusterOutput() ClusterOutput {
	return i.ToClusterOutputWithContext(context.Background())
}

func (i *Cluster) ToClusterOutputWithContext(ctx context.Context) ClusterOutput {
	return pulumi.ToOutputWithContext(ctx, i).(ClusterOutput)
}

// ClusterArrayInput is an input type that accepts ClusterArray and ClusterArrayOutput values.
// You can construct a concrete instance of `ClusterArrayInput` via:
//
//	ClusterArray{ ClusterArgs{...} }
type ClusterArrayInput interface {
	pulumi.Input

	ToClusterArrayOutput() ClusterArrayOutput
	ToClusterArrayOutputWithContext(context.Context) ClusterArrayOutput
}

type ClusterArray []ClusterInput

func (ClusterArray) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*Cluster)(nil)).Elem()
}

func (i ClusterArray) ToClusterArrayOutput() ClusterArrayOutput {
	return i.ToClusterArrayOutputWithContext(context.Background())
}

func (i ClusterArray) ToClusterArrayOutputWithContext(ctx context.Context) ClusterArrayOutput {
	return pulumi.ToOutputWithContext(ctx, i).(ClusterArrayOutput)
}

// ClusterMapInput is an input type that accepts ClusterMap and ClusterMapOutput values.
// You can construct a concrete instance of `ClusterMapInput` via:
//
//	ClusterMap{ "key": ClusterArgs{...} }
type ClusterMapInput interface {
	pulumi.Input

	ToClusterMapOutput() ClusterMapOutput
	ToClusterMapOutputWithContext(context.Context) ClusterMapOutput
}

type ClusterMap map[string]ClusterInput

func (ClusterMap) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*Cluster)(nil)).Elem()
}

func (i ClusterMap) ToClusterMapOutput() ClusterMapOutput {
	return i.ToClusterMapOutputWithContext(context.Background())
}

func (i ClusterMap) ToClusterMapOutputWithContext(ctx context.Context) ClusterMapOutput {
	return pulumi.ToOutputWithContext(ctx, i).(ClusterMapOutput)
}

type ClusterOutput struct{ *pulumi.OutputState }

func (ClusterOutput) ElementType() reflect.Type {
	return reflect.TypeOf((**Cluster)(nil)).Elem()
}

func (o ClusterOutput) ToClusterOutput() ClusterOutput {
	return o
}

func (o ClusterOutput) ToClusterOutputWithContext(ctx context.Context) ClusterOutput {
	return o
}

// The AWS resource provider.
func (o ClusterOutput) AwsProvider() aws.ProviderOutput {
	return o.ApplyT(func(v *Cluster) aws.ProviderOutput { return v.AwsProvider }).(aws.ProviderOutput)
}

// The security group for the EKS cluster.
func (o ClusterOutput) ClusterSecurityGroup() ec2.SecurityGroupOutput {
	return o.ApplyT(func(v *Cluster) ec2.SecurityGroupOutput { return v.ClusterSecurityGroup }).(ec2.SecurityGroupOutput)
}

// The EKS cluster and its dependencies.
func (o ClusterOutput) Core() CoreDataOutput {
	return o.ApplyT(func(v *Cluster) CoreDataOutput { return v.Core }).(CoreDataOutput)
}

// The default Node Group configuration, or undefined if `skipDefaultNodeGroup` was specified.
func (o ClusterOutput) DefaultNodeGroup() NodeGroupDataPtrOutput {
	return o.ApplyT(func(v *Cluster) NodeGroupDataPtrOutput { return v.DefaultNodeGroup }).(NodeGroupDataPtrOutput)
}

// The EKS cluster.
func (o ClusterOutput) EksCluster() eks.ClusterOutput {
	return o.ApplyT(func(v *Cluster) eks.ClusterOutput { return v.EksCluster }).(eks.ClusterOutput)
}

// The ingress rule that gives node group access to cluster API server.
func (o ClusterOutput) EksClusterIngressRule() ec2.SecurityGroupRuleOutput {
	return o.ApplyT(func(v *Cluster) ec2.SecurityGroupRuleOutput { return v.EksClusterIngressRule }).(ec2.SecurityGroupRuleOutput)
}

// The service roles used by the EKS cluster.
func (o ClusterOutput) InstanceRoles() iam.RoleArrayOutput {
	return o.ApplyT(func(v *Cluster) iam.RoleArrayOutput { return v.InstanceRoles }).(iam.RoleArrayOutput)
}

// A kubeconfig that can be used to connect to the EKS cluster.
func (o ClusterOutput) Kubeconfig() pulumi.AnyOutput {
	return o.ApplyT(func(v *Cluster) pulumi.AnyOutput { return v.Kubeconfig }).(pulumi.AnyOutput)
}

// A kubeconfig that can be used to connect to the EKS cluster as a JSON string.
func (o ClusterOutput) KubeconfigJson() pulumi.StringOutput {
	return o.ApplyT(func(v *Cluster) pulumi.StringOutput { return v.KubeconfigJson }).(pulumi.StringOutput)
}

// The security group for the cluster's nodes.
func (o ClusterOutput) NodeSecurityGroup() ec2.SecurityGroupOutput {
	return o.ApplyT(func(v *Cluster) ec2.SecurityGroupOutput { return v.NodeSecurityGroup }).(ec2.SecurityGroupOutput)
}

type ClusterArrayOutput struct{ *pulumi.OutputState }

func (ClusterArrayOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*Cluster)(nil)).Elem()
}

func (o ClusterArrayOutput) ToClusterArrayOutput() ClusterArrayOutput {
	return o
}

func (o ClusterArrayOutput) ToClusterArrayOutputWithContext(ctx context.Context) ClusterArrayOutput {
	return o
}

func (o ClusterArrayOutput) Index(i pulumi.IntInput) ClusterOutput {
	return pulumi.All(o, i).ApplyT(func(vs []interface{}) *Cluster {
		return vs[0].([]*Cluster)[vs[1].(int)]
	}).(ClusterOutput)
}

type ClusterMapOutput struct{ *pulumi.OutputState }

func (ClusterMapOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*Cluster)(nil)).Elem()
}

func (o ClusterMapOutput) ToClusterMapOutput() ClusterMapOutput {
	return o
}

func (o ClusterMapOutput) ToClusterMapOutputWithContext(ctx context.Context) ClusterMapOutput {
	return o
}

func (o ClusterMapOutput) MapIndex(k pulumi.StringInput) ClusterOutput {
	return pulumi.All(o, k).ApplyT(func(vs []interface{}) *Cluster {
		return vs[0].(map[string]*Cluster)[vs[1].(string)]
	}).(ClusterOutput)
}

func init() {
	pulumi.RegisterInputType(reflect.TypeOf((*ClusterInput)(nil)).Elem(), &Cluster{})
	pulumi.RegisterInputType(reflect.TypeOf((*ClusterArrayInput)(nil)).Elem(), ClusterArray{})
	pulumi.RegisterInputType(reflect.TypeOf((*ClusterMapInput)(nil)).Elem(), ClusterMap{})
	pulumi.RegisterOutputType(ClusterOutput{})
	pulumi.RegisterOutputType(clusterGetKubeconfigResultOutput{})
	pulumi.RegisterOutputType(ClusterArrayOutput{})
	pulumi.RegisterOutputType(ClusterMapOutput{})
}
