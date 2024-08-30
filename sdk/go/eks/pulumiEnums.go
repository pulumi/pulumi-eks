// Code generated by pulumi-gen-eks DO NOT EDIT.
// *** WARNING: Do not edit by hand unless you're certain you know what you are doing! ***

package eks

import (
	"context"
	"reflect"

	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

// The type of the new access entry. Valid values are STANDARD, FARGATE_LINUX, EC2_LINUX, and EC2_WINDOWS.
// Defaults to STANDARD which provides the standard workflow. EC2_LINUX and EC2_WINDOWS types disallow users to input a kubernetesGroup, and prevent associating access policies.
type AccessEntryType string

const (
	// Standard Access Entry Workflow. Allows users to input a username and kubernetesGroup, and to associate access policies.
	AccessEntryTypeStandard = AccessEntryType("STANDARD")
	// For IAM roles used with AWS Fargate profiles.
	AccessEntryTypeFargateLinux = AccessEntryType("FARGATE_LINUX")
	// For IAM roles associated with self-managed Linux node groups. Allows the nodes to join the cluster.
	AccessEntryTypeEC2Linux = AccessEntryType("EC2_LINUX")
	// For IAM roles associated with self-managed Windows node groups. Allows the nodes to join the cluster.
	AccessEntryTypeEC2Windows = AccessEntryType("EC2_WINDOWS")
)

func (AccessEntryType) ElementType() reflect.Type {
	return reflect.TypeOf((*AccessEntryType)(nil)).Elem()
}

func (e AccessEntryType) ToAccessEntryTypeOutput() AccessEntryTypeOutput {
	return pulumi.ToOutput(e).(AccessEntryTypeOutput)
}

func (e AccessEntryType) ToAccessEntryTypeOutputWithContext(ctx context.Context) AccessEntryTypeOutput {
	return pulumi.ToOutputWithContext(ctx, e).(AccessEntryTypeOutput)
}

func (e AccessEntryType) ToAccessEntryTypePtrOutput() AccessEntryTypePtrOutput {
	return e.ToAccessEntryTypePtrOutputWithContext(context.Background())
}

func (e AccessEntryType) ToAccessEntryTypePtrOutputWithContext(ctx context.Context) AccessEntryTypePtrOutput {
	return AccessEntryType(e).ToAccessEntryTypeOutputWithContext(ctx).ToAccessEntryTypePtrOutputWithContext(ctx)
}

func (e AccessEntryType) ToStringOutput() pulumi.StringOutput {
	return pulumi.ToOutput(pulumi.String(e)).(pulumi.StringOutput)
}

func (e AccessEntryType) ToStringOutputWithContext(ctx context.Context) pulumi.StringOutput {
	return pulumi.ToOutputWithContext(ctx, pulumi.String(e)).(pulumi.StringOutput)
}

func (e AccessEntryType) ToStringPtrOutput() pulumi.StringPtrOutput {
	return pulumi.String(e).ToStringPtrOutputWithContext(context.Background())
}

func (e AccessEntryType) ToStringPtrOutputWithContext(ctx context.Context) pulumi.StringPtrOutput {
	return pulumi.String(e).ToStringOutputWithContext(ctx).ToStringPtrOutputWithContext(ctx)
}

type AccessEntryTypeOutput struct{ *pulumi.OutputState }

func (AccessEntryTypeOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*AccessEntryType)(nil)).Elem()
}

func (o AccessEntryTypeOutput) ToAccessEntryTypeOutput() AccessEntryTypeOutput {
	return o
}

func (o AccessEntryTypeOutput) ToAccessEntryTypeOutputWithContext(ctx context.Context) AccessEntryTypeOutput {
	return o
}

func (o AccessEntryTypeOutput) ToAccessEntryTypePtrOutput() AccessEntryTypePtrOutput {
	return o.ToAccessEntryTypePtrOutputWithContext(context.Background())
}

func (o AccessEntryTypeOutput) ToAccessEntryTypePtrOutputWithContext(ctx context.Context) AccessEntryTypePtrOutput {
	return o.ApplyTWithContext(ctx, func(_ context.Context, v AccessEntryType) *AccessEntryType {
		return &v
	}).(AccessEntryTypePtrOutput)
}

func (o AccessEntryTypeOutput) ToStringOutput() pulumi.StringOutput {
	return o.ToStringOutputWithContext(context.Background())
}

func (o AccessEntryTypeOutput) ToStringOutputWithContext(ctx context.Context) pulumi.StringOutput {
	return o.ApplyTWithContext(ctx, func(_ context.Context, e AccessEntryType) string {
		return string(e)
	}).(pulumi.StringOutput)
}

func (o AccessEntryTypeOutput) ToStringPtrOutput() pulumi.StringPtrOutput {
	return o.ToStringPtrOutputWithContext(context.Background())
}

func (o AccessEntryTypeOutput) ToStringPtrOutputWithContext(ctx context.Context) pulumi.StringPtrOutput {
	return o.ApplyTWithContext(ctx, func(_ context.Context, e AccessEntryType) *string {
		v := string(e)
		return &v
	}).(pulumi.StringPtrOutput)
}

type AccessEntryTypePtrOutput struct{ *pulumi.OutputState }

func (AccessEntryTypePtrOutput) ElementType() reflect.Type {
	return reflect.TypeOf((**AccessEntryType)(nil)).Elem()
}

func (o AccessEntryTypePtrOutput) ToAccessEntryTypePtrOutput() AccessEntryTypePtrOutput {
	return o
}

func (o AccessEntryTypePtrOutput) ToAccessEntryTypePtrOutputWithContext(ctx context.Context) AccessEntryTypePtrOutput {
	return o
}

func (o AccessEntryTypePtrOutput) Elem() AccessEntryTypeOutput {
	return o.ApplyT(func(v *AccessEntryType) AccessEntryType {
		if v != nil {
			return *v
		}
		var ret AccessEntryType
		return ret
	}).(AccessEntryTypeOutput)
}

func (o AccessEntryTypePtrOutput) ToStringPtrOutput() pulumi.StringPtrOutput {
	return o.ToStringPtrOutputWithContext(context.Background())
}

func (o AccessEntryTypePtrOutput) ToStringPtrOutputWithContext(ctx context.Context) pulumi.StringPtrOutput {
	return o.ApplyTWithContext(ctx, func(_ context.Context, e *AccessEntryType) *string {
		if e == nil {
			return nil
		}
		v := string(*e)
		return &v
	}).(pulumi.StringPtrOutput)
}

// AccessEntryTypeInput is an input type that accepts values of the AccessEntryType enum
// A concrete instance of `AccessEntryTypeInput` can be one of the following:
//
//	AccessEntryTypeStandard
//	AccessEntryTypeFargateLinux
//	AccessEntryTypeEC2Linux
//	AccessEntryTypeEC2Windows
type AccessEntryTypeInput interface {
	pulumi.Input

	ToAccessEntryTypeOutput() AccessEntryTypeOutput
	ToAccessEntryTypeOutputWithContext(context.Context) AccessEntryTypeOutput
}

var accessEntryTypePtrType = reflect.TypeOf((**AccessEntryType)(nil)).Elem()

type AccessEntryTypePtrInput interface {
	pulumi.Input

	ToAccessEntryTypePtrOutput() AccessEntryTypePtrOutput
	ToAccessEntryTypePtrOutputWithContext(context.Context) AccessEntryTypePtrOutput
}

type accessEntryTypePtr string

func AccessEntryTypePtr(v string) AccessEntryTypePtrInput {
	return (*accessEntryTypePtr)(&v)
}

func (*accessEntryTypePtr) ElementType() reflect.Type {
	return accessEntryTypePtrType
}

func (in *accessEntryTypePtr) ToAccessEntryTypePtrOutput() AccessEntryTypePtrOutput {
	return pulumi.ToOutput(in).(AccessEntryTypePtrOutput)
}

func (in *accessEntryTypePtr) ToAccessEntryTypePtrOutputWithContext(ctx context.Context) AccessEntryTypePtrOutput {
	return pulumi.ToOutputWithContext(ctx, in).(AccessEntryTypePtrOutput)
}

// Predefined AMI types for EKS optimized AMIs. Can be used to select the latest EKS optimized AMI for a node group.
type AmiType string

const (
	AmiType_AL2X86_64                = AmiType("AL2_x86_64")
	AmiType_AL2X86_64GPU             = AmiType("AL2_x86_64_GPU")
	AmiTypeAL2Arm64                  = AmiType("AL2_ARM_64")
	AmiType_AL2023X86_64Standard     = AmiType("AL2023_x86_64_STANDARD")
	AmiTypeAL2023Arm64Standard       = AmiType("AL2023_ARM_64_STANDARD")
	AmiTypeBottlerocketArm64         = AmiType("BOTTLEROCKET_ARM_64")
	AmiType_BottlerocketX86_64       = AmiType("BOTTLEROCKET_x86_64")
	AmiTypeBottlerocketArm64Nvidia   = AmiType("BOTTLEROCKET_ARM_64_NVIDIA")
	AmiType_BottlerocketX86_64Nvidia = AmiType("BOTTLEROCKET_x86_64_NVIDIA")
)

// The authentication mode of the cluster. Valid values are `CONFIG_MAP`, `API` or `API_AND_CONFIG_MAP`.
//
// See for more details:
// https://docs.aws.amazon.com/eks/latest/userguide/grant-k8s-access.html#set-cam
type AuthenticationMode string

const (
	// Only aws-auth ConfigMap will be used for authenticating to the Kubernetes API.
	//
	// Deprecated: The aws-auth ConfigMap is deprecated. The recommended method to manage access to Kubernetes APIs is Access Entries with the AuthenticationMode API.
	// For more information and instructions how to upgrade, see https://docs.aws.amazon.com/eks/latest/userguide/migrating-access-entries.html.
	AuthenticationModeConfigMap = AuthenticationMode("CONFIG_MAP")
	// Only Access Entries will be used for authenticating to the Kubernetes API.
	AuthenticationModeApi = AuthenticationMode("API")
	// Both aws-auth ConfigMap and Access Entries can be used for authenticating to the Kubernetes API.
	//
	// Deprecated: The aws-auth ConfigMap is deprecated. The recommended method to manage access to Kubernetes APIs is Access Entries with the AuthenticationMode API.
	// For more information and instructions how to upgrade, see https://docs.aws.amazon.com/eks/latest/userguide/migrating-access-entries.html.
	AuthenticationModeApiAndConfigMap = AuthenticationMode("API_AND_CONFIG_MAP")
)

// The type of EKS optimized Operating System to use for node groups.
//
// See for more details:
// https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-amis.html
type OperatingSystem string

const (
	// EKS optimized OS based on Amazon Linux 2 (AL2).
	//
	// Deprecated: Amazon Linux 2 is deprecated. Please use Amazon Linux 2023 instead.
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/al2023.html
	OperatingSystemAL2 = OperatingSystem("AL2")
	// EKS optimized OS based on Amazon Linux 2023 (AL2023).
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
	OperatingSystemAL2023 = OperatingSystem("AL2023")
	// EKS optimized Container OS based on Bottlerocket.
	// See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami-bottlerocket.html
	OperatingSystemBottlerocket = OperatingSystem("Bottlerocket")
)

func (OperatingSystem) ElementType() reflect.Type {
	return reflect.TypeOf((*OperatingSystem)(nil)).Elem()
}

func (e OperatingSystem) ToOperatingSystemOutput() OperatingSystemOutput {
	return pulumi.ToOutput(e).(OperatingSystemOutput)
}

func (e OperatingSystem) ToOperatingSystemOutputWithContext(ctx context.Context) OperatingSystemOutput {
	return pulumi.ToOutputWithContext(ctx, e).(OperatingSystemOutput)
}

func (e OperatingSystem) ToOperatingSystemPtrOutput() OperatingSystemPtrOutput {
	return e.ToOperatingSystemPtrOutputWithContext(context.Background())
}

func (e OperatingSystem) ToOperatingSystemPtrOutputWithContext(ctx context.Context) OperatingSystemPtrOutput {
	return OperatingSystem(e).ToOperatingSystemOutputWithContext(ctx).ToOperatingSystemPtrOutputWithContext(ctx)
}

func (e OperatingSystem) ToStringOutput() pulumi.StringOutput {
	return pulumi.ToOutput(pulumi.String(e)).(pulumi.StringOutput)
}

func (e OperatingSystem) ToStringOutputWithContext(ctx context.Context) pulumi.StringOutput {
	return pulumi.ToOutputWithContext(ctx, pulumi.String(e)).(pulumi.StringOutput)
}

func (e OperatingSystem) ToStringPtrOutput() pulumi.StringPtrOutput {
	return pulumi.String(e).ToStringPtrOutputWithContext(context.Background())
}

func (e OperatingSystem) ToStringPtrOutputWithContext(ctx context.Context) pulumi.StringPtrOutput {
	return pulumi.String(e).ToStringOutputWithContext(ctx).ToStringPtrOutputWithContext(ctx)
}

type OperatingSystemOutput struct{ *pulumi.OutputState }

func (OperatingSystemOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*OperatingSystem)(nil)).Elem()
}

func (o OperatingSystemOutput) ToOperatingSystemOutput() OperatingSystemOutput {
	return o
}

func (o OperatingSystemOutput) ToOperatingSystemOutputWithContext(ctx context.Context) OperatingSystemOutput {
	return o
}

func (o OperatingSystemOutput) ToOperatingSystemPtrOutput() OperatingSystemPtrOutput {
	return o.ToOperatingSystemPtrOutputWithContext(context.Background())
}

func (o OperatingSystemOutput) ToOperatingSystemPtrOutputWithContext(ctx context.Context) OperatingSystemPtrOutput {
	return o.ApplyTWithContext(ctx, func(_ context.Context, v OperatingSystem) *OperatingSystem {
		return &v
	}).(OperatingSystemPtrOutput)
}

func (o OperatingSystemOutput) ToStringOutput() pulumi.StringOutput {
	return o.ToStringOutputWithContext(context.Background())
}

func (o OperatingSystemOutput) ToStringOutputWithContext(ctx context.Context) pulumi.StringOutput {
	return o.ApplyTWithContext(ctx, func(_ context.Context, e OperatingSystem) string {
		return string(e)
	}).(pulumi.StringOutput)
}

func (o OperatingSystemOutput) ToStringPtrOutput() pulumi.StringPtrOutput {
	return o.ToStringPtrOutputWithContext(context.Background())
}

func (o OperatingSystemOutput) ToStringPtrOutputWithContext(ctx context.Context) pulumi.StringPtrOutput {
	return o.ApplyTWithContext(ctx, func(_ context.Context, e OperatingSystem) *string {
		v := string(e)
		return &v
	}).(pulumi.StringPtrOutput)
}

type OperatingSystemPtrOutput struct{ *pulumi.OutputState }

func (OperatingSystemPtrOutput) ElementType() reflect.Type {
	return reflect.TypeOf((**OperatingSystem)(nil)).Elem()
}

func (o OperatingSystemPtrOutput) ToOperatingSystemPtrOutput() OperatingSystemPtrOutput {
	return o
}

func (o OperatingSystemPtrOutput) ToOperatingSystemPtrOutputWithContext(ctx context.Context) OperatingSystemPtrOutput {
	return o
}

func (o OperatingSystemPtrOutput) Elem() OperatingSystemOutput {
	return o.ApplyT(func(v *OperatingSystem) OperatingSystem {
		if v != nil {
			return *v
		}
		var ret OperatingSystem
		return ret
	}).(OperatingSystemOutput)
}

func (o OperatingSystemPtrOutput) ToStringPtrOutput() pulumi.StringPtrOutput {
	return o.ToStringPtrOutputWithContext(context.Background())
}

func (o OperatingSystemPtrOutput) ToStringPtrOutputWithContext(ctx context.Context) pulumi.StringPtrOutput {
	return o.ApplyTWithContext(ctx, func(_ context.Context, e *OperatingSystem) *string {
		if e == nil {
			return nil
		}
		v := string(*e)
		return &v
	}).(pulumi.StringPtrOutput)
}

// OperatingSystemInput is an input type that accepts values of the OperatingSystem enum
// A concrete instance of `OperatingSystemInput` can be one of the following:
//
//	OperatingSystemAL2023
//	OperatingSystemBottlerocket
type OperatingSystemInput interface {
	pulumi.Input

	ToOperatingSystemOutput() OperatingSystemOutput
	ToOperatingSystemOutputWithContext(context.Context) OperatingSystemOutput
}

var operatingSystemPtrType = reflect.TypeOf((**OperatingSystem)(nil)).Elem()

type OperatingSystemPtrInput interface {
	pulumi.Input

	ToOperatingSystemPtrOutput() OperatingSystemPtrOutput
	ToOperatingSystemPtrOutputWithContext(context.Context) OperatingSystemPtrOutput
}

type operatingSystemPtr string

func OperatingSystemPtr(v string) OperatingSystemPtrInput {
	return (*operatingSystemPtr)(&v)
}

func (*operatingSystemPtr) ElementType() reflect.Type {
	return operatingSystemPtrType
}

func (in *operatingSystemPtr) ToOperatingSystemPtrOutput() OperatingSystemPtrOutput {
	return pulumi.ToOutput(in).(OperatingSystemPtrOutput)
}

func (in *operatingSystemPtr) ToOperatingSystemPtrOutputWithContext(ctx context.Context) OperatingSystemPtrOutput {
	return pulumi.ToOutputWithContext(ctx, in).(OperatingSystemPtrOutput)
}

func init() {
	pulumi.RegisterInputType(reflect.TypeOf((*AccessEntryTypeInput)(nil)).Elem(), AccessEntryType("STANDARD"))
	pulumi.RegisterInputType(reflect.TypeOf((*AccessEntryTypePtrInput)(nil)).Elem(), AccessEntryType("STANDARD"))
	pulumi.RegisterInputType(reflect.TypeOf((*OperatingSystemInput)(nil)).Elem(), OperatingSystem("AL2"))
	pulumi.RegisterInputType(reflect.TypeOf((*OperatingSystemPtrInput)(nil)).Elem(), OperatingSystem("AL2"))
	pulumi.RegisterOutputType(AccessEntryTypeOutput{})
	pulumi.RegisterOutputType(AccessEntryTypePtrOutput{})
	pulumi.RegisterOutputType(OperatingSystemOutput{})
	pulumi.RegisterOutputType(OperatingSystemPtrOutput{})
}
