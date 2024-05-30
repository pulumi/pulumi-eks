package provider

import (
	"fmt"
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/pulumi/providertest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const (
	// The baseline version is the version of the provider that the upgrade tests will be run against.
	baselineVersion = "2.3.0"

	// The path to the yarn.lock file that the EKS provider was built with.
	yarnLockPath = "../nodejs/eks/yarn.lock"
)

var (
	// providerRegex is a regular expression that extracts the provider name from an URN.
	providerRegex = regexp.MustCompile(`pulumi:providers:(\w+)::`)
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

	t.Run("authentication-mode", func(t *testing.T) {
		runExampleParallel(t, "authentication-mode")
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

			if strings.Contains(string(diff.URN), "pulumi:providers:") &&
				len(diff.Diffs) == 1 &&
				diff.Diffs[0] == "version" {
				// Extract the provider name from the URN.
				matches := providerRegex.FindStringSubmatch(string(diff.URN))
				if len(matches) == 2 {
					t.Logf("Ignoring version change for provider %q used in test programs", matches[1])
				} else {
					t.Errorf("Failed to extract provider name from URN: %s", diff.URN)
				}

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

		providertest.WithBaselineVersion(baselineVersion),
		providertest.WithExtraBaselineDependencies(getDependencies(t, yarnLockPath)),

		// This region needs to match the one configured in .github for the CI workflows.
		providertest.WithConfig("aws:region", "us-west-2"),

		providertest.WithDiffValidation(eksDiffValidation),
	)
	return providertest.NewProviderTest(dir, opts...)
}

// getDependencies is a helper function that parses a provided yarn.lock file and returns a map of @pulumi dependencies
// that are specified in the yarn.lock file.
func getDependencies(t *testing.T, yarnLockPath string) map[string]string {
	t.Helper()

	// Read the yarn.lock file.
	yarnLock, err := os.ReadFile(yarnLockPath)
	require.NoError(t, err)

	pDeps := parseYarnLockForPulumiDeps(string(yarnLock))

	// Ensure that the dependency map is not empty for the Kubernetes and AWS providers.
	require.NotEmpty(t, pDeps)
	require.NotEmpty(t, pDeps["aws"])
	require.NotEmpty(t, pDeps["kubernetes"])

	return pDeps
}

// parseYarnLockForPulumiDeps is a helper function that parses a provided yarn.lock file and returns a map of @pulumi
// dependencies that are specified in the yarn.lock file. The map is keyed by the name of the package, and the value is
// the version of the package that is specified in the yarn.lock file.
// This function assumes that the yarn.lock file is in the format that is generated by Yarn.
// The function scans the file line by line, and when it finds a line that starts with "  version " and the previous line
// contains the "@pulumi/" prefix, it extracts the name and version of the Pulumi package and adds it to the list of entries.
func parseYarnLockForPulumiDeps(yarnLock string) map[string]string {
	pulumiDeps := make(map[string]string)
	lines := strings.Split(yarnLock, "\n")

	for idx, line := range lines {
		if idx == 0 {
			continue
		}

		if !strings.HasPrefix(line, "  version ") {
			continue
		}

		prevLine := lines[idx-1]
		if !strings.Contains(prevLine, "@pulumi/") {
			continue
		}

		// Remove the '"@pulumi/' prefix from the name, and the @version suffix from the line.
		name := strings.TrimPrefix(prevLine, "\"@pulumi/")
		name = strings.Split(name, "@")[0]
		name = strings.TrimSpace(name)

		// Trim the leading and trailing whitespace and remove the quotes around the version.
		version := strings.TrimPrefix(line, "  version ")
		version = strings.ReplaceAll(version, "\"", "")
		version = strings.TrimSpace(version)

		pulumiDeps[name] = version
	}
	return pulumiDeps
}
