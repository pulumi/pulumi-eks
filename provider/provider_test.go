package provider

import (
	"testing"

	"github.com/pulumi/providertest"
)

func TestExamplesUpgrades(t *testing.T) {
	// It would be easy to extract these invocations into a helper `run(t, dir)` but then they
	// wouldn't be recognized as tests anymore.

	t.Run("cluster", func(t *testing.T) {
		test(t, "../examples/cluster").Run(t)
	})

	// ALT_AWS_PROFILE must be set
	// t.Run("aws-profile", func(t *testing.T) {
	// 	test(t, "../examples/aws-profile").Run(t)
	// })

	t.Run("aws-profile-role", func(t *testing.T) {
		test(t, "../examples/aws-profile-role").Run(t)
	})

	t.Run("encryption-provider", func(t *testing.T) {
		test(t, "../examples/encryption-provider").Run(t)
	})

	t.Run("cluster-with-serviceiprange", func(t *testing.T) {
		test(t, "../examples/cluster-with-serviceiprange").Run(t)
	})

	t.Run("extra-sg", func(t *testing.T) {
		test(t, "../examples/extra-sg").Run(t)
	})

	t.Run("fargate", func(t *testing.T) {
		test(t, "../examples/fargate").Run(t)
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
		test(t, "../examples/modify-default-eks-sg").Run(t)
	})

	// FAIL: Your requested instance type (t2.medium) is not supported in your requested
	// Availability Zone (us-west-2d). Please retry your request by not specifying an
	// Availability Zone or choosing us-west-2a, us-west-2b, us-west-2c.
	// t.Run("nodegroup", func(t *testing.T) {
	// 	test(t, "../examples/nodegroup").Run(t)
	// })

	t.Run("oidc-iam-sa", func(t *testing.T) {
		test(t, "../examples/oidc-iam-sa").Run(t)
	})

	// t.Run("scoped-kubeconfigs", func(t *testing.T) {
	// 	test(t, "../examples/scoped-kubeconfigs").Run(t)
	// })

	// t.Run("storage-classes", func(t *testing.T) {
	// 	test(t, "../examples/storage-classes").Run(t)
	// })

	// t.Run("subnet-tags", func(t *testing.T) {
	// 	test(t, "../examples/subnet-tags").Run(t)
	// })

	// t.Run("tags", func(t *testing.T) {
	// 	test(t, "../examples/tags").Run(t)
	// })
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
	)
	return providertest.NewProviderTest(dir, opts...)
}
