package main

import (
	"fmt"

	"github.com/pulumi/pulumi-aws/sdk/v5/go/aws/iam"
	"github.com/pulumi/pulumi-eks/sdk/go/eks"
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
		role1, err := createRole(ctx, "example-role1")
		if err != nil {
			return err
		}
		role2, err := createRole(ctx, "example-role2")
		if err != nil {
			return err
		}

		cluster, err := eks.NewCluster(ctx, "example-managed-nodegroups-go", &eks.ClusterArgs{
			SkipDefaultNodeGroup: pulumi.BoolPtr(true),
			InstanceRoles: iam.RoleArray{
				role0,
				role1,
				role2,
			},
		})
		if err != nil {
			return err
		}

		// Export the kubeconfig for the cluster
		ctx.Export("kubeconfig", cluster.Kubeconfig)

		// Create a simple AWS managed node group using a cluster as input and the
		// refactored API.
		_, err = eks.NewManagedNodeGroup(ctx,
			"aws-managed-ng0",
			&eks.ManagedNodeGroupArgs{
				Cluster:  cluster.Core,
				NodeRole: role0,
			})
		if err != nil {
			return err
		}

		// Create a simple AWS managed node group using a cluster as input and the
		// refactored API.
		_, err = eks.NewManagedNodeGroup(ctx,
			"example-managed-ng1",
			&eks.ManagedNodeGroupArgs{
				Cluster:       cluster.Core,
				NodeGroupName: pulumi.String("aws-managed-ng1"),
				NodeRoleArn:   role1.Arn,
			})
		if err != nil {
			return err
		}

		_, err = eks.NewManagedNodeGroup(ctx,
			"example-managed-ng2",
			&eks.ManagedNodeGroupArgs{
				Cluster:       cluster.Core,
				NodeGroupName: pulumi.String("aws-managed-ng2"),
				NodeRoleArn:   role2.Arn,
				DiskSize:      pulumi.Int(20),
				InstanceTypes: pulumi.StringArray{pulumi.String("t2.medium")},
				Labels:        pulumi.StringMap{"ondemand": pulumi.String("true")},
				Tags:          pulumi.StringMap{"org": pulumi.String("pulumi")},
			})
		if err != nil {
			return err
		}

		return nil
	})
}
