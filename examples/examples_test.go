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

package example

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/eks"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
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
	}
}

func providerPluginPathEnv() (string, error) {
	// providerDir := filepath.Join("..", "bin")
	// absProviderDir, err := filepath.Abs(providerDir)
	// if err != nil {
	// 	return "", err
	// }

	// Local build of eks plugin.
	pluginDir := filepath.Join("..", "provider", "cmd", "pulumi-resource-eks", "bin")
	absPluginDir, err := filepath.Abs(pluginDir)
	if err != nil {
		return "", err
	}

	pathSeparator := ":"
	if runtime.GOOS == "windows" {
		pathSeparator = ";"
	}
	return "PATH=" + os.Getenv("PATH") + pathSeparator + absPluginDir, nil
	// return "PATH=" + os.Getenv("PATH") + pathSeparator + absPluginDir + pathSeparator + absTestPluginDir + pathSeparator + absProviderDir, nil
}

var envToUnset = [...]string{"AWS_SECRET_ACCESS_KEY", "AWS_ACCESS_KEY_ID", "AWS_SESSION_TOKEN"}

// unsetAWSProfileEnv unsets the AWS_PROFILE and associated environment variables.
// EKS token retrieval using the AWS_PROFILE seems to prefer the
// the following variables over AWS_PROFILE so you end up with
// authentication failures in the tests. So drop these environment
// variables if set and reapply them after the test.
func unsetAWSProfileEnv(t *testing.T) {
	t.Helper()

	for _, envVar := range envToUnset {
		t.Setenv(envVar, "")
		assert.NoError(t, os.Unsetenv(envVar)) // Explicitly unset the environment variable, as well.
	}
}

type programTestExtraOptions struct {
	IgnoreDestroyErrors bool
}

// TODO[pulumi/pulumi-eks#1226]: Deleting an eks.Cluster may fail with DependencyViolation on nodeSecurityGroup Try
// destroying the cluster to keep the test account clean but do not fail the test if it fails to destroy. This weakens
// the test but makes CI deterministic. This setting is now used by default for all tests.
func programTestExtraOptionsDefault() *programTestExtraOptions {
	return &programTestExtraOptions{IgnoreDestroyErrors: true}
}

func programTestWithExtraOptions(
	t *testing.T,
	opts *integration.ProgramTestOptions,
	extra *programTestExtraOptions,
) {
	if extra == nil {
		extra = programTestExtraOptionsDefault()
	}
	pt := integration.ProgramTestManualLifeCycle(t, opts)

	require.Falsef(t, opts.DestroyOnCleanup, "DestroyOnCleanup is not supported")
	require.Falsef(t, opts.RunUpdateTest, "RunUpdateTest is not supported")

	destroyStack := func() {
		destroyErr := pt.TestLifeCycleDestroy()
		if extra.IgnoreDestroyErrors {
			t.Logf("IgnoreDestroyErrors: ignoring %v", destroyErr)
		} else {
			assert.NoError(t, destroyErr)
		}
	}

	// Inlined pt.TestLifeCycleInitAndDestroy()
	testLifeCycleInitAndDestroy := func() error {
		err := pt.TestLifeCyclePrepare()
		if err != nil {
			return fmt.Errorf("copying test to temp dir: %w", err)
		}

		pt.TestFinished = false
		defer pt.TestCleanUp()

		err = pt.TestLifeCycleInitialize()
		if err != nil {
			return fmt.Errorf("initializing test project: %w", err)
		}
		// Ensure that before we exit, we attempt to destroy and remove the stack.
		defer destroyStack()

		if err = pt.TestPreviewUpdateAndEdits(); err != nil {
			return fmt.Errorf("running test preview, update, and edits: %w", err)
		}
		pt.TestFinished = true
		return nil
	}

	err := testLifeCycleInitAndDestroy()
	if !errors.Is(err, integration.ErrTestFailed) {
		assert.NoError(t, err)
	}
}

func loadAwsDefaultConfig(t *testing.T) aws.Config {
	loadOpts := []func(*config.LoadOptions) error{}
	if p, ok := os.LookupEnv("AWS_PROFILE"); ok {
		loadOpts = append(loadOpts, config.WithSharedConfigProfile(p))
	}
	if r, ok := os.LookupEnv("AWS_REGION"); ok {
		loadOpts = append(loadOpts, config.WithRegion(r))
	}
	cfg, err := config.LoadDefaultConfig(context.TODO(), loadOpts...)
	require.NoError(t, err, "failed to load AWS config")

	return cfg
}

func createEksClient(t *testing.T) *eks.Client {
	client := eks.NewFromConfig(loadAwsDefaultConfig(t))
	require.NotNil(t, client, "failed to create EKS client")
	return client
}
