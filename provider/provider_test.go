package provider

import (
	"os"
	"path/filepath"
	"testing"

	"fmt"
	"github.com/pulumi/providertest"
	"github.com/pulumi/providertest/optproviderupgrade"
	"github.com/pulumi/providertest/pulumitest"
	"github.com/pulumi/providertest/pulumitest/assertpreview"
	"github.com/pulumi/providertest/pulumitest/opttest"
	"github.com/stretchr/testify/require"
)

const (
	// The baseline version is the version of the provider that the upgrade tests will be run against.
	baselineVersion = "2.5.2"
	providerName    = "eks"
)

func TestExamplesUpgrades(t *testing.T) {
	t.Run("cluster", func(t *testing.T) {
		testProviderUpgrade(t, "cluster")
	})

	t.Run("aws-profile", func(t *testing.T) {
		t.Skip("Fails with 'ALT_AWS_PROFILE must be set'")
		testProviderUpgrade(t, "aws-profile")
	})

	t.Run("aws-profile-role", func(t *testing.T) {
		testProviderUpgrade(t, "aws-profile-role")
	})

	t.Run("encryption-provider", func(t *testing.T) {
		testProviderUpgrade(t, "encryption-provider")
	})

	t.Run("cluster-with-serviceiprange", func(t *testing.T) {
		testProviderUpgrade(t, "cluster-with-serviceiprange")
	})

	t.Run("extra-sg", func(t *testing.T) {
		testProviderUpgrade(t, "extra-sg")
	})

	t.Run("fargate", func(t *testing.T) {
		t.Skip("upgradetest doesn't understand invoke getSecurityGroup, tracked by providertest #31")
		testProviderUpgrade(t, "fargate")
	})

	t.Run("managed-nodegroups", func(t *testing.T) {
		testProviderUpgrade(t, "managed-nodegroups")
	})

	t.Run("modify-default-eks-sg", func(t *testing.T) {
		t.Skip("upgradetest doesn't understand invoke aws:ec2/getSecurityGroup:getSecurityGroup")
		testProviderUpgrade(t, "modify-default-eks-sg")
	})

	t.Run("nodegroup", func(t *testing.T) {
		testProviderUpgrade(t, "nodegroup")
	})

	t.Run("oidc-iam-sa", func(t *testing.T) {
		testProviderUpgrade(t, "oidc-iam-sa")
	})

	t.Run("scoped-kubeconfigs", func(t *testing.T) {
		t.Skip("Requires source change for args of GetCallerIdentityArgs")
		testProviderUpgrade(t, "scoped-kubeconfigs")
	})

	t.Run("storage-classes", func(t *testing.T) {
		testProviderUpgrade(t, "storage-classes")
	})

	t.Run("subnet-tags", func(t *testing.T) {
		testProviderUpgrade(t, "subnet-tags")
	})

	t.Run("tags", func(t *testing.T) {
		testProviderUpgrade(t, "tags")
	})
}

func TestReportUpgradeCoverage(t *testing.T) {
	providertest.ReportUpgradeCoverage(t)
}

func TestEksClusterInputValidations(t *testing.T) {
	props := []string{"instanceRoles", "roleMappings", "userMappings"}
	for _, p := range props {
		for n := 0; n < 2; n++ {
			t.Run(fmt.Sprintf("%s_%d", p, n), func(t *testing.T) {
				checkEksClusterInputValidations(t, p, n, n > 0)
			})
		}
	}
}

func checkEksClusterInputValidations(t *testing.T, property string, n int, expectFailure bool) {
	cwd, err := os.Getwd()
	require.NoError(t, err)
	dir := filepath.Join("test-programs", "cluster-input-validations")
	options := []opttest.Option{
		opttest.LocalProviderPath("eks", filepath.Join(cwd, "..", "bin")),
		opttest.YarnLink("@pulumi/eks"),
	}
	tw := &testWrapper{PT: t, expectFailure: expectFailure}
	test := pulumitest.NewPulumiTest(tw, dir, options...)
	test.SetConfig("property", property)
	test.SetConfig("n", fmt.Sprintf("%d", n))
	test.Preview()
	if expectFailure {
		require.Truef(t, tw.failed, "Expected preview to fail due to invalid inputs but it succeeded")
	}
}

type testWrapper struct {
	pulumitest.PT
	expectFailure bool
	failed        bool
}

func (tw *testWrapper) FailNow() {
	if tw.expectFailure {
		tw.PT.Log("Ignoring expected FailNow()")
		tw.failed = true
	} else {
		tw.PT.FailNow()
	}
}

func testProviderUpgrade(t *testing.T, example string) {
	if testing.Short() {
		t.Skip("Skipping provider upgrade tests in short mode")
	}
	t.Parallel()
	t.Helper()
	dir := filepath.Join("../examples", example)

	cwd, err := os.Getwd()
	require.NoError(t, err)
	options := []opttest.Option{
		opttest.DownloadProviderVersion(providerName, baselineVersion),
		opttest.LocalProviderPath("eks", filepath.Join(cwd, "..", "bin")),
		opttest.YarnLink("@pulumi/eks"),
	}

	test := pulumitest.NewPulumiTest(t, dir, options...)

	result := providertest.PreviewProviderUpgrade(t, test, providerName, baselineVersion,
		optproviderupgrade.DisableAttach(),
	)
	assertpreview.HasNoReplacements(t, result)
}
