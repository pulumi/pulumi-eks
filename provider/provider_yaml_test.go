package provider

import (
	"os"
	"path/filepath"
	"testing"

	"fmt"

	"github.com/pulumi/providertest/pulumitest/assertpreview"
	"github.com/pulumi/providertest/pulumitest/opttest"
	"github.com/stretchr/testify/assert"
)

func TestEksAuthModeUpgrade(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skipf("Skipping in testing.Short() mode, assuming this is a CI run without credentials")
	}
	const firstYaml = `
name: eksClusterAuthModeUpgrade
runtime: yaml
resources:
  EksCluster:
    type: eks:Cluster
    properties:
      skipDefaultNodeGroup: true
`
	const secondYaml = `
name: eksClusterAuthModeUpgrade
runtime: yaml
resources:
  EksCluster:
    type: eks:Cluster
    properties:
      skipDefaultNodeGroup: true
      authenticationMode: CONFIG_MAP
`

	var (
		providerName    string = "eks"
		baselineVersion string = "2.7.3"
	)
	cwd, err := os.Getwd()
	assert.NoError(t, err)

	firstProgram := []byte(firstYaml)
	secondProgram := []byte(secondYaml)
	// test that we can upgrade from the previous version which accepted a string for `subnetIds`
	// to the new version which accepts a list
	t.Run("upgrade", func(t *testing.T) {
		pulumiTest := testProviderCodeChanges(t, &testProviderCodeChangesOptions{
			firstProgram: firstProgram,
			firstProgramOptions: []opttest.Option{
				opttest.DownloadProviderVersion(providerName, baselineVersion),
			},
			secondProgram: secondProgram,
			secondProgramOptions: []opttest.Option{
				opttest.LocalProviderPath("eks", filepath.Join(cwd, "..", "bin")),
			},
		})

		res := pulumiTest.Preview()
		fmt.Printf("stdout: %s \n", res.StdOut)
		fmt.Printf("stderr: %s \n", res.StdErr)
		assertpreview.HasNoReplacements(t, res)
	})
}
