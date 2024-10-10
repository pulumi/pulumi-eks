// Code generated by pulumi-gen-eks DO NOT EDIT.
// *** WARNING: Do not edit by hand unless you're certain you know what you are doing! ***

package eks

import (
	"context"
	"reflect"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/iam"
	"github.com/pulumi/pulumi-eks/sdk/v3/go/eks/utilities"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

// ClusterCreationRoleProvider is a component that wraps creating a role provider that can be passed to the `Cluster`'s `creationRoleProvider`. This can be used to provide a specific role to use for the creation of the EKS cluster different from the role being used to run the Pulumi deployment.
type ClusterCreationRoleProvider struct {
	pulumi.ResourceState

	Role *iam.Role `pulumi:"role"`
}

// NewClusterCreationRoleProvider registers a new resource with the given unique name, arguments, and options.
func NewClusterCreationRoleProvider(ctx *pulumi.Context,
	name string, args *ClusterCreationRoleProviderArgs, opts ...pulumi.ResourceOption) (*ClusterCreationRoleProvider, error) {
	if args == nil {
		args = &ClusterCreationRoleProviderArgs{}
	}

	opts = utilities.PkgResourceDefaultOpts(opts)
	var resource ClusterCreationRoleProvider
	err := ctx.RegisterRemoteComponentResource("eks:index:ClusterCreationRoleProvider", name, args, &resource, opts...)
	if err != nil {
		return nil, err
	}
	return &resource, nil
}

type clusterCreationRoleProviderArgs struct {
	Profile *string `pulumi:"profile"`
	Region  *string `pulumi:"region"`
}

// The set of arguments for constructing a ClusterCreationRoleProvider resource.
type ClusterCreationRoleProviderArgs struct {
	Profile pulumi.StringPtrInput
	Region  pulumi.StringPtrInput
}

func (ClusterCreationRoleProviderArgs) ElementType() reflect.Type {
	return reflect.TypeOf((*clusterCreationRoleProviderArgs)(nil)).Elem()
}

type ClusterCreationRoleProviderInput interface {
	pulumi.Input

	ToClusterCreationRoleProviderOutput() ClusterCreationRoleProviderOutput
	ToClusterCreationRoleProviderOutputWithContext(ctx context.Context) ClusterCreationRoleProviderOutput
}

func (*ClusterCreationRoleProvider) ElementType() reflect.Type {
	return reflect.TypeOf((**ClusterCreationRoleProvider)(nil)).Elem()
}

func (i *ClusterCreationRoleProvider) ToClusterCreationRoleProviderOutput() ClusterCreationRoleProviderOutput {
	return i.ToClusterCreationRoleProviderOutputWithContext(context.Background())
}

func (i *ClusterCreationRoleProvider) ToClusterCreationRoleProviderOutputWithContext(ctx context.Context) ClusterCreationRoleProviderOutput {
	return pulumi.ToOutputWithContext(ctx, i).(ClusterCreationRoleProviderOutput)
}

// ClusterCreationRoleProviderArrayInput is an input type that accepts ClusterCreationRoleProviderArray and ClusterCreationRoleProviderArrayOutput values.
// You can construct a concrete instance of `ClusterCreationRoleProviderArrayInput` via:
//
//	ClusterCreationRoleProviderArray{ ClusterCreationRoleProviderArgs{...} }
type ClusterCreationRoleProviderArrayInput interface {
	pulumi.Input

	ToClusterCreationRoleProviderArrayOutput() ClusterCreationRoleProviderArrayOutput
	ToClusterCreationRoleProviderArrayOutputWithContext(context.Context) ClusterCreationRoleProviderArrayOutput
}

type ClusterCreationRoleProviderArray []ClusterCreationRoleProviderInput

func (ClusterCreationRoleProviderArray) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*ClusterCreationRoleProvider)(nil)).Elem()
}

func (i ClusterCreationRoleProviderArray) ToClusterCreationRoleProviderArrayOutput() ClusterCreationRoleProviderArrayOutput {
	return i.ToClusterCreationRoleProviderArrayOutputWithContext(context.Background())
}

func (i ClusterCreationRoleProviderArray) ToClusterCreationRoleProviderArrayOutputWithContext(ctx context.Context) ClusterCreationRoleProviderArrayOutput {
	return pulumi.ToOutputWithContext(ctx, i).(ClusterCreationRoleProviderArrayOutput)
}

// ClusterCreationRoleProviderMapInput is an input type that accepts ClusterCreationRoleProviderMap and ClusterCreationRoleProviderMapOutput values.
// You can construct a concrete instance of `ClusterCreationRoleProviderMapInput` via:
//
//	ClusterCreationRoleProviderMap{ "key": ClusterCreationRoleProviderArgs{...} }
type ClusterCreationRoleProviderMapInput interface {
	pulumi.Input

	ToClusterCreationRoleProviderMapOutput() ClusterCreationRoleProviderMapOutput
	ToClusterCreationRoleProviderMapOutputWithContext(context.Context) ClusterCreationRoleProviderMapOutput
}

type ClusterCreationRoleProviderMap map[string]ClusterCreationRoleProviderInput

func (ClusterCreationRoleProviderMap) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*ClusterCreationRoleProvider)(nil)).Elem()
}

func (i ClusterCreationRoleProviderMap) ToClusterCreationRoleProviderMapOutput() ClusterCreationRoleProviderMapOutput {
	return i.ToClusterCreationRoleProviderMapOutputWithContext(context.Background())
}

func (i ClusterCreationRoleProviderMap) ToClusterCreationRoleProviderMapOutputWithContext(ctx context.Context) ClusterCreationRoleProviderMapOutput {
	return pulumi.ToOutputWithContext(ctx, i).(ClusterCreationRoleProviderMapOutput)
}

type ClusterCreationRoleProviderOutput struct{ *pulumi.OutputState }

func (ClusterCreationRoleProviderOutput) ElementType() reflect.Type {
	return reflect.TypeOf((**ClusterCreationRoleProvider)(nil)).Elem()
}

func (o ClusterCreationRoleProviderOutput) ToClusterCreationRoleProviderOutput() ClusterCreationRoleProviderOutput {
	return o
}

func (o ClusterCreationRoleProviderOutput) ToClusterCreationRoleProviderOutputWithContext(ctx context.Context) ClusterCreationRoleProviderOutput {
	return o
}

func (o ClusterCreationRoleProviderOutput) Role() iam.RoleOutput {
	return o.ApplyT(func(v *ClusterCreationRoleProvider) *iam.Role { return v.Role }).(iam.RoleOutput)
}

type ClusterCreationRoleProviderArrayOutput struct{ *pulumi.OutputState }

func (ClusterCreationRoleProviderArrayOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*[]*ClusterCreationRoleProvider)(nil)).Elem()
}

func (o ClusterCreationRoleProviderArrayOutput) ToClusterCreationRoleProviderArrayOutput() ClusterCreationRoleProviderArrayOutput {
	return o
}

func (o ClusterCreationRoleProviderArrayOutput) ToClusterCreationRoleProviderArrayOutputWithContext(ctx context.Context) ClusterCreationRoleProviderArrayOutput {
	return o
}

func (o ClusterCreationRoleProviderArrayOutput) Index(i pulumi.IntInput) ClusterCreationRoleProviderOutput {
	return pulumi.All(o, i).ApplyT(func(vs []interface{}) *ClusterCreationRoleProvider {
		return vs[0].([]*ClusterCreationRoleProvider)[vs[1].(int)]
	}).(ClusterCreationRoleProviderOutput)
}

type ClusterCreationRoleProviderMapOutput struct{ *pulumi.OutputState }

func (ClusterCreationRoleProviderMapOutput) ElementType() reflect.Type {
	return reflect.TypeOf((*map[string]*ClusterCreationRoleProvider)(nil)).Elem()
}

func (o ClusterCreationRoleProviderMapOutput) ToClusterCreationRoleProviderMapOutput() ClusterCreationRoleProviderMapOutput {
	return o
}

func (o ClusterCreationRoleProviderMapOutput) ToClusterCreationRoleProviderMapOutputWithContext(ctx context.Context) ClusterCreationRoleProviderMapOutput {
	return o
}

func (o ClusterCreationRoleProviderMapOutput) MapIndex(k pulumi.StringInput) ClusterCreationRoleProviderOutput {
	return pulumi.All(o, k).ApplyT(func(vs []interface{}) *ClusterCreationRoleProvider {
		return vs[0].(map[string]*ClusterCreationRoleProvider)[vs[1].(string)]
	}).(ClusterCreationRoleProviderOutput)
}

func init() {
	pulumi.RegisterInputType(reflect.TypeOf((*ClusterCreationRoleProviderInput)(nil)).Elem(), &ClusterCreationRoleProvider{})
	pulumi.RegisterInputType(reflect.TypeOf((*ClusterCreationRoleProviderArrayInput)(nil)).Elem(), ClusterCreationRoleProviderArray{})
	pulumi.RegisterInputType(reflect.TypeOf((*ClusterCreationRoleProviderMapInput)(nil)).Elem(), ClusterCreationRoleProviderMap{})
	pulumi.RegisterOutputType(ClusterCreationRoleProviderOutput{})
	pulumi.RegisterOutputType(ClusterCreationRoleProviderArrayOutput{})
	pulumi.RegisterOutputType(ClusterCreationRoleProviderMapOutput{})
}
