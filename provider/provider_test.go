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

func test(t *testing.T, dir string, opts ...providertest.Option) *providertest.ProviderTest {
	opts = append(opts,
		providertest.WithProviderName("eks"),

		providertest.WithSkippedUpgradeTestMode(
			providertest.UpgradeTestMode_Quick,
			"Quick mode is only supported for providers written in Go at the moment"),

		providertest.WithBaselineAmbientPlugins(
			providertest.AmbientPlugin{
				Provider: "eks",
				Version:  "1.0.4",
			},
			providertest.AmbientPlugin{
				Provider: "aws",
				Version:  "5.42.0",
			},
		),

		providertest.WithAmbientPlugins(
			providertest.AmbientPlugin{
				Provider:  "eks",
				LocalPath: "../bin/pulumi-resource-eks",
			},
			providertest.AmbientPlugin{
				Provider: "aws",
				Version:  "6.0.2",
			},
		),
	)
	return providertest.NewProviderTest(dir, opts...)
}
