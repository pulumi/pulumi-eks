// Copyright 2016-2018, Pulumi Corporation.
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

	"github.com/stretchr/testify/assert"

	"github.com/pulumi/pulumi/pkg/testing/integration"
)

func Test_Examples(t *testing.T) {
	region := os.Getenv("AWS_REGION")
	if region == "" {
		t.Skipf("Skipping test due to missing AWS_REGION environment variable")
	}
	fmt.Printf("AWS Region: %v\n", region)

	cwd, err := os.Getwd()
	if !assert.NoError(t, err, "expected a valid working directory: %v", err) {
		return
	}

	shortTests := []integration.ProgramTestOptions{
		{
			Dir: path.Join(cwd, "./cluster"),
			Config: map[string]string{
				"aws:region": region,
			},
			Dependencies: []string{
				"@pulumi/eks",
			},
			ExpectRefreshChanges: true,
		},
		{
			Dir: path.Join(cwd, "./nodegroup"),
			Config: map[string]string{
				"aws:region": region,
			},
			Dependencies: []string{
				"@pulumi/eks",
			},
			ExpectRefreshChanges: true,
		},
		{
			Dir: path.Join(cwd, "./private-cluster"),
			Config: map[string]string{
				"aws:region": region,
			},
			Dependencies: []string{
				"@pulumi/eks",
			},
			ExpectRefreshChanges: true,
		},
		{
			Dir: path.Join(cwd, "./tags"),
			Config: map[string]string{
				"aws:region": region,
			},
			Dependencies: []string{
				"@pulumi/eks",
			},
			ExpectRefreshChanges: true,
		},
	}

	longTests := []integration.ProgramTestOptions{}

	tests := shortTests
	if !testing.Short() {
		tests = append(tests, longTests...)
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
