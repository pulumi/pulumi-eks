// Copyright 2016-2019, Pulumi Corporation.
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

package examples

import (
	"fmt"
	"os"
	"path"
	"testing"

	"github.com/pulumi/pulumi-eks/utils"
	"github.com/pulumi/pulumi/pkg/testing/integration"
	"github.com/stretchr/testify/assert"
)

func Test_Examples(t *testing.T) {
	t.Parallel()
	region := os.Getenv("AWS_REGION")
	if region == "" {
		t.Skipf("Skipping test due to missing AWS_REGION environment variable")
	}
	fmt.Printf("AWS Region: %v\n", region)

	cwd, err := os.Getwd()
	if !assert.NoError(t, err, "expected a valid working directory: %v", err) {
		return
	}

	// Base options shared amongst all shortTests.
	shortTestsBase := integration.ProgramTestOptions{
		Config: map[string]string{
			"aws:region": region,
		},
		Dependencies: []string{
			"@pulumi/eks",
		},
		ExpectRefreshChanges: true,
	}

	shortTests := []integration.ProgramTestOptions{
		shortTestsBase.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "./cluster"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
				)
			},
		}),
		shortTestsBase.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "./nodegroup"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
				)
			},
		}),
		shortTestsBase.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "./tags"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
				)
			},
		}),
		shortTestsBase.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "storage-classes"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
				)
			},
		}),
	}

	// Base options shared amongst all updateTests.
	updateTestsBase := integration.ProgramTestOptions{
		Config: map[string]string{
			"aws:region": region,
		},
		Dependencies: []string{
			"@pulumi/eks",
		},
		ExpectRefreshChanges: true,
		RunUpdateTest:        true,
	}

	updateTests := []integration.ProgramTestOptions{
		updateTestsBase.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "./cluster"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
				)
			},
		}),
		updateTestsBase.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "./nodegroup"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
				)
			},
		}),
		updateTestsBase.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "./tags"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
				)
			},
		}),
		updateTestsBase.With(integration.ProgramTestOptions{
			Dir: path.Join(cwd, "storage-classes"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
				)
			},
		}),
	}

	tests := shortTests
	if !testing.Short() {
		tests = append(tests, updateTests...)
	}

	for _, ex := range tests {
		example := ex.With(integration.ProgramTestOptions{
			ReportStats: integration.NewS3Reporter("us-west-2", "eng.pulumi.com", "testreports"),
			Tracing:     "https://tracing.pulumi-engineering.com/collector/api/v1/spans",
		})
		t.Run(example.Dir, func(t *testing.T) {
			integration.ProgramTest(t, &example)
		})
	}
}
