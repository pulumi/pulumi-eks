package main

import (
	"fmt"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/iam"
	"github.com/pulumi/pulumi-eks/sdk/v2/go/eks"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

var managedPolicyArns = []string{
	"arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
	"arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
	"arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
}

func createRole(ctx *pulumi.Context, name string) (*iam.Role, error) {
	version := "2012-10-17"
	statementId := "AllowAssumeRole"
	effect := "Allow"
	instanceAssumeRolePolicy, err := iam.GetPolicyDocument(ctx, &iam.GetPolicyDocumentArgs{
		Version: &version,
		Statements: []iam.GetPolicyDocumentStatement{
			{
				Sid:    &statementId,
				Effect: &effect,
				Actions: []string{
					"sts:AssumeRole",
				},
				Principals: []iam.GetPolicyDocumentStatementPrincipal{
					{
						Type: "Service",
						Identifiers: []string{
							"ec2.amazonaws.com",
						},
					},
				},
			},
		},
	}, nil)
	if err != nil {
		return nil, err
	}
	role, err := iam.NewRole(ctx, name, &iam.RoleArgs{
		AssumeRolePolicy: pulumi.String(instanceAssumeRolePolicy.Json),
	})
	if err != nil {
		return nil, err
	}

	for i, policy := range managedPolicyArns {
		_, err := iam.NewRolePolicyAttachment(ctx, fmt.Sprintf("%s-policy-%d", name, i), &iam.RolePolicyAttachmentArgs{
			PolicyArn: pulumi.String(policy),
			Role:      role.ID(),
		})
		if err != nil {
			return nil, err
		}
	}
	return role, nil
}

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		role0, err := createRole(ctx, "example-role0")
		if err != nil {
			return err
		}

		instanceProfile, err := iam.NewInstanceProfile(ctx, "instance-profile", &iam.InstanceProfileArgs{
			Role: role0.Name,
		})
		if err != nil {
			return err
		}

		t := true
		cluster, err := eks.NewCluster(ctx, "example-extra-sg-go", &eks.ClusterArgs{
			SkipDefaultNodeGroup: &t,
			InstanceRoles: iam.RoleArray{
				role0,
			},
		})
		if err != nil {
			return err
		}

		// Export the kubeconfig for the cluster
		ctx.Export("kubeconfig", cluster.Kubeconfig)

		customSG, err := ec2.NewSecurityGroup(ctx, "custom", &ec2.SecurityGroupArgs{
			VpcId:               cluster.Core.VpcId(),
			RevokeRulesOnDelete: pulumi.Bool(true),
		})
		if err != nil {
			return err
		}

		// Create a simple AWS managed node group using a cluster as input and the
		// refactored API.
		_, err = eks.NewNodeGroupV2(ctx,
			"aws-managed-ng0",
			&eks.NodeGroupV2Args{
				Cluster: cluster,
				// Pass the cluster's default security group to the node group to showcase adding a Pulumi input.
				ExtraNodeSecurityGroups: ec2.SecurityGroupArray{
					cluster.NodeSecurityGroup, // Input type
					customSG,                  // Plain type
				},
				InstanceProfile: instanceProfile,
			})
		if err != nil {
			return err
		}

		return nil
	})
}
