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

// we can't support programs not written in yaml eh?

func test(t *testing.T, dir string, opts ...providertest.Option) *providertest.ProviderTest {
	opts = append(opts,
		providertest.WithProviderName("eks"),
		providertest.WithBaselineVersion("1.0.4"),
		// providertest.WithConfig("gcp:project", "pulumi-development"),
		// providertest.WithResourceProviderServer(providerServer(t)))
	)
	return providertest.NewProviderTest(dir, opts...)
}
