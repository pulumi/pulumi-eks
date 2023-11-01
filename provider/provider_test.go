package provider

import (
	"testing"

	"github.com/pulumi/providertest"
)

func TestExamples(t *testing.T) {
	t.Run("cluster", func(t *testing.T) {
		test(t, "../examples/cluster").Run(t)
	})
}

func TestReportUpgradeCoverage(t *testing.T) {
	providertest.ReportUpgradeCoverage(t)
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
