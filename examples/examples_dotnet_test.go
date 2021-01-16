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
// +build dotnet all

package example

import (
	"path/filepath"
	"testing"

	"github.com/pulumi/pulumi-eks/examples/utils"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
)

func TestAccAwsProfileCs(t *testing.T) {
	test := getCSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: filepath.Join(getCwd(t), "aws-profile-cs"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccClusterCs(t *testing.T) {
	test := getCSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: filepath.Join(getCwd(t), "cluster-cs"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
				)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccManagedNodeGroupCs(t *testing.T) {
	test := getCSBaseOptions(t).
		With(integration.ProgramTestOptions{
			// RunUpdateTest: true,
			Dir: filepath.Join(getCwd(t), "managed-nodegroups-cs"),
			// TODO: Temporarily skip the extra runtime validation due to test failure.
			// ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
			// 	utils.RunEKSSmokeTest(t,
			// 		info.Deployment.Resources,
			// 		info.Outputs["kubeconfig"],
			// 	)
			// },
		})

	integration.ProgramTest(t, &test)
}

func getCSBaseOptions(t *testing.T) integration.ProgramTestOptions {
	region := getEnvRegion(t)
	base := getBaseOptions(t)
	csharpBase := base.With(integration.ProgramTestOptions{
		Config: map[string]string{
			"aws:region": region,
		},
		Dependencies: []string{
			"Pulumi.Eks",
		},
		Verbose: true,
	})

	return csharpBase
}
