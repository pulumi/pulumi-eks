package provider

import (
	"fmt"
	"testing"

	"github.com/pulumi/providertest"
)

func TestExamples(t *testing.T) {
	t.Run("cluster", func(t *testing.T) {
		runExampleParallel(t, "cluster")
	})

	// ALT_AWS_PROFILE must be set
	// t.Run("aws-profile", func(t *testing.T) {
	// 	test(t, "../examples/aws-profile").Run(t)
	// })

	t.Run("aws-profile-role", func(t *testing.T) {
		runExampleParallel(t, "aws-profile-role")
	})

	t.Run("encryption-provider", func(t *testing.T) {
		runExampleParallel(t, "encryption-provider")
	})

	t.Run("cluster-with-serviceiprange", func(t *testing.T) {
		runExampleParallel(t, "cluster-with-serviceiprange")
	})

	t.Run("extra-sg", func(t *testing.T) {
		runExampleParallel(t, "extra-sg")
	})

	t.Run("fargate", func(t *testing.T) {
		runExampleParallel(t, "fargate")
	})

	// FAIL: waiting for EKS Node Group to create: unexpected state 'CREATE_FAILED', wanted target 'ACTIVE'.
	// Ec2SubnetInvalidConfiguration: One or more Amazon EC2 Subnets of [subnet-0b4f9fb1df1543b07]
	// for node group aws-managed-ng1 does not automatically assign public IP addresses to instances
	// launched into it. If you want your instances to be assigned a public IP address, then you
	// need to enable auto-assign public IP address for the subnet.
	// t.Run("managed-nodegroups", func(t *testing.T) {
	// 	test(t, "../examples/managed-nodegroups").Run(t)
	// })

	t.Run("modify-default-eks-sg", func(t *testing.T) {
		runExampleParallel(t, "modify-default-eks-sg")
	})

	// FAIL: Your requested instance type (t2.medium) is not supported in your requested
	// Availability Zone (us-west-2d). Please retry your request by not specifying an
	// Availability Zone or choosing us-west-2a, us-west-2b, us-west-2c.
	t.Run("nodegroup", func(t *testing.T) {
		runExampleParallel(t, "nodegroup")
	})

	t.Run("oidc-iam-sa", func(t *testing.T) {
		runExampleParallel(t, "oidc-iam-sa")
	})

	t.Run("scoped-kubeconfigs", func(t *testing.T) {
		runExampleParallel(t, "scoped-kubeconfigs")
	})

	t.Run("storage-classes", func(t *testing.T) {
		runExampleParallel(t, "storage-classes")
	})

	t.Run("subnet-tags", func(t *testing.T) {
		runExampleParallel(t, "subnet-tags")
	})

	// FAIL: Your requested instance type (t2.medium) is not supported in your requested
	// Availability Zone (us-west-2d). Please retry your request by not specifying an
	// Availability Zone or choosing us-west-2a, us-west-2b, us-west-2c.
	t.Run("tags", func(t *testing.T) {
		runExampleParallel(t, "tags")
	})
}

func TestReportUpgradeCoverage(t *testing.T) {
	providertest.ReportUpgradeCoverage(t)
}

func runExampleParallel(t *testing.T, example string, opts ...providertest.Option) {
	t.Parallel()
	test(t, fmt.Sprintf("../examples/%s", example), opts...).Run(t)
}

func test(t *testing.T, dir string, opts ...providertest.Option) *providertest.ProviderTest {
	opts = append(opts,
		providertest.WithProviderName("eks"),

		providertest.WithSkippedUpgradeTestMode(
			providertest.UpgradeTestMode_Quick,
			"Quick mode is only supported for providers written in Go at the moment"),

		providertest.WithBaselineVersion("1.0.4"),
		providertest.WithExtraBaselineDependencies(map[string]string{
			"aws":        "5.42.0",
			"kubernetes": "3.30.2",
		}),

		// This region needs to match the one configured in .github for the CI workflows.
		providertest.WithConfig("aws:region", "us-west-2"),
	)
	return providertest.NewProviderTest(dir, opts...)
}
