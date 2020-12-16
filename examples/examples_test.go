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
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/pulumi/pulumi/pkg/v2/testing/integration"
)

func getEnvRegion(t *testing.T) string {
	envRegion := os.Getenv("AWS_REGION")
	if envRegion == "" {
		t.Skipf("Skipping test due to missing AWS_REGION environment variable")
	}

	return envRegion
}

func getCwd(t *testing.T) string {
	cwd, err := os.Getwd()
	if err != nil {
		t.FailNow()
	}

	return cwd
}

func getBaseOptions(t *testing.T) integration.ProgramTestOptions {
	pathEnv, err := providerPluginPathEnv()
	if err != nil {
		t.Fatalf("failed to build provider plugin PATH: %v", err)
	}
	return integration.ProgramTestOptions{
		Env:                  []string{pathEnv},
		ExpectRefreshChanges: true,
		RetryFailedSteps:     true,
		ReportStats:          integration.NewS3Reporter("us-west-2", "eng.pulumi.com", "testreports"),
		Tracing:              "https://tracing.pulumi-engineering.com/collector/api/v1/spans",
	}
}

func providerPluginPathEnv() (string, error) {
	// Local build of eks plugin.
	pluginDir := filepath.Join("..", "provider", "cmd", "pulumi-resource-eks", "bin")
	absPluginDir, err := filepath.Abs(pluginDir)
	if err != nil {
		return "", err
	}

	// Test build of testvpc plugin.
	testPluginDir := filepath.Join("..", "utils", "testvpc")
	absTestPluginDir, err := filepath.Abs(testPluginDir)
	if err != nil {
		return "", err
	}

	pathSeparator := ":"
	if runtime.GOOS == "windows" {
		pathSeparator = ";"
	}
	return "PATH=" + os.Getenv("PATH") + pathSeparator + absPluginDir + pathSeparator + absTestPluginDir, nil
}
