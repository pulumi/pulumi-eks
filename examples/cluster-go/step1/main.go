package main

import (
	"fmt"
	"strings"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
	awseks "github.com/pulumi/pulumi-aws/sdk/v6/go/aws/eks"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/iam"
	"github.com/pulumi/pulumi-eks/sdk/v2/go/eks"
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
				"example-cluster-role": {
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

		//////////////////////////////////////////////////
		///     Create an ipv6 enabled EKS cluster     ///
		//////////////////////////////////////////////////

		// 1. Create a VPC with IPv6 CIDR block.
		vpc, err := ec2.NewVpc(ctx, "ipv6-vpc", &ec2.VpcArgs{
			AssignGeneratedIpv6CidrBlock: pulumi.Bool(true),
			EnableDnsSupport:             pulumi.Bool(true),
			EnableDnsHostnames:           pulumi.Bool(true),
			CidrBlock:                    pulumi.String("10.100.0.0/16"),
		})
		if err != nil {
			return err
		}

		// 2. Create two subnets with IPv6 CIDR block in two different availability zones.
		//    EKS requires at least two subnets in different availability zones.
		var subnetIDs []pulumi.StringInput
		for idx, az := range []string{"us-west-2a", "us-west-2b"} {
			subnet, err := ec2.NewSubnet(ctx, fmt.Sprintf("ipv6-subnet-%d", idx), &ec2.SubnetArgs{
				VpcId:                       vpc.ID().ToStringOutput(),
				AssignIpv6AddressOnCreation: pulumi.Bool(true),
				AvailabilityZone:            pulumi.String(az),
				CidrBlock:                   pulumi.String(fmt.Sprintf("10.100.%d.0/24", len(subnetIDs))),
				Ipv6CidrBlock:               calculateIPV6CidrBlock(vpc.Ipv6CidrBlock, idx),
			})
			if err != nil {
				return err
			}

			subnetIDs = append(subnetIDs, subnet.ID().ToStringOutput())
		}

		// 3. Create an EKS cluster with IPv6 networking enabled.
		cluster4, err := eks.NewCluster(ctx, "example-cluster-4", &eks.ClusterArgs{
			IpFamily:         pulumi.StringPtr("ipv6"),
			VpcId:            vpc.ID().ToStringOutput(),
			SubnetIds:        pulumi.StringArray(subnetIDs),
			NodeGroupOptions: &eks.ClusterNodeGroupOptionsArgs{
				DesiredCapacity: pulumi.IntPtr(2),
				MinSize:         pulumi.IntPtr(2),
				MaxSize:         pulumi.IntPtr(2),
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
		ctx.Export("kubeconfig4", cluster4.Kubeconfig)
		return nil
	})
}

// calculateIPV6CidrBlock is a very simple function to calculate the ipv6 subnet cidr block for testing purpose.
// Usage for real workloads should implement a more robust function.
// Example: If the VPC ipv6 cidr block is 2600:1f13:e6:c000::/56, then the subnet ipv6 cidr block will be:
// 2600:1f13:e6:c005::/64, 2600:1f13:e6:c006::/64, 2600:1f13:e6:c007::/64, ...
func calculateIPV6CidrBlock(ipv6CidrBlock pulumi.StringOutput, subnetID int) pulumi.StringInput {
	return ipv6CidrBlock.ApplyT(func(cidr string) (string, error) {
		cidrStripped := strings.TrimSuffix(cidr, "::/56")
		cidrStripped = cidrStripped[:len(cidrStripped)-1]
		return fmt.Sprintf("%s%d::/64", cidrStripped, subnetID+5), nil

	}).(pulumi.StringOutput)
}
