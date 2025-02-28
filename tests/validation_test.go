// Don't include with language-specific tests.
//go:build !dotnet && !go && !nodejs && !python && !java
// +build !dotnet,!go,!nodejs,!python,!java

package tests

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/pulumi/providertest/pulumitest"
	"github.com/pulumi/providertest/pulumitest/opttest"
	utils "github.com/pulumi/pulumi-eks/tests/internal"
	"github.com/stretchr/testify/require"
)

func TestEksClusterInputValidations(t *testing.T) {
	props := []string{"instanceRoles", "roleMappings", "userMappings"}
	dir := filepath.Join(getTestPrograms(t), "cluster-input-validations")
	for _, p := range props {
		for n := 0; n < 2; n++ {
			t.Run(fmt.Sprintf("%s_%d", p, n), func(t *testing.T) {
				checkEksClusterInputValidations(t, dir, func(pt *pulumitest.PulumiTest) {
					pt.SetConfig(t, "property", p)
					pt.SetConfig(t, "n", fmt.Sprintf("%d", n))
				}, n > 0)
			})
		}
	}
}

func TestEfaInputValidation(t *testing.T) {
	azs, err := utils.ListAvailabilityZones(t)
	require.NoError(t, err)

	supportedAZs, err := utils.FindSupportedAZs(t, []string{"g6.8xlarge"})
	require.NoError(t, err)

	var unsupportedAZ []string
	for _, az := range azs {
		found := false
		for _, supportedAZ := range supportedAZs {
			if az == supportedAZ {
				found = true
				break
			}
		}
		if !found {
			unsupportedAZ = append(unsupportedAZ, az)
		}
	}
	if len(unsupportedAZ) == 0 {
		// "Could not find an unsupported AZ to test with"
		t.Skip("Could not find an unsupported AZ to test with")
	}

	tests := []struct {
		name         string
		instanceType string
		azs          string
		wantErr      bool
	}{
		{
			name:         "valid instance type and azs",
			instanceType: "g6.8xlarge",
			azs:          strings.Join(supportedAZs, ","),
			wantErr:      false,
		},
		{
			name:         "unsupported instance type",
			instanceType: "t3.medium",
			azs:          strings.Join(supportedAZs, ","),
			wantErr:      true,
		},
		{
			name:         "unsupported az",
			instanceType: "g6.8xlarge",
			azs:          strings.Join(unsupportedAZ, ","),
			wantErr:      true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			checkEksClusterInputValidations(t, filepath.Join(getExamples(t), "efa"), func(pt *pulumitest.PulumiTest) {
				pt.SetConfig(t, "instanceTypes", tt.instanceType)
				pt.SetConfig(t, "availabilityZones", tt.azs)
			}, tt.wantErr)
		})
	}
}

func checkEksClusterInputValidations(t *testing.T, testDir string, config func(pt *pulumitest.PulumiTest), expectFailure bool) {
	cwd, err := os.Getwd()
	require.NoError(t, err)
	options := []opttest.Option{
		opttest.LocalProviderPath("eks", filepath.Join(cwd, "..", "bin")),
		opttest.YarnLink("@pulumi/eks"),
	}
	tw := &testWrapper{PT: t, expectFailure: expectFailure}
	test := pulumitest.NewPulumiTest(tw, testDir, options...)
	config(test)

	test.Preview(tw)
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
