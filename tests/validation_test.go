// Don't include with language-specific tests.
//go:build !dotnet && !go && !nodejs && !python && !java
// +build !dotnet,!go,!nodejs,!python,!java

package tests

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/pulumi/providertest/pulumitest"
	"github.com/pulumi/providertest/pulumitest/opttest"
	"github.com/stretchr/testify/require"
)

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
	dir := filepath.Join(getTestPrograms(t), "cluster-input-validations")
	options := []opttest.Option{
		opttest.LocalProviderPath("eks", filepath.Join(cwd, "..", "bin")),
		opttest.YarnLink("@pulumi/eks"),
	}
	tw := &testWrapper{PT: t, expectFailure: expectFailure}
	test := pulumitest.NewPulumiTest(tw, dir, options...)
	test.SetConfig(t, "property", property)
	test.SetConfig(t, "n", fmt.Sprintf("%d", n))
	test.Preview(t)
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
