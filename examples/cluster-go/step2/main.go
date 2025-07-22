package main

import (
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws"
	awseks "github.com/pulumi/pulumi-aws/sdk/v7/go/aws/eks"
	"github.com/pulumi/pulumi-aws/sdk/v7/go/aws/iam"
	"github.com/pulumi/pulumi-eks/sdk/v4/go/eks"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create cluster with default settings
		cluster1, err := eks.NewCluster(ctx, "example-cluster-go-1", nil)
		if err != nil {
			return err
		}

		role, err := iam.NewRole(ctx, "example-cluster-2-role", &iam.RoleArgs{
			AssumeRolePolicy: pulumi.String(`{
				"Version": "2012-10-17",
				"Statement": [{
					"Action": "sts:AssumeRole",
					"Effect": "Allow",
					"Principal": {
						"Service": "ec2.amazonaws.com"
					}
				}]
			}`),
		})
		if err != nil {
			return err
		}

		authMode := eks.AuthenticationModeApiAndConfigMap
		// Create cluster with non-default settings
		cluster2, err := eks.NewCluster(ctx, "example-cluster-2", &eks.ClusterArgs{
			DesiredCapacity: pulumi.IntPtr(2),
			MinSize:         pulumi.IntPtr(2),
			MaxSize:         pulumi.IntPtr(2),
			EnabledClusterLogTypes: pulumi.StringArray{
				pulumi.String("api"),
				pulumi.String("audit"),
				pulumi.String("authenticator"),
			},
			AuthenticationMode: &authMode,
			AccessEntries: map[string]eks.AccessEntryArgs{
				"example-cluster-role": eks.AccessEntryArgs{
					PrincipalArn: role.Arn,
					AccessPolicies: map[string]eks.AccessPolicyAssociationInput{
						"view": eks.AccessPolicyAssociationArgs{
							PolicyArn: pulumi.String("arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy"),
							AccessScope: awseks.AccessPolicyAssociationAccessScopeArgs{
								Type: pulumi.String("namespace"),
								Namespaces: pulumi.StringArray{
									pulumi.String("default"),
								},
							},
						},
					},
				},
			},
		})
		if err != nil {
			return err
		}

		// Create a cluster that avoids conflicts between default settings and mutually exclusive arguments
		// https://github.com/pulumi/pulumi-eks/pull/813
		cluster3, err := eks.NewCluster(ctx, "example-cluster-3", &eks.ClusterArgs{
			NodeGroupOptions: &eks.ClusterNodeGroupOptionsArgs{
				DesiredCapacity:          pulumi.IntPtr(2),
				MinSize:                  pulumi.IntPtr(2),
				MaxSize:                  pulumi.IntPtr(2),
				EnableDetailedMonitoring: pulumi.Bool(false),
			},
		})
		if err != nil {
			return err
		}

		////////////////////////////////////////////////
		///     CreationRoleProvider should fail     ///
		////////////////////////////////////////////////

		// Create AWS provider
		awsProv, err := aws.NewProvider(ctx, "aws", nil)
		if err != nil {
			return err
		}

		// Create cluster with CreationRoleProvider
		cluster5, err := eks.NewCluster(ctx, "example-cluster-5", &eks.ClusterArgs{
			DesiredCapacity: pulumi.IntPtr(2),
			MinSize:         pulumi.IntPtr(2),
			MaxSize:         pulumi.IntPtr(2),
			CreationRoleProvider: &eks.CreationRoleProviderArgs{
				Provider: awsProv,
			},
			EnabledClusterLogTypes: pulumi.StringArray{
				pulumi.String("api"),
				pulumi.String("audit"),
				pulumi.String("authenticator"),
			},
		})
		if err != nil {
			return err
		}

		//////////////////////////////////////////
		///     Export cluster kubeconfigs     ///
		//////////////////////////////////////////

		ctx.Export("kubeconfig1", cluster1.Kubeconfig)
		ctx.Export("kubeconfig2", cluster2.Kubeconfig)
		ctx.Export("kubeconfig3", cluster3.Kubeconfig)
		ctx.Export("kubeconfig5", cluster5.Kubeconfig)
		return nil
	})
}
