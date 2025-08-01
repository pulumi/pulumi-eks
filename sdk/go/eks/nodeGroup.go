// Code generated by pulumi-gen-eks DO NOT EDIT.
// *** WARNING: Do not edit by hand unless you're certain you know what you are doing! ***

package eks

import (
	"context"
	"reflect"

	"errors"
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/cloudformation"
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/ec2"
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/iam"
	"github.com/pulumi/pulumi-eks/sdk/v4/go/eks/utilities"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

// NodeGroup is a component that wraps the AWS EC2 instances that provide compute capacity for an EKS cluster.
//
// Deprecated: NodeGroup uses AWS EC2 LaunchConfiguration which has been deprecated by AWS and doesn't support the newest instance types. Please use NodeGroupV2 instead.
type NodeGroup struct {
	pulumi.ResourceState

	// The AutoScalingGroup name for the Node group.
	AutoScalingGroupName pulumi.StringOutput `pulumi:"autoScalingGroupName"`
	// The CloudFormation Stack which defines the Node AutoScalingGroup.
	CfnStack cloudformation.StackOutput `pulumi:"cfnStack"`
	// The additional security groups for the node group that captures user-specific rules.
	ExtraNodeSecurityGroups ec2.SecurityGroupArrayOutput `pulumi:"extraNodeSecurityGroups"`
	// The security group for the node group to communicate with the cluster, or undefined if using `nodeSecurityGroupId`.
	NodeSecurityGroup ec2.SecurityGroupOutput `pulumi:"nodeSecurityGroup"`
	// The ID of the security group for the node group to communicate with the cluster.
	NodeSecurityGroupId pulumi.StringOutput `pulumi:"nodeSecurityGroupId"`
}

// NewNodeGroup registers a new resource with the given unique name, arguments, and options.
func NewNodeGroup(ctx *pulumi.Context,
	name string, args *NodeGroupArgs, opts ...pulumi.ResourceOption) (*NodeGroup, error) {
	if args == nil {
		return nil, errors.New("missing one or more required arguments")
	}

	if args.Cluster == nil {
		return nil, errors.New("invalid value for required argument 'Cluster'")
	}
	opts = utilities.PkgResourceDefaultOpts(opts)
	var resource NodeGroup
	err := ctx.RegisterRemoteComponentResource("eks:index:NodeGroup", name, args, &resource, opts...)
	if err != nil {
		return nil, err
	}
	return &resource, nil
}

type nodeGroupArgs struct {
	// The AMI ID to use for the worker nodes.
	//
	// Defaults to the latest recommended EKS Optimized Linux AMI from the AWS Systems Manager Parameter Store.
	//
	// Note: `amiId` and `gpu` are mutually exclusive.
	//
	// See for more details:
	// - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
	AmiId *string `pulumi:"amiId"`
	// The AMI Type to use for the worker nodes.
	//
	// Only applicable when setting an AMI ID that is of type `arm64`.
	//
	// Note: `amiType` and `gpu` are mutually exclusive.
	AmiType *string `pulumi:"amiType"`
	// The tags to apply to the NodeGroup's AutoScalingGroup in the CloudFormation Stack.
	//
	// Per AWS, all stack-level tags, including automatically created tags, and the `cloudFormationTags` option are propagated to resources that AWS CloudFormation supports, including the AutoScalingGroup. See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html
	//
	// Note: Given the inheritance of auto-generated CF tags and `cloudFormationTags`, you should either supply the tag in `autoScalingGroupTags` or `cloudFormationTags`, but not both.
	AutoScalingGroupTags map[string]string `pulumi:"autoScalingGroupTags"`
	// Additional args to pass directly to `/etc/eks/bootstrap.sh`. For details on available options, see: https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh. Note that the `--apiserver-endpoint`, `--b64-cluster-ca` and `--kubelet-extra-args` flags are included automatically based on other configuration parameters.
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
	// The tags to apply to the CloudFormation Stack of the Worker NodeGroup.
	//
	// Note: Given the inheritance of auto-generated CF tags and `cloudFormationTags`, you should either supply the tag in `autoScalingGroupTags` or `cloudFormationTags`, but not both.
	CloudFormationTags map[string]string `pulumi:"cloudFormationTags"`
	// The target EKS cluster.
	Cluster interface{} `pulumi:"cluster"`
	// The ingress rule that gives node group access.
	ClusterIngressRule *ec2.SecurityGroupRule `pulumi:"clusterIngressRule"`
	// The ID of the ingress rule that gives node group access.
	ClusterIngressRuleId *string `pulumi:"clusterIngressRuleId"`
	// The number of worker nodes that should be running in the cluster. Defaults to 2.
	DesiredCapacity *int `pulumi:"desiredCapacity"`
	// Enables/disables detailed monitoring of the EC2 instances.
	//
	// With detailed monitoring, all metrics, including status check metrics, are available in 1-minute intervals.
	// When enabled, you can also get aggregated data across groups of similar instances.
	//
	// Note: You are charged per metric that is sent to CloudWatch. You are not charged for data storage.
	// For more information, see "Paid tier" and "Example 1 - EC2 Detailed Monitoring" here https://aws.amazon.com/cloudwatch/pricing/.
	EnableDetailedMonitoring *bool `pulumi:"enableDetailedMonitoring"`
	// Encrypt the root block device of the nodes in the node group.
	EncryptRootBlockDevice *bool `pulumi:"encryptRootBlockDevice"`
	// Extra security groups to attach on all nodes in this worker node group.
	//
	// This additional set of security groups captures any user application rules that will be needed for the nodes.
	ExtraNodeSecurityGroups []*ec2.SecurityGroup `pulumi:"extraNodeSecurityGroups"`
	// Use the latest recommended EKS Optimized Linux AMI with GPU support for the worker nodes from the AWS Systems Manager Parameter Store.
	//
	// Defaults to false.
	//
	// Note: `gpu` and `amiId` are mutually exclusive.
	//
	// See for more details:
	// - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
	// - https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
	Gpu *bool `pulumi:"gpu"`
	// The IAM InstanceProfile to use on the NodeGroup. Properties instanceProfile and instanceProfileName are mutually exclusive.
	InstanceProfile *iam.InstanceProfile `pulumi:"instanceProfile"`
	// The name of the IAM InstanceProfile to use on the NodeGroup. Properties instanceProfile and instanceProfileName are mutually exclusive.
	InstanceProfileName *string `pulumi:"instanceProfileName"`
	// The instance type to use for the cluster's nodes. Defaults to "t3.medium".
	InstanceType *string `pulumi:"instanceType"`
	// Name of the key pair to use for SSH access to worker nodes.
	KeyName *string `pulumi:"keyName"`
	// Extra args to pass to the Kubelet. Corresponds to the options passed in the `--kubeletExtraArgs` flag to `/etc/eks/bootstrap.sh`. For example, '--port=10251 --address=0.0.0.0'. Note that the `labels` and `taints` properties will be applied to this list (using `--node-labels` and `--register-with-taints` respectively) after to the explicit `kubeletExtraArgs`.
	KubeletExtraArgs *string `pulumi:"kubeletExtraArgs"`
	// Custom k8s node labels to be attached to each worker node. Adds the given key/value pairs to the `--node-labels` kubelet argument.
	Labels map[string]string `pulumi:"labels"`
	// The maximum number of worker nodes running in the cluster. Defaults to 2.
	MaxSize *int `pulumi:"maxSize"`
	// The minimum number of worker nodes running in the cluster. Defaults to 1.
	MinSize *int `pulumi:"minSize"`
	// Whether or not to auto-assign public IP addresses on the EKS worker nodes. If this toggle is set to true, the EKS workers will be auto-assigned public IPs. If false, they will not be auto-assigned public IPs.
	NodeAssociatePublicIpAddress *bool `pulumi:"nodeAssociatePublicIpAddress"`
	// Public key material for SSH access to worker nodes. See allowed formats at:
	// https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
	// If not provided, no SSH access is enabled on VMs.
	NodePublicKey *string `pulumi:"nodePublicKey"`
	// Whether the root block device should be deleted on termination of the instance. Defaults to true.
	NodeRootVolumeDeleteOnTermination *bool `pulumi:"nodeRootVolumeDeleteOnTermination"`
	// Whether to encrypt a cluster node's root volume. Defaults to false.
	NodeRootVolumeEncrypted *bool `pulumi:"nodeRootVolumeEncrypted"`
	// The amount of provisioned IOPS. This is only valid with a volumeType of 'io1'.
	NodeRootVolumeIops *int `pulumi:"nodeRootVolumeIops"`
	// The size in GiB of a cluster node's root volume. Defaults to 20.
	NodeRootVolumeSize *int `pulumi:"nodeRootVolumeSize"`
	// Provisioned throughput performance in integer MiB/s for a cluster node's root volume. This is only valid with a volumeType of 'gp3'.
	NodeRootVolumeThroughput *int `pulumi:"nodeRootVolumeThroughput"`
	// Configured EBS type for a cluster node's root volume. Default is 'gp2'. Supported values are 'standard', 'gp2', 'gp3', 'st1', 'sc1', 'io1'.
	NodeRootVolumeType *string `pulumi:"nodeRootVolumeType"`
	// The security group for the worker node group to communicate with the cluster.
	//
	// This security group requires specific inbound and outbound rules.
	//
	// See for more details:
	// https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html
	//
	// Note: The `nodeSecurityGroup` option and the cluster option`nodeSecurityGroupTags` are mutually exclusive.
	NodeSecurityGroup *ec2.SecurityGroup `pulumi:"nodeSecurityGroup"`
	// The ID of the security group for the worker node group to communicate with the cluster.
	//
	// This security group requires specific inbound and outbound rules.
	//
	// See for more details:
	// https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html
	//
	// Note: The `nodeSecurityGroupId` option and the cluster option `nodeSecurityGroupTags` are mutually exclusive.
	NodeSecurityGroupId *string `pulumi:"nodeSecurityGroupId"`
	// The set of subnets to override and use for the worker node group.
	//
	// Setting this option overrides which subnets to use for the worker node group, regardless if the cluster's `subnetIds` is set, or if `publicSubnetIds` and/or `privateSubnetIds` were set.
	NodeSubnetIds []string `pulumi:"nodeSubnetIds"`
	// Extra code to run on node startup. This code will run after the AWS EKS bootstrapping code and before the node signals its readiness to the managing CloudFormation stack. This code must be a typical user data script: critically it must begin with an interpreter directive (i.e. a `#!`).
	NodeUserData *string `pulumi:"nodeUserData"`
	// User specified code to run on node startup. This code is expected to handle the full AWS EKS bootstrapping code and signal node readiness to the managing CloudFormation stack. This code must be a complete and executable user data script in bash (Linux) or powershell (Windows).
	//
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/worker.html
	NodeUserDataOverride *string `pulumi:"nodeUserDataOverride"`
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
	// Bidding price for spot instance. If set, only spot instances will be added as worker node.
	SpotPrice *string `pulumi:"spotPrice"`
	// Custom k8s node taints to be attached to each worker node. Adds the given taints to the `--register-with-taints` kubelet argument
	Taints map[string]Taint `pulumi:"taints"`
	// Desired Kubernetes master / control plane version. If you do not specify a value, the latest available version is used.
	Version *string `pulumi:"version"`
}

// The set of arguments for constructing a NodeGroup resource.
type NodeGroupArgs struct {
	// The AMI ID to use for the worker nodes.
	//
	// Defaults to the latest recommended EKS Optimized Linux AMI from the AWS Systems Manager Parameter Store.
	//
	// Note: `amiId` and `gpu` are mutually exclusive.
	//
	// See for more details:
	// - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
	AmiId pulumi.StringPtrInput
	// The AMI Type to use for the worker nodes.
	//
	// Only applicable when setting an AMI ID that is of type `arm64`.
	//
	// Note: `amiType` and `gpu` are mutually exclusive.
	AmiType pulumi.StringPtrInput
	// The tags to apply to the NodeGroup's AutoScalingGroup in the CloudFormation Stack.
	//
	// Per AWS, all stack-level tags, including automatically created tags, and the `cloudFormationTags` option are propagated to resources that AWS CloudFormation supports, including the AutoScalingGroup. See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html
	//
	// Note: Given the inheritance of auto-generated CF tags and `cloudFormationTags`, you should either supply the tag in `autoScalingGroupTags` or `cloudFormationTags`, but not both.
	AutoScalingGroupTags pulumi.StringMapInput
	// Additional args to pass directly to `/etc/eks/bootstrap.sh`. For details on available options, see: https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh. Note that the `--apiserver-endpoint`, `--b64-cluster-ca` and `--kubelet-extra-args` flags are included automatically based on other configuration parameters.
	BootstrapExtraArgs pulumi.StringPtrInput
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
	// The tags to apply to the CloudFormation Stack of the Worker NodeGroup.
	//
	// Note: Given the inheritance of auto-generated CF tags and `cloudFormationTags`, you should either supply the tag in `autoScalingGroupTags` or `cloudFormationTags`, but not both.
	CloudFormationTags pulumi.StringMapInput
	// The target EKS cluster.
	Cluster pulumi.Input
	// The ingress rule that gives node group access.
	ClusterIngressRule ec2.SecurityGroupRuleInput
	// The ID of the ingress rule that gives node group access.
	ClusterIngressRuleId pulumi.StringPtrInput
	// The number of worker nodes that should be running in the cluster. Defaults to 2.
	DesiredCapacity pulumi.IntPtrInput
	// Enables/disables detailed monitoring of the EC2 instances.
	//
	// With detailed monitoring, all metrics, including status check metrics, are available in 1-minute intervals.
	// When enabled, you can also get aggregated data across groups of similar instances.
	//
	// Note: You are charged per metric that is sent to CloudWatch. You are not charged for data storage.
	// For more information, see "Paid tier" and "Example 1 - EC2 Detailed Monitoring" here https://aws.amazon.com/cloudwatch/pricing/.
	EnableDetailedMonitoring pulumi.BoolPtrInput
	// Encrypt the root block device of the nodes in the node group.
	EncryptRootBlockDevice pulumi.BoolPtrInput
	// Extra security groups to attach on all nodes in this worker node group.
	//
	// This additional set of security groups captures any user application rules that will be needed for the nodes.
	ExtraNodeSecurityGroups ec2.SecurityGroupArrayInput
	// Use the latest recommended EKS Optimized Linux AMI with GPU support for the worker nodes from the AWS Systems Manager Parameter Store.
	//
	// Defaults to false.
	//
	// Note: `gpu` and `amiId` are mutually exclusive.
	//
	// See for more details:
	// - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
	// - https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
	Gpu pulumi.BoolPtrInput
	// The IAM InstanceProfile to use on the NodeGroup. Properties instanceProfile and instanceProfileName are mutually exclusive.
	InstanceProfile *iam.InstanceProfile
	// The name of the IAM InstanceProfile to use on the NodeGroup. Properties instanceProfile and instanceProfileName are mutually exclusive.
	InstanceProfileName pulumi.StringPtrInput
	// The instance type to use for the cluster's nodes. Defaults to "t3.medium".
	InstanceType pulumi.StringPtrInput
	// Name of the key pair to use for SSH access to worker nodes.
	KeyName pulumi.StringPtrInput
	// Extra args to pass to the Kubelet. Corresponds to the options passed in the `--kubeletExtraArgs` flag to `/etc/eks/bootstrap.sh`. For example, '--port=10251 --address=0.0.0.0'. Note that the `labels` and `taints` properties will be applied to this list (using `--node-labels` and `--register-with-taints` respectively) after to the explicit `kubeletExtraArgs`.
	KubeletExtraArgs pulumi.StringPtrInput
	// Custom k8s node labels to be attached to each worker node. Adds the given key/value pairs to the `--node-labels` kubelet argument.
	Labels pulumi.StringMapInput
	// The maximum number of worker nodes running in the cluster. Defaults to 2.
	MaxSize pulumi.IntPtrInput
	// The minimum number of worker nodes running in the cluster. Defaults to 1.
	MinSize pulumi.IntPtrInput
	// Whether or not to auto-assign public IP addresses on the EKS worker nodes. If this toggle is set to true, the EKS workers will be auto-assigned public IPs. If false, they will not be auto-assigned public IPs.
	NodeAssociatePublicIpAddress pulumi.BoolPtrInput
	// Public key material for SSH access to worker nodes. See allowed formats at:
	// https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
	// If not provided, no SSH access is enabled on VMs.
	NodePublicKey pulumi.StringPtrInput
	// Whether the root block device should be deleted on termination of the instance. Defaults to true.
	NodeRootVolumeDeleteOnTermination pulumi.BoolPtrInput
	// Whether to encrypt a cluster node's root volume. Defaults to false.
	NodeRootVolumeEncrypted pulumi.BoolPtrInput
	// The amount of provisioned IOPS. This is only valid with a volumeType of 'io1'.
	NodeRootVolumeIops pulumi.IntPtrInput
	// The size in GiB of a cluster node's root volume. Defaults to 20.
	NodeRootVolumeSize pulumi.IntPtrInput
	// Provisioned throughput performance in integer MiB/s for a cluster node's root volume. This is only valid with a volumeType of 'gp3'.
	NodeRootVolumeThroughput pulumi.IntPtrInput
	// Configured EBS type for a cluster node's root volume. Default is 'gp2'. Supported values are 'standard', 'gp2', 'gp3', 'st1', 'sc1', 'io1'.
	NodeRootVolumeType pulumi.StringPtrInput
	// The security group for the worker node group to communicate with the cluster.
	//
	// This security group requires specific inbound and outbound rules.
	//
	// See for more details:
	// https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html
	//
	// Note: The `nodeSecurityGroup` option and the cluster option`nodeSecurityGroupTags` are mutually exclusive.
	NodeSecurityGroup ec2.SecurityGroupInput
	// The ID of the security group for the worker node group to communicate with the cluster.
	//
	// This security group requires specific inbound and outbound rules.
	//
	// See for more details:
	// https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html
	//
	// Note: The `nodeSecurityGroupId` option and the cluster option `nodeSecurityGroupTags` are mutually exclusive.
	NodeSecurityGroupId pulumi.StringPtrInput
	// The set of subnets to override and use for the worker node group.
	//
	// Setting this option overrides which subnets to use for the worker node group, regardless if the cluster's `subnetIds` is set, or if `publicSubnetIds` and/or `privateSubnetIds` were set.
	NodeSubnetIds pulumi.StringArrayInput
	// Extra code to run on node startup. This code will run after the AWS EKS bootstrapping code and before the node signals its readiness to the managing CloudFormation stack. This code must be a typical user data script: critically it must begin with an interpreter directive (i.e. a `#!`).
	NodeUserData pulumi.StringPtrInput
	// User specified code to run on node startup. This code is expected to handle the full AWS EKS bootstrapping code and signal node readiness to the managing CloudFormation stack. This code must be a complete and executable user data script in bash (Linux) or powershell (Windows).
	//
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/worker.html
	NodeUserDataOverride pulumi.StringPtrInput
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
	// Bidding price for spot instance. If set, only spot instances will be added as worker node.
	SpotPrice pulumi.StringPtrInput
	// Custom k8s node taints to be attached to each worker node. Adds the given taints to the `--register-with-taints` kubelet argument
	Taints TaintMapInput
	// Desired Kubernetes master / control plane version. If you do not specify a value, the latest available version is used.
	Version pulumi.StringPtrInput
}

func (NodeGroupArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*nodeGroupArgs)(nil)).Elem()
}

type NodeGroupInput interface {
	pulumi.Input

	ToNodeGroupOutput() NodeGroupOutput
	ToNodeGroupOutputWithContext(ctx context.Context) NodeGroupOutput
}

func (*NodeGroup) ElementType() reflect.Type {
	return reflect.TypeOf((**NodeGroup)(nil)).Elem()
}

func (i *NodeGroup) ToNodeGroupOutput() NodeGroupOutput {
	return i.ToNodeGroupOutputWithContext(context.Background())
}

func (i *NodeGroup) ToNodeGroupOutputWithContext(ctx context.Context) NodeGroupOutput {
	return pulumi.ToOutputWithContext(ctx, i).(NodeGroupOutput)
}

// NodeGroupArrayInput is an input type that accepts NodeGroupArray and NodeGroupArrayOutput values.
// You can construct a concrete instance of `NodeGroupArrayInput` via:
//
//	NodeGroupArray{ NodeGroupArgs{...} }
type NodeGroupArrayInput interface {
	pulumi.Input

	ToNodeGroupArrayOutput() NodeGroupArrayOutput
	ToNodeGroupArrayOutputWithContext(context.Context) NodeGroupArrayOutput
}

type NodeGroupArray []NodeGroupInput

func (NodeGroupArray) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*NodeGroup)(nil)).Elem()
}

func (i NodeGroupArray) ToNodeGroupArrayOutput() NodeGroupArrayOutput {
	return i.ToNodeGroupArrayOutputWithContext(context.Background())
}

func (i NodeGroupArray) ToNodeGroupArrayOutputWithContext(ctx context.Context) NodeGroupArrayOutput {
	return pulumi.ToOutputWithContext(ctx, i).(NodeGroupArrayOutput)
}

// NodeGroupMapInput is an input type that accepts NodeGroupMap and NodeGroupMapOutput values.
// You can construct a concrete instance of `NodeGroupMapInput` via:
//
//	NodeGroupMap{ "key": NodeGroupArgs{...} }
type NodeGroupMapInput interface {
	pulumi.Input

	ToNodeGroupMapOutput() NodeGroupMapOutput
	ToNodeGroupMapOutputWithContext(context.Context) NodeGroupMapOutput
}

type NodeGroupMap map[string]NodeGroupInput

func (NodeGroupMap) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*NodeGroup)(nil)).Elem()
}

func (i NodeGroupMap) ToNodeGroupMapOutput() NodeGroupMapOutput {
	return i.ToNodeGroupMapOutputWithContext(context.Background())
}

func (i NodeGroupMap) ToNodeGroupMapOutputWithContext(ctx context.Context) NodeGroupMapOutput {
	return pulumi.ToOutputWithContext(ctx, i).(NodeGroupMapOutput)
}

type NodeGroupOutput struct{ *pulumi.OutputState }

func (NodeGroupOutput) ElementType() reflect.Type {
	return reflect.TypeOf((**NodeGroup)(nil)).Elem()
}

func (o NodeGroupOutput) ToNodeGroupOutput() NodeGroupOutput {
	return o
}

func (o NodeGroupOutput) ToNodeGroupOutputWithContext(ctx context.Context) NodeGroupOutput {
	return o
}

// The AutoScalingGroup name for the Node group.
func (o NodeGroupOutput) AutoScalingGroupName() pulumi.StringOutput {
	return o.ApplyT(func(v *NodeGroup) pulumi.StringOutput { return v.AutoScalingGroupName }).(pulumi.StringOutput)
}

// The CloudFormation Stack which defines the Node AutoScalingGroup.
func (o NodeGroupOutput) CfnStack() cloudformation.StackOutput {
	return o.ApplyT(func(v *NodeGroup) cloudformation.StackOutput { return v.CfnStack }).(cloudformation.StackOutput)
}

// The additional security groups for the node group that captures user-specific rules.
func (o NodeGroupOutput) ExtraNodeSecurityGroups() ec2.SecurityGroupArrayOutput {
	return o.ApplyT(func(v *NodeGroup) ec2.SecurityGroupArrayOutput { return v.ExtraNodeSecurityGroups }).(ec2.SecurityGroupArrayOutput)
}

// The security group for the node group to communicate with the cluster, or undefined if using `nodeSecurityGroupId`.
func (o NodeGroupOutput) NodeSecurityGroup() ec2.SecurityGroupOutput {
	return o.ApplyT(func(v *NodeGroup) ec2.SecurityGroupOutput { return v.NodeSecurityGroup }).(ec2.SecurityGroupOutput)
}

// The ID of the security group for the node group to communicate with the cluster.
func (o NodeGroupOutput) NodeSecurityGroupId() pulumi.StringOutput {
	return o.ApplyT(func(v *NodeGroup) pulumi.StringOutput { return v.NodeSecurityGroupId }).(pulumi.StringOutput)
}

type NodeGroupArrayOutput struct{ *pulumi.OutputState }

func (NodeGroupArrayOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*NodeGroup)(nil)).Elem()
}

func (o NodeGroupArrayOutput) ToNodeGroupArrayOutput() NodeGroupArrayOutput {
	return o
}

func (o NodeGroupArrayOutput) ToNodeGroupArrayOutputWithContext(ctx context.Context) NodeGroupArrayOutput {
	return o
}

func (o NodeGroupArrayOutput) Index(i pulumi.IntInput) NodeGroupOutput {
	return pulumi.All(o, i).ApplyT(func(vs []interface{}) *NodeGroup {
		return vs[0].([]*NodeGroup)[vs[1].(int)]
	}).(NodeGroupOutput)
}

type NodeGroupMapOutput struct{ *pulumi.OutputState }

func (NodeGroupMapOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*NodeGroup)(nil)).Elem()
}

func (o NodeGroupMapOutput) ToNodeGroupMapOutput() NodeGroupMapOutput {
	return o
}

func (o NodeGroupMapOutput) ToNodeGroupMapOutputWithContext(ctx context.Context) NodeGroupMapOutput {
	return o
}

func (o NodeGroupMapOutput) MapIndex(k pulumi.StringInput) NodeGroupOutput {
	return pulumi.All(o, k).ApplyT(func(vs []interface{}) *NodeGroup {
		return vs[0].(map[string]*NodeGroup)[vs[1].(string)]
	}).(NodeGroupOutput)
}

func init() {
	pulumi.RegisterInputType(reflect.TypeOf((*NodeGroupInput)(nil)).Elem(), &NodeGroup{})
	pulumi.RegisterInputType(reflect.TypeOf((*NodeGroupArrayInput)(nil)).Elem(), NodeGroupArray{})
	pulumi.RegisterInputType(reflect.TypeOf((*NodeGroupMapInput)(nil)).Elem(), NodeGroupMap{})
	pulumi.RegisterOutputType(NodeGroupOutput{})
	pulumi.RegisterOutputType(NodeGroupArrayOutput{})
	pulumi.RegisterOutputType(NodeGroupMapOutput{})
}
