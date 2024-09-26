// Code generated by pulumi-gen-eks DO NOT EDIT.
// *** WARNING: Do not edit by hand unless you're certain you know what you are doing! ***

package eks

import (
	"context"
	"reflect"

	"errors"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/eks"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/iam"
	"github.com/pulumi/pulumi-eks/sdk/v3/go/eks/utilities"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

// ManagedNodeGroup is a component that wraps creating an AWS managed node group.
//
// See for more details:
// https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
type ManagedNodeGroup struct {
	pulumi.ResourceState

	// The AWS managed node group.
	NodeGroup eks.NodeGroupOutput `pulumi:"nodeGroup"`
}

// NewManagedNodeGroup registers a new resource with the given unique name, arguments, and options.
func NewManagedNodeGroup(ctx *pulumi.Context,
	name string, args *ManagedNodeGroupArgs, opts ...pulumi.ResourceOption) (*ManagedNodeGroup, error) {
	if args == nil {
		return nil, errors.New("missing one or more required arguments")
	}

	if args.Cluster == nil {
		return nil, errors.New("invalid value for required argument 'Cluster'")
	}
	opts = utilities.PkgResourceDefaultOpts(opts)
	var resource ManagedNodeGroup
	err := ctx.RegisterRemoteComponentResource("eks:index:ManagedNodeGroup", name, args, &resource, opts...)
	if err != nil {
		return nil, err
	}
	return &resource, nil
}

type managedNodeGroupArgs struct {
	// The AMI ID to use for the worker nodes.
	// Defaults to the latest recommended EKS Optimized AMI from the AWS Systems Manager Parameter Store.
	//
	// Note: `amiId` is mutually exclusive with `gpu` and `amiType`.
	//
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
	AmiId *string `pulumi:"amiId"`
	// Type of Amazon Machine Image (AMI) associated with the EKS Node Group. Defaults to `AL2_x86_64`.
	// Note: `amiType` and `amiId` are mutually exclusive.
	//
	// See the AWS documentation (https://docs.aws.amazon.com/eks/latest/APIReference/API_Nodegroup.html#AmazonEKS-Type-Nodegroup-amiType) for valid AMI Types. This provider will only perform drift detection if a configuration value is provided.
	AmiType *string `pulumi:"amiType"`
	// Additional args to pass directly to `/etc/eks/bootstrap.sh`. For details on available options, see: https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh. Note that the `--apiserver-endpoint`, `--b64-cluster-ca` and `--kubelet-extra-args` flags are included automatically based on other configuration parameters.
	//
	// Note that this field conflicts with `launchTemplate`.
	BootstrapExtraArgs *string `pulumi:"bootstrapExtraArgs"`
	// The configuration settings for Bottlerocket OS.
	// The settings will get merged with the base settings the provider uses to configure Bottlerocket.
	//
	// This includes:
	//   - settings.kubernetes.api-server
	//   - settings.kubernetes.cluster-certificate
	//   - settings.kubernetes.cluster-name
	//   - settings.kubernetes.cluster-dns-ip
	//
	// For an overview of the available settings, see https://bottlerocket.dev/en/os/1.20.x/api/settings/.
	BottlerocketSettings map[string]interface{} `pulumi:"bottlerocketSettings"`
	// Type of capacity associated with the EKS Node Group. Valid values: `ON_DEMAND`, `SPOT`. This provider will only perform drift detection if a configuration value is provided.
	CapacityType *string `pulumi:"capacityType"`
	// The target EKS cluster.
	Cluster interface{} `pulumi:"cluster"`
	// Name of the EKS Cluster.
	ClusterName *string `pulumi:"clusterName"`
	// Disk size in GiB for worker nodes. Defaults to `20`. This provider will only perform drift detection if a configuration value is provided.
	DiskSize *int `pulumi:"diskSize"`
	// Enables the ability to use EC2 Instance Metadata Service v2, which provides a more secure way to access instance metadata. For more information, see: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html.
	// Defaults to `false`.
	//
	// Note that this field conflicts with `launchTemplate`. If you are providing a custom `launchTemplate`, you should enable this feature within the `launchTemplateMetadataOptions` of the supplied `launchTemplate`.
	EnableIMDSv2 *bool `pulumi:"enableIMDSv2"`
	// Force version update if existing pods are unable to be drained due to a pod disruption budget issue.
	ForceUpdateVersion *bool `pulumi:"forceUpdateVersion"`
	// Use the latest recommended EKS Optimized AMI with GPU support for the worker nodes.
	// Defaults to false.
	//
	// Note: `gpu` and `amiId` are mutually exclusive.
	//
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-amis.html.
	Gpu *bool `pulumi:"gpu"`
	// Whether to ignore changes to the desired size of the Auto Scaling Group. This is useful when using Cluster Autoscaler.
	//
	// See [EKS best practices](https://aws.github.io/aws-eks-best-practices/cluster-autoscaling/) for more details.
	IgnoreScalingChanges *bool `pulumi:"ignoreScalingChanges"`
	// Set of instance types associated with the EKS Node Group. Defaults to `["t3.medium"]`. This provider will only perform drift detection if a configuration value is provided. Currently, the EKS API only accepts a single value in the set.
	InstanceTypes []string `pulumi:"instanceTypes"`
	// Extra args to pass to the Kubelet. Corresponds to the options passed in the `--kubeletExtraArgs` flag to `/etc/eks/bootstrap.sh`. For example, '--port=10251 --address=0.0.0.0'. To escape characters in the extra argsvalue, wrap the value in quotes. For example, `kubeletExtraArgs = '--allowed-unsafe-sysctls "net.core.somaxconn"'`.
	// Note that this field conflicts with `launchTemplate`.
	KubeletExtraArgs *string `pulumi:"kubeletExtraArgs"`
	// Key-value map of Kubernetes labels. Only labels that are applied with the EKS API are managed by this argument. Other Kubernetes labels applied to the EKS Node Group will not be managed.
	Labels map[string]string `pulumi:"labels"`
	// Launch Template settings.
	//
	// Note: This field is mutually exclusive with `kubeletExtraArgs` and `bootstrapExtraArgs`.
	LaunchTemplate *eks.NodeGroupLaunchTemplate `pulumi:"launchTemplate"`
	// Name of the EKS Node Group. If omitted, this provider will assign a random, unique name. Conflicts with `nodeGroupNamePrefix`.
	NodeGroupName *string `pulumi:"nodeGroupName"`
	// Creates a unique name beginning with the specified prefix. Conflicts with `nodeGroupName`.
	NodeGroupNamePrefix *string `pulumi:"nodeGroupNamePrefix"`
	// The IAM Role that provides permissions for the EKS Node Group.
	//
	// Note, `nodeRole` and `nodeRoleArn` are mutually exclusive, and a single option must be used.
	NodeRole *iam.Role `pulumi:"nodeRole"`
	// Amazon Resource Name (ARN) of the IAM Role that provides permissions for the EKS Node Group.
	//
	// Note, `nodeRoleArn` and `nodeRole` are mutually exclusive, and a single option must be used.
	NodeRoleArn *string `pulumi:"nodeRoleArn"`
	// Extra nodeadm configuration sections to be added to the nodeadm user data. This can be shell scripts, nodeadm NodeConfig or any other user data compatible script. When configuring additional nodeadm NodeConfig sections, they'll be merged with the base settings the provider sets. You can overwrite base settings or provide additional settings this way.
	// The base settings the provider sets are:
	//   - cluster.name
	//   - cluster.apiServerEndpoint
	//   - cluster.certificateAuthority
	//   - cluster.cidr
	//
	// Note: This is only applicable when using AL2023.
	// See for more details:
	//   - https://awslabs.github.io/amazon-eks-ami/nodeadm/
	//   - https://awslabs.github.io/amazon-eks-ami/nodeadm/doc/api/
	NodeadmExtraOptions []NodeadmOptions `pulumi:"nodeadmExtraOptions"`
	// The type of OS to use for the node group. Will be used to determine the right EKS optimized AMI to use based on the instance types and gpu configuration.
	// Valid values are `RECOMMENDED`, `AL2`, `AL2023` and `Bottlerocket`.
	//
	// Defaults to the current recommended OS.
	OperatingSystem *OperatingSystem `pulumi:"operatingSystem"`
	// AMI version of the EKS Node Group. Defaults to latest version for Kubernetes version.
	ReleaseVersion *string `pulumi:"releaseVersion"`
	// Remote access settings.
	RemoteAccess *eks.NodeGroupRemoteAccess `pulumi:"remoteAccess"`
	// Scaling settings.
	//
	// Default scaling amounts of the node group autoscaling group are:
	//   - desiredSize: 2
	//   - minSize: 1
	//   - maxSize: 2
	ScalingConfig *eks.NodeGroupScalingConfig `pulumi:"scalingConfig"`
	// Identifiers of EC2 Subnets to associate with the EKS Node Group. These subnets must have the following resource tag: `kubernetes.io/cluster/CLUSTER_NAME` (where `CLUSTER_NAME` is replaced with the name of the EKS Cluster).
	//
	// Default subnetIds is chosen from the following list, in order, if subnetIds arg is not set:
	//   - core.subnetIds
	//   - core.privateIds
	//   - core.publicSubnetIds
	//
	// This default logic is based on the existing subnet IDs logic of this package: https://git.io/JeM11
	SubnetIds []string `pulumi:"subnetIds"`
	// Key-value mapping of resource tags.
	Tags map[string]string `pulumi:"tags"`
	// The Kubernetes taints to be applied to the nodes in the node group. Maximum of 50 taints per node group.
	Taints []eks.NodeGroupTaint `pulumi:"taints"`
	// User specified code to run on node startup. This is expected to handle the full AWS EKS node bootstrapping. If omitted, the provider will configure the user data.
	//
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html#launch-template-user-data.
	UserData *string `pulumi:"userData"`
	Version  *string `pulumi:"version"`
}

// The set of arguments for constructing a ManagedNodeGroup resource.
type ManagedNodeGroupArgs struct {
	// The AMI ID to use for the worker nodes.
	// Defaults to the latest recommended EKS Optimized AMI from the AWS Systems Manager Parameter Store.
	//
	// Note: `amiId` is mutually exclusive with `gpu` and `amiType`.
	//
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
	AmiId pulumi.StringPtrInput
	// Type of Amazon Machine Image (AMI) associated with the EKS Node Group. Defaults to `AL2_x86_64`.
	// Note: `amiType` and `amiId` are mutually exclusive.
	//
	// See the AWS documentation (https://docs.aws.amazon.com/eks/latest/APIReference/API_Nodegroup.html#AmazonEKS-Type-Nodegroup-amiType) for valid AMI Types. This provider will only perform drift detection if a configuration value is provided.
	AmiType pulumi.StringPtrInput
	// Additional args to pass directly to `/etc/eks/bootstrap.sh`. For details on available options, see: https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh. Note that the `--apiserver-endpoint`, `--b64-cluster-ca` and `--kubelet-extra-args` flags are included automatically based on other configuration parameters.
	//
	// Note that this field conflicts with `launchTemplate`.
	BootstrapExtraArgs *string
	// The configuration settings for Bottlerocket OS.
	// The settings will get merged with the base settings the provider uses to configure Bottlerocket.
	//
	// This includes:
	//   - settings.kubernetes.api-server
	//   - settings.kubernetes.cluster-certificate
	//   - settings.kubernetes.cluster-name
	//   - settings.kubernetes.cluster-dns-ip
	//
	// For an overview of the available settings, see https://bottlerocket.dev/en/os/1.20.x/api/settings/.
	BottlerocketSettings pulumi.MapInput
	// Type of capacity associated with the EKS Node Group. Valid values: `ON_DEMAND`, `SPOT`. This provider will only perform drift detection if a configuration value is provided.
	CapacityType pulumi.StringPtrInput
	// The target EKS cluster.
	Cluster pulumi.Input
	// Name of the EKS Cluster.
	ClusterName pulumi.StringPtrInput
	// Disk size in GiB for worker nodes. Defaults to `20`. This provider will only perform drift detection if a configuration value is provided.
	DiskSize pulumi.IntPtrInput
	// Enables the ability to use EC2 Instance Metadata Service v2, which provides a more secure way to access instance metadata. For more information, see: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html.
	// Defaults to `false`.
	//
	// Note that this field conflicts with `launchTemplate`. If you are providing a custom `launchTemplate`, you should enable this feature within the `launchTemplateMetadataOptions` of the supplied `launchTemplate`.
	EnableIMDSv2 *bool
	// Force version update if existing pods are unable to be drained due to a pod disruption budget issue.
	ForceUpdateVersion pulumi.BoolPtrInput
	// Use the latest recommended EKS Optimized AMI with GPU support for the worker nodes.
	// Defaults to false.
	//
	// Note: `gpu` and `amiId` are mutually exclusive.
	//
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-amis.html.
	Gpu pulumi.BoolPtrInput
	// Whether to ignore changes to the desired size of the Auto Scaling Group. This is useful when using Cluster Autoscaler.
	//
	// See [EKS best practices](https://aws.github.io/aws-eks-best-practices/cluster-autoscaling/) for more details.
	IgnoreScalingChanges *bool
	// Set of instance types associated with the EKS Node Group. Defaults to `["t3.medium"]`. This provider will only perform drift detection if a configuration value is provided. Currently, the EKS API only accepts a single value in the set.
	InstanceTypes pulumi.StringArrayInput
	// Extra args to pass to the Kubelet. Corresponds to the options passed in the `--kubeletExtraArgs` flag to `/etc/eks/bootstrap.sh`. For example, '--port=10251 --address=0.0.0.0'. To escape characters in the extra argsvalue, wrap the value in quotes. For example, `kubeletExtraArgs = '--allowed-unsafe-sysctls "net.core.somaxconn"'`.
	// Note that this field conflicts with `launchTemplate`.
	KubeletExtraArgs *string
	// Key-value map of Kubernetes labels. Only labels that are applied with the EKS API are managed by this argument. Other Kubernetes labels applied to the EKS Node Group will not be managed.
	Labels pulumi.StringMapInput
	// Launch Template settings.
	//
	// Note: This field is mutually exclusive with `kubeletExtraArgs` and `bootstrapExtraArgs`.
	LaunchTemplate eks.NodeGroupLaunchTemplatePtrInput
	// Name of the EKS Node Group. If omitted, this provider will assign a random, unique name. Conflicts with `nodeGroupNamePrefix`.
	NodeGroupName pulumi.StringPtrInput
	// Creates a unique name beginning with the specified prefix. Conflicts with `nodeGroupName`.
	NodeGroupNamePrefix pulumi.StringPtrInput
	// The IAM Role that provides permissions for the EKS Node Group.
	//
	// Note, `nodeRole` and `nodeRoleArn` are mutually exclusive, and a single option must be used.
	NodeRole iam.RoleInput
	// Amazon Resource Name (ARN) of the IAM Role that provides permissions for the EKS Node Group.
	//
	// Note, `nodeRoleArn` and `nodeRole` are mutually exclusive, and a single option must be used.
	NodeRoleArn pulumi.StringPtrInput
	// Extra nodeadm configuration sections to be added to the nodeadm user data. This can be shell scripts, nodeadm NodeConfig or any other user data compatible script. When configuring additional nodeadm NodeConfig sections, they'll be merged with the base settings the provider sets. You can overwrite base settings or provide additional settings this way.
	// The base settings the provider sets are:
	//   - cluster.name
	//   - cluster.apiServerEndpoint
	//   - cluster.certificateAuthority
	//   - cluster.cidr
	//
	// Note: This is only applicable when using AL2023.
	// See for more details:
	//   - https://awslabs.github.io/amazon-eks-ami/nodeadm/
	//   - https://awslabs.github.io/amazon-eks-ami/nodeadm/doc/api/
	NodeadmExtraOptions NodeadmOptionsArrayInput
	// The type of OS to use for the node group. Will be used to determine the right EKS optimized AMI to use based on the instance types and gpu configuration.
	// Valid values are `RECOMMENDED`, `AL2`, `AL2023` and `Bottlerocket`.
	//
	// Defaults to the current recommended OS.
	OperatingSystem OperatingSystemPtrInput
	// AMI version of the EKS Node Group. Defaults to latest version for Kubernetes version.
	ReleaseVersion pulumi.StringPtrInput
	// Remote access settings.
	RemoteAccess eks.NodeGroupRemoteAccessPtrInput
	// Scaling settings.
	//
	// Default scaling amounts of the node group autoscaling group are:
	//   - desiredSize: 2
	//   - minSize: 1
	//   - maxSize: 2
	ScalingConfig eks.NodeGroupScalingConfigPtrInput
	// Identifiers of EC2 Subnets to associate with the EKS Node Group. These subnets must have the following resource tag: `kubernetes.io/cluster/CLUSTER_NAME` (where `CLUSTER_NAME` is replaced with the name of the EKS Cluster).
	//
	// Default subnetIds is chosen from the following list, in order, if subnetIds arg is not set:
	//   - core.subnetIds
	//   - core.privateIds
	//   - core.publicSubnetIds
	//
	// This default logic is based on the existing subnet IDs logic of this package: https://git.io/JeM11
	SubnetIds pulumi.StringArrayInput
	// Key-value mapping of resource tags.
	Tags pulumi.StringMapInput
	// The Kubernetes taints to be applied to the nodes in the node group. Maximum of 50 taints per node group.
	Taints eks.NodeGroupTaintArrayInput
	// User specified code to run on node startup. This is expected to handle the full AWS EKS node bootstrapping. If omitted, the provider will configure the user data.
	//
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html#launch-template-user-data.
	UserData pulumi.StringPtrInput
	Version  pulumi.StringPtrInput
}

func (ManagedNodeGroupArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*managedNodeGroupArgs)(nil)).Elem()
}

type ManagedNodeGroupInput interface {
	pulumi.Input

	ToManagedNodeGroupOutput() ManagedNodeGroupOutput
	ToManagedNodeGroupOutputWithContext(ctx context.Context) ManagedNodeGroupOutput
}

func (*ManagedNodeGroup) ElementType() reflect.Type {
	return reflect.TypeOf((**ManagedNodeGroup)(nil)).Elem()
}

func (i *ManagedNodeGroup) ToManagedNodeGroupOutput() ManagedNodeGroupOutput {
	return i.ToManagedNodeGroupOutputWithContext(context.Background())
}

func (i *ManagedNodeGroup) ToManagedNodeGroupOutputWithContext(ctx context.Context) ManagedNodeGroupOutput {
	return pulumi.ToOutputWithContext(ctx, i).(ManagedNodeGroupOutput)
}

// ManagedNodeGroupArrayInput is an input type that accepts ManagedNodeGroupArray and ManagedNodeGroupArrayOutput values.
// You can construct a concrete instance of `ManagedNodeGroupArrayInput` via:
//
//	ManagedNodeGroupArray{ ManagedNodeGroupArgs{...} }
type ManagedNodeGroupArrayInput interface {
	pulumi.Input

	ToManagedNodeGroupArrayOutput() ManagedNodeGroupArrayOutput
	ToManagedNodeGroupArrayOutputWithContext(context.Context) ManagedNodeGroupArrayOutput
}

type ManagedNodeGroupArray []ManagedNodeGroupInput

func (ManagedNodeGroupArray) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*ManagedNodeGroup)(nil)).Elem()
}

func (i ManagedNodeGroupArray) ToManagedNodeGroupArrayOutput() ManagedNodeGroupArrayOutput {
	return i.ToManagedNodeGroupArrayOutputWithContext(context.Background())
}

func (i ManagedNodeGroupArray) ToManagedNodeGroupArrayOutputWithContext(ctx context.Context) ManagedNodeGroupArrayOutput {
	return pulumi.ToOutputWithContext(ctx, i).(ManagedNodeGroupArrayOutput)
}

// ManagedNodeGroupMapInput is an input type that accepts ManagedNodeGroupMap and ManagedNodeGroupMapOutput values.
// You can construct a concrete instance of `ManagedNodeGroupMapInput` via:
//
//	ManagedNodeGroupMap{ "key": ManagedNodeGroupArgs{...} }
type ManagedNodeGroupMapInput interface {
	pulumi.Input

	ToManagedNodeGroupMapOutput() ManagedNodeGroupMapOutput
	ToManagedNodeGroupMapOutputWithContext(context.Context) ManagedNodeGroupMapOutput
}

type ManagedNodeGroupMap map[string]ManagedNodeGroupInput

func (ManagedNodeGroupMap) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*ManagedNodeGroup)(nil)).Elem()
}

func (i ManagedNodeGroupMap) ToManagedNodeGroupMapOutput() ManagedNodeGroupMapOutput {
	return i.ToManagedNodeGroupMapOutputWithContext(context.Background())
}

func (i ManagedNodeGroupMap) ToManagedNodeGroupMapOutputWithContext(ctx context.Context) ManagedNodeGroupMapOutput {
	return pulumi.ToOutputWithContext(ctx, i).(ManagedNodeGroupMapOutput)
}

type ManagedNodeGroupOutput struct{ *pulumi.OutputState }

func (ManagedNodeGroupOutput) ElementType() reflect.Type {
	return reflect.TypeOf((**ManagedNodeGroup)(nil)).Elem()
}

func (o ManagedNodeGroupOutput) ToManagedNodeGroupOutput() ManagedNodeGroupOutput {
	return o
}

func (o ManagedNodeGroupOutput) ToManagedNodeGroupOutputWithContext(ctx context.Context) ManagedNodeGroupOutput {
	return o
}

// The AWS managed node group.
func (o ManagedNodeGroupOutput) NodeGroup() eks.NodeGroupOutput {
	return o.ApplyT(func(v *ManagedNodeGroup) eks.NodeGroupOutput { return v.NodeGroup }).(eks.NodeGroupOutput)
}

type ManagedNodeGroupArrayOutput struct{ *pulumi.OutputState }

func (ManagedNodeGroupArrayOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*ManagedNodeGroup)(nil)).Elem()
}

func (o ManagedNodeGroupArrayOutput) ToManagedNodeGroupArrayOutput() ManagedNodeGroupArrayOutput {
	return o
}

func (o ManagedNodeGroupArrayOutput) ToManagedNodeGroupArrayOutputWithContext(ctx context.Context) ManagedNodeGroupArrayOutput {
	return o
}

func (o ManagedNodeGroupArrayOutput) Index(i pulumi.IntInput) ManagedNodeGroupOutput {
	return pulumi.All(o, i).ApplyT(func(vs []interface{}) *ManagedNodeGroup {
		return vs[0].([]*ManagedNodeGroup)[vs[1].(int)]
	}).(ManagedNodeGroupOutput)
}

type ManagedNodeGroupMapOutput struct{ *pulumi.OutputState }

func (ManagedNodeGroupMapOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*ManagedNodeGroup)(nil)).Elem()
}

func (o ManagedNodeGroupMapOutput) ToManagedNodeGroupMapOutput() ManagedNodeGroupMapOutput {
	return o
}

func (o ManagedNodeGroupMapOutput) ToManagedNodeGroupMapOutputWithContext(ctx context.Context) ManagedNodeGroupMapOutput {
	return o
}

func (o ManagedNodeGroupMapOutput) MapIndex(k pulumi.StringInput) ManagedNodeGroupOutput {
	return pulumi.All(o, k).ApplyT(func(vs []interface{}) *ManagedNodeGroup {
		return vs[0].(map[string]*ManagedNodeGroup)[vs[1].(string)]
	}).(ManagedNodeGroupOutput)
}

func init() {
	pulumi.RegisterInputType(reflect.TypeOf((*ManagedNodeGroupInput)(nil)).Elem(), &ManagedNodeGroup{})
	pulumi.RegisterInputType(reflect.TypeOf((*ManagedNodeGroupArrayInput)(nil)).Elem(), ManagedNodeGroupArray{})
	pulumi.RegisterInputType(reflect.TypeOf((*ManagedNodeGroupMapInput)(nil)).Elem(), ManagedNodeGroupMap{})
	pulumi.RegisterOutputType(ManagedNodeGroupOutput{})
	pulumi.RegisterOutputType(ManagedNodeGroupArrayOutput{})
	pulumi.RegisterOutputType(ManagedNodeGroupMapOutput{})
}
