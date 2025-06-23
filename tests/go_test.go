// Copyright 2016-2021, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//go:build go || all
// +build go all

package tests

import (
	"bytes"
	"path/filepath"
	"testing"

	utils "github.com/pulumi/pulumi-eks/tests/internal"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAccClusterGo(t *testing.T) {
	var stdErr bytes.Buffer

	test := getGoBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Verbose:       true,
			DebugLogLevel: 3,
			Dir:           filepath.Join(getExamples(t), "cluster-go", "step1"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
					info.Outputs["kubeconfig3"],
				))
			},
			EditDirs: []integration.EditDir{
				{
					// Step 2 should fail because the `creationRoleProvider` option is not supported in non nodejs Pulumi programs.
					Dir:           filepath.Join(getExamples(t), "cluster-go", "step2"),
					ExpectFailure: true,
					Additive:      true,
					Stderr:        &stdErr,
				},
			},
		})

	programTestWithExtraOptions(t, &test, nil)
	// Ensure that the provider error message is as expected.
	assert.Contains(t, stdErr.String(), "not supported")
}

// TestAccClusterGoWithOidc tests that we can set extra node security groups on new node groups.
// https://github.com/pulumi/pulumi-eks/issues/829
func TestAccExtraSecurityGroupsGo(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getGoBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: filepath.Join(getExamples(t), "extra-sg-go"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccAuthenticationModeGo(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getGoBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: filepath.Join(getTestPrograms(t), "authentication-mode-go"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))

				require.Contains(t, info.Outputs, "accessEntries")
				accessEntries := info.Outputs["accessEntries"].([]interface{})
				assert.Len(t, accessEntries, 1)
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func getGoBaseOptions(t *testing.T) integration.ProgramTestOptions {
	region := getEnvRegion(t)
	base := getBaseOptions(t)
	goBase := base.With(integration.ProgramTestOptions{
		Config: map[string]string{
			"aws:region": region,
		},
		Dependencies: []string{
			"github.com/pulumi/pulumi-eks/sdk/v3",
		},
		Verbose: true,
	})

	return goBase
}
