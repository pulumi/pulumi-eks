package provider

import (
	"fmt"
	"log"
	"strings"
	"testing"

	"github.com/pulumi/providertest"
	"github.com/stretchr/testify/assert"
)

func TestExamplesUpgrades(t *testing.T) {
	t.Run("cluster", func(t *testing.T) {
		runExampleParallel(t, "cluster")
	})

	t.Run("aws-profile", func(t *testing.T) {
		t.Skip("Fails with 'ALT_AWS_PROFILE must be set'")
		runExampleParallel(t, "aws-profile")
	})

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
		t.Skip("upgradetest doesn't understand invoke getSecurityGroup, tracked by providertest #31")
		runExampleParallel(t, "fargate")
	})

	t.Run("managed-nodegroups", func(t *testing.T) {
		runExampleParallel(t, "managed-nodegroups")
	})

	t.Run("modify-default-eks-sg", func(t *testing.T) {
		t.Skip("upgradetest doesn't understand invoke aws:ec2/getSecurityGroup:getSecurityGroup")
		runExampleParallel(t, "modify-default-eks-sg")
	})

	t.Run("nodegroup", func(t *testing.T) {
		runExampleParallel(t, "nodegroup")
	})

	t.Run("oidc-iam-sa", func(t *testing.T) {
		runExampleParallel(t, "oidc-iam-sa")
	})

	t.Run("scoped-kubeconfigs", func(t *testing.T) {
		t.Skip("Requires source change for args of GetCallerIdentityArgs")
		runExampleParallel(t, "scoped-kubeconfigs")
	})

	t.Run("storage-classes", func(t *testing.T) {
		runExampleParallel(t, "storage-classes")
	})

	t.Run("subnet-tags", func(t *testing.T) {
		runExampleParallel(t, "subnet-tags")
	})

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
	eksDiffValidation := func(t *testing.T, diffs providertest.Diffs) {
		for _, diff := range diffs {
			if !diff.HasChanges {
				continue
			}

			if strings.Contains(string(diff.URN), "pulumi:providers:kubernetes::") &&
				len(diff.Diffs) == 1 &&
				diff.Diffs[0] == "version" {
				log.Println("Ignoring version change for kubernetes provider")
				continue
			}

			assert.Falsef(t, diff.HasChanges, "Unexpected difference: %+v", diff)
		}
	}

	opts = append(opts,
		providertest.WithProviderName("eks"),

		providertest.WithSkippedUpgradeTestMode(
			providertest.UpgradeTestMode_Quick,
			"Quick mode is only supported for providers written in Go at the moment"),

		providertest.WithBaselineVersion("2.2.1"),
		providertest.WithExtraBaselineDependencies(map[string]string{
			"aws":        "6.23.0",
			"kubernetes": "4.8.0",
		}),

		// This region needs to match the one configured in .github for the CI workflows.
		providertest.WithConfig("aws:region", "us-west-2"),

		providertest.WithDiffValidation(eksDiffValidation),
	)
	return providertest.NewProviderTest(dir, opts...)
}
