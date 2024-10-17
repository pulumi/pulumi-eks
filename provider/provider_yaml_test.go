package provider

import (
	"os"
	"path/filepath"
	"testing"

	"fmt"

	"github.com/pulumi/providertest/pulumitest"
	"github.com/pulumi/providertest/pulumitest/assertpreview"
	"github.com/pulumi/providertest/pulumitest/opttest"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestEksAuthModeUpgrade(t *testing.T) {
	t.Skip("Temporarily skipping upgrade tests. Needs to be addressed in pulumi/pulumi-eks#1387")
	t.Parallel()
	if testing.Short() {
		t.Skipf("Skipping in testing.Short() mode, assuming this is a CI run without credentials")
	}
	const firstYaml = `
name: eksClusterAuthModeUpgrade
runtime: yaml
resources:
  Vpc:
    type: awsx:ec2:Vpc
    properties:
      subnetSpecs:
        - type: Public
      natGateways:
        strategy: None
  EksCluster:
    type: eks:Cluster
    properties:
      vpcId: ${Vpc.vpcId}
      skipDefaultNodeGroup: true
      publicSubnetIds: ${Vpc.publicSubnetIds}
`
	const secondYaml = `
name: eksClusterAuthModeUpgrade
runtime: yaml
resources:
  Vpc:
    type: awsx:ec2:Vpc
    properties:
      subnetSpecs:
        - type: Public
      natGateways:
        strategy: None
  EksCluster:
    type: eks:Cluster
    properties:
      vpcId: ${Vpc.vpcId}
      skipDefaultNodeGroup: true
      publicSubnetIds: ${Vpc.publicSubnetIds}
      authenticationMode: CONFIG_MAP
`

	var (
		providerName    = "eks"
		baselineVersion = "2.7.3"
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

func TestPublicEndpointInputValidation(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skipf("Skipping in testing.Short() mode, assuming this is a CI run without credentials")
	}

	tests := []struct {
		endpointPublicAccess string
		publicAccessCidrs    string
		expectFailure        bool
	}{
		{"true", "[0.0.0.0/0]", false},
		{"", "[0.0.0.0/0]", false},
		{"", "", false},
		{"false", "[0.0.0.0/0]", true},
	}

	for _, tt := range tests {
		name := fmt.Sprintf("endpointPublicAccess=%s,publicAccessCidrs=%s", tt.endpointPublicAccess, tt.publicAccessCidrs)
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			var endpointPublicAccess string
			if tt.endpointPublicAccess != "" {
				endpointPublicAccess = fmt.Sprintf("endpointPublicAccess: %s", tt.endpointPublicAccess)
			} else {
				endpointPublicAccess = "# no endpointPublicAccess"
			}

			var publicAccessCidrs string
			if tt.publicAccessCidrs != "" {
				publicAccessCidrs = fmt.Sprintf("publicAccessCidrs: %s", tt.publicAccessCidrs)
			} else {
				publicAccessCidrs = "# no publicAccessCidrs"
			}

			yaml := fmt.Sprintf(`
name: cluster
runtime: yaml
resources:
  Vpc:
    type: awsx:ec2:Vpc
    properties:
      subnetSpecs:
        - type: Public
      natGateways:
        strategy: None
  EksCluster:
    type: eks:Cluster
    properties:
      vpcId: ${Vpc.vpcId}
      skipDefaultNodeGroup: true
      %s
      %s
      publicSubnetIds: ${Vpc.publicSubnetIds}`, endpointPublicAccess, publicAccessCidrs)

			cwd, err := os.Getwd()
			require.NoError(t, err)
			options := []opttest.Option{
				opttest.LocalProviderPath("eks", filepath.Join(cwd, "..", "bin")),
			}
			tw := &testWrapper{PT: t, expectFailure: tt.expectFailure}
			workdir := t.TempDir()
			err = os.WriteFile(filepath.Join(workdir, "Pulumi.yaml"), []byte(yaml), 0o600)
			test := pulumitest.NewPulumiTest(tw, workdir, options...)
			require.NoError(t, err)
			test.Preview()

			if tt.expectFailure {
				require.Truef(t, tw.failed, "Expected preview to fail due to invalid inputs but it succeeded")
			}
		})
	}
}
