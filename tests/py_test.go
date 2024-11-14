// Copyright 2016-2020, Pulumi Corporation.
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
//go:build python || all
// +build python all

package example

import (
	"bytes"
	"path"
	"path/filepath"
	"testing"

	utils "github.com/pulumi/pulumi-eks/tests/internal"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
)

func TestAccAwsProfilePy(t *testing.T) {
	setProfileCredentials(t, "aws-profile-py")

	test := getPythonBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: filepath.Join(getExamples(t), "aws-profile-py"),
			OrderedConfig: []integration.ConfigValue{
				{Key: "pulumi:disable-default-providers[0]", Value: "aws", Path: true},
			},
			RetryFailedSteps: false,
			Env: []string{
				"AWS_PROFILE=",           // unset
				"AWS_SECRET_ACCESS_KEY=", // unset
				"AWS_ACCESS_KEY_ID=",     // unset
				"AWS_SESSION_TOKEN=",     // unset
			},
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				// The `cluster.kubeconfig` output should fail as it does not have the right AWS_PROFILE set.
				t.Logf("Ensuring cluster.kubeconfig fails without AWS_PROFILE envvar set")
				utils.EnsureKubeconfigFails(t, info.Outputs["kubeconfig"])

				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig_with_profile"],
				)
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccAwsProfileRolePy(t *testing.T) {
	test := getPythonBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: filepath.Join(getExamples(t), "aws-profile-role-py"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccClusterPy(t *testing.T) {
	// Create io.Writer to capture stderr and stdout from Pulumi CLI.
	var output bytes.Buffer

	test := getPythonBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: filepath.Join(getExamples(t), "cluster-py"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
					info.Outputs["kubeconfig3"],
				)
			},
			EditDirs: []integration.EditDir{
				{
					Dir:           path.Join(getExamples(t), "cluster-py", "step2"),
					ExpectFailure: true,
					Additive:      true,
					Stderr:        &output,
					Stdout:        &output,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						// Ensure that the panic from https://github.com/pulumi/pulumi-eks/issues/1202 does not occur.
						combinedOutput := output.String()
						assert.NotContains(t, combinedOutput, "Cannot read properties of undefined")
						assert.Contains(t, combinedOutput, "A managed node group cannot be created without first setting its role in the cluster's instanceRoles")
					},
				},
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccFargatePy(t *testing.T) {
	t.Skip("https://github.com/pulumi/pulumi-eks/issues/1041")
	test := getPythonBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: filepath.Join(getExamples(t), "fargate-py"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccNodeGroupPy(t *testing.T) {
	test := getPythonBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getExamples(t), "nodegroup-py"),
			EditDirs: []integration.EditDir{
				{
					// Re-running should not introduce any changes.
					Dir:             path.Join(getExamples(t), "nodegroup-py"),
					ExpectNoChanges: true,
					Additive:        true,
				},
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccManagedNodeGroupPy(t *testing.T) {
	test := getPythonBaseOptions(t).
		With(integration.ProgramTestOptions{
			// RunUpdateTest: true,
			Dir: filepath.Join(getExamples(t), "managed-nodegroups-py"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccManagedNodeGroupOSPy(t *testing.T) {
	test := getPythonBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "managed-ng-os-py"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)

				// expect 4 nodes with increased pod capacity of 100
				assert.NoError(t, utils.ValidateNodePodCapacity(t, info.Outputs["kubeconfig"], 4, 100, "increased-pod-capacity"))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func getPythonBaseOptions(t *testing.T) integration.ProgramTestOptions {
	region := getEnvRegion(t)
	base := getBaseOptions(t)
	pythonBase := base.With(integration.ProgramTestOptions{
		Config: map[string]string{
			"aws:region": region,
		},
		Dependencies: []string{
			filepath.Join("..", "sdk", "python", "bin"),
		},
		Verbose: true,
	})

	return pythonBase
}
