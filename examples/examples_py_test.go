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
	"path"
	"path/filepath"
	"testing"

	"github.com/pulumi/pulumi-eks/examples/utils"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
)

func TestAccAwsProfilePy(t *testing.T) {
	unsetAWSProfileEnv(t)

	test := getPythonBaseOptions(t).
		With(integration.ProgramTestOptions{
			NoParallel: true,
			Dir:        filepath.Join(getCwd(t), "aws-profile-py"),
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

	integration.ProgramTest(t, &test)
}

func TestAccAwsProfileRolePy(t *testing.T) {
	test := getPythonBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: filepath.Join(getCwd(t), "aws-profile-role-py"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccClusterPy(t *testing.T) {
	test := getPythonBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: filepath.Join(getCwd(t), "cluster-py"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
					info.Outputs["kubeconfig3"],
				)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccFargatePy(t *testing.T) {
	t.Skip("https://github.com/pulumi/pulumi-eks/issues/1041")
	test := getPythonBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: filepath.Join(getCwd(t), "fargate-py"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccNodeGroupPy(t *testing.T) {
	test := getPythonBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           filepath.Join(getCwd(t), "nodegroup-py"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
				)
			},
			EditDirs: []integration.EditDir{
				{
					// Re-running should not introduce any changes.
					Dir:             path.Join(getCwd(t), "nodegroup"),
					ExpectNoChanges: true,
					Additive:        true,
				},
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccManagedNodeGroupPy(t *testing.T) {
	test := getPythonBaseOptions(t).
		With(integration.ProgramTestOptions{
			// RunUpdateTest: true,
			Dir: filepath.Join(getCwd(t), "managed-nodegroups-py"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	integration.ProgramTest(t, &test)
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
