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
// +build nodejs all

package example

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	appsv1 "k8s.io/api/apps/v1"
	"os"
	"os/exec"
	"path"
	"testing"
	"time"

	"github.com/pulumi/pulumi-eks/examples/utils"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
)

func TestAccCluster(t *testing.T) {

	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:           path.Join(getCwd(t), "./cluster"),
			RunUpdateTest: false,
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
				)

				// let's test there's a iamRoleArn specified for the cluster
				assert.NotEmpty(t, info.Outputs["iamRoleArn"])

				assert.NoError(t, utils.ValidateDaemonSet(t, info.Outputs["kubeconfig2"], "kube-system", "aws-node", func(ds *appsv1.DaemonSet) {
					for _, ic := range ds.Spec.Template.Spec.InitContainers {
						assert.Equal(t, "602401143452.dkr.ecr.us-west-2.amazonaws.com/amazon-k8s-cni-init:v1.11.0",
							ic.Image)
						var tcpEarly bool
						for _, env := range ic.Env {
							if env.Name == "DISABLE_TCP_EARLY_DEMUX" {
								tcpEarly = env.Value == "true"
								assert.Equal(t, env.Value, "true")
							}
						}
						assert.True(t, tcpEarly)
					}
					for _, c := range ds.Spec.Template.Spec.Containers {
						assert.Equal(t, "602401143452.dkr.ecr.us-west-2.amazonaws.com/amazon-k8s-cni:v1.11.0", c.Image)
					}
				}))
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccKubernetesServiceIPv4RangeForCluster(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:           path.Join(getCwd(t), "./cluster-with-serviceiprange"),
			RunUpdateTest: false, // this is a new feature so will not be available in the existing package
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				serviceIpv4Range := info.Outputs["kubernetesServiceRange"].(string)
				if serviceIpv4Range != "172.16.0.0/20" {
					t.Errorf("expected `172.16.0.020`: got %q", serviceIpv4Range)
				}
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccFargate(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "./fargate"),
			Config: map[string]string{
				// Hard code to us-east-2 since Fargate support is not yet available in all regions
				// (specifically us-west-2).
				"aws:region": "us-east-2",
			},
			// TODO[pulumi/pulumi-eks#286] Disabled until we address CNI daemonset issues which
			// cause those daemonset pods not to get scheduled.
			// ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
			// 	utils.RunEKSSmokeTest(t,
			// 		info.Deployment.Resources,
			// 		info.Outputs["kubeconfig"],
			// 	)
			// },
		})

	integration.ProgramTest(t, &test)
}

func TestAccNodeGroup(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           path.Join(getCwd(t), "nodegroup"),
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

func TestAccManagedNodeGroup(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           path.Join(getCwd(t), "managed-nodegroups"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccMNG_withMissingRole(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:              path.Join(getCwd(t), "tests", "managed-ng-missing-role"),
			ExpectFailure:    true,
			RetryFailedSteps: false,
			SkipRefresh:      true,
			Quick:            true,
		})

	integration.ProgramTest(t, &test)
}

func TestAccMNG_withAwsAuth(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "tests", "managed-ng-aws-auth"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
			EditDirs: []integration.EditDir{
				{
					Dir:      path.Join(getCwd(t), "tests", "managed-ng-aws-auth", "step1"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						utils.RunEKSSmokeTest(t,
							info.Deployment.Resources,
							info.Outputs["kubeconfig"],
						)
					},
				},
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccTags(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "tags"),
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

func TestAccStorageClasses(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "storage-classes"),
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

func TestAccOidcIam(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "oidc-iam-sa"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccScopedKubeconfig(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "scoped-kubeconfigs"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsProfile(t *testing.T) {
	// EKS token retrieval using the AWS_PROFILE seems to prefer the
	// the following variables over AWS_PROFILE so you end up with
	// authentication failures in the tests. So drop these environment
	// variables if set and reapply them after the test.
	oldEnvVars := map[string]string{}
	if val := os.Getenv("AWS_SECRET_ACCESS_KEY"); val != "" {
		oldEnvVars["AWS_SECRET_ACCESS_KEY"] = val
		assert.NoError(t, os.Unsetenv("AWS_SECRET_ACCESS_KEY"))
	}
	if val := os.Getenv("AWS_ACCESS_KEY_ID"); val != "" {
		oldEnvVars["AWS_ACCESS_KEY_ID"] = val
		assert.NoError(t, os.Unsetenv("AWS_ACCESS_KEY_ID"))
	}
	if val := os.Getenv("AWS_SESSION_TOKEN"); val != "" {
		oldEnvVars["AWS_SESSION_TOKEN"] = val
		assert.NoError(t, os.Unsetenv("AWS_SESSION_TOKEN"))
	}
	defer func() {
		for k, v := range oldEnvVars {
			assert.NoError(t, os.Setenv(k, v))
		}
	}()
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "aws-profile"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
			NoParallel: true,
		})

	integration.ProgramTest(t, &test)
}

func TestAccAwsProfileRole(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "aws-profile-role"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
			NoParallel: true,
		})
	integration.ProgramTest(t, &test)
}

func TestAccEncryptionProvider(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "encryption-provider"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccExtraSecurityGroups(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "extra-sg"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccReplaceSecGroup(t *testing.T) {
	t.Skip("Temporarily skipping test - needs addressed as https://github.com/pulumi/pulumi-eks/issues/463")
	//if testing.Short() {
	//	t.Skip("skipping test in short mode.")
	//}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "tests", "replace-secgroup"),
			EditDirs: []integration.EditDir{
				{
					Dir:      path.Join(getCwd(t), "tests", "replace-secgroup", "step1"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						utils.RunEKSSmokeTest(t,
							info.Deployment.Resources,
							info.Outputs["kubeconfig"],
						)
					},
				},
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccReplaceClusterAddSubnets(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "tests", "replace-cluster-add-subnets"),
			EditDirs: []integration.EditDir{
				{
					Dir:      path.Join(getCwd(t), "tests", "replace-cluster-add-subnets", "step1"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						utils.RunEKSSmokeTest(t,
							info.Deployment.Resources,
							info.Outputs["kubeconfig"],
						)
					},
				},
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccTagInputTypes(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "tests", "tag-input-types"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccNodegroupOptions(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "tests", "nodegroup-options"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccImportDefaultEksSecgroup(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "modify-default-eks-sg"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
			EditDirs: []integration.EditDir{
				{
					Dir:      path.Join(getCwd(t), "modify-default-eks-sg", "step1"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						utils.RunEKSSmokeTest(t,
							info.Deployment.Resources,
							info.Outputs["kubeconfig"],
						)
					},
				},
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccVpcSubnetTags(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "subnet-tags"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccMigrateNodeGroups(t *testing.T) {
	t.Skip("Temporarily skipping test - needs addressed as https://github.com/pulumi/pulumi-eks/issues/467")
	//if testing.Short() {
	//	t.Skip("skipping test in short mode.")
	//}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "tests", "migrate-nodegroups"),
			// Test NGINX on the 2xlarge node group.
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				endpoint := fmt.Sprintf("%s/echoserver", stack.Outputs["nginxServiceUrl"].(string))
				headers := map[string]string{"Host": "apps.example.com"}
				integration.AssertHTTPResultWithRetry(t, endpoint, headers, 10*time.Minute, func(body string) bool {
					return assert.NotEmpty(t, body, "Body should not be empty")
				})
			},
			EditDirs: []integration.EditDir{
				// Add the new, 4xlarge node group.
				{
					Dir:      path.Join(getCwd(t), "tests", "migrate-nodegroups", "steps", "step1"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
						endpoint := fmt.Sprintf("%s/echoserver", stack.Outputs["nginxServiceUrl"].(string))
						headers := map[string]string{"Host": "apps.example.com"}
						integration.AssertHTTPResultWithRetry(t, endpoint, headers, 10*time.Minute, func(body string) bool {
							return assert.NotEmpty(t, body, "Body should not be empty")
						})
					},
				},
				// Migrate NGINX from the 2xlarge to the 4xlarge node group by
				// changing its nodeSelector values, which forces migration via rolling update.
				// Then, wait & verify all resources are up and running.
				{
					Dir:      path.Join(getCwd(t), "tests", "migrate-nodegroups", "steps", "step2"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
						endpoint := fmt.Sprintf("%s/echoserver", stack.Outputs["nginxServiceUrl"].(string))
						headers := map[string]string{"Host": "apps.example.com"}
						integration.AssertHTTPResultWithRetry(t, endpoint, headers, 10*time.Minute, func(body string) bool {
							return assert.NotEmpty(t, body, "Body should not be empty")
						})

						// Create kubeconfig clients from kubeconfig.
						kubeconfig, err := json.Marshal(stack.Outputs["kubeconfig"])
						assert.NoError(t, err, "expected kubeconfig JSON marshalling to not error: %v", err)
						kubeAccess, err := utils.KubeconfigToKubeAccess(kubeconfig)
						assert.NoError(t, err, "expected kubeconfig clients to be created: %v", err)

						// Give it time for the new NGINX Deployment to
						// migrate, and for its previous Pods to terminate.
						time.Sleep(5 * time.Minute)

						// Assert all resources, across all namespaces are still ready after migration.
						utils.AssertKindInAllNamespacesReady(t, kubeAccess.Clientset, "replicasets")
						utils.AssertKindInAllNamespacesReady(t, kubeAccess.Clientset, "deployments")
					},
				},
				// Remove the workload namespace, and the aws-cni DaemonSet.
				// In validation step, kubectl drain & delete the unused 2xlarge node group.
				{
					Dir:      path.Join(getCwd(t), "tests", "migrate-nodegroups", "steps", "step3"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
						// Give it time for the workload namespace to delete.
						time.Sleep(1 * time.Minute)

						var err error
						var out []byte
						scriptsDir := path.Join(getCwd(t), "tests", "migrate-nodegroups", "scripts")

						// Create kubeconfig clients from kubeconfig.
						kubeconfig, err := json.Marshal(stack.Outputs["kubeconfig"])
						assert.NoError(t, err, "expected kubeconfig JSON marshalling to not error: %v", err)

						// Drain & delete t3.2xlarge node group.

						// TODO(metral): look into draining & deleting using
						// client-go instead of shell'ing out to kubectl

						// Write kubeconfig to temp file & export it for use
						// with kubectl.
						kubeconfigFile, err := ioutil.TempFile(os.TempDir(), "kubeconfig-*.json")
						assert.NoError(t, err, "expected tempfile to be created: %v", err)
						defer os.Remove(kubeconfigFile.Name())
						_, err = kubeconfigFile.Write(kubeconfig)
						assert.NoError(t, err, "expected kubeconfig to be written to tempfile with no error: %v", err)
						err = kubeconfigFile.Close()
						assert.NoError(t, err, "expected kubeconfig file to close with no error: %v", err)
						os.Setenv("KUBECONFIG", kubeconfigFile.Name())

						// Exec kubectl delete aws-cni DaemonSet.
						out, err = exec.Command("/bin/bash", path.Join(scriptsDir, "delete-aws-node-ds.sh")).Output()
						assert.NoError(t, err, "expected no errors during kubectl delete ds/aws-node: %v", err)
						utils.PrintAndLog(fmt.Sprintf("kubectl delete ds/aws-node output: %s\n", out), t)

						// Give it time for the aws-cni removal to clear in AWS.
						time.Sleep(1 * time.Minute)

						// Exec kubectl drain 2xlarge nodes.
						out, err = exec.Command("/bin/bash", path.Join(scriptsDir, "drain-t3.2xlarge-nodes.sh")).Output()
						assert.NoError(t, err, "expected no errors during kubectl drain: %v", err)
						utils.PrintAndLog(fmt.Sprintf("kubectl drain output: %s\n", out), t)

						// Exec kubectl delete 2xlarge nodes.
						out, err = exec.Command("/bin/bash", path.Join(scriptsDir, "delete-t3.2xlarge-nodes.sh")).Output()
						assert.NoError(t, err, "expected no errors during kubectl delete: %v", err)
						utils.PrintAndLog(fmt.Sprintf("kubectl delete output: %s\n", out), t)
					},
				},
				// Scale down the 2xlarge node group to a desired capacity of 0 workers.
				{
					Dir:      path.Join(getCwd(t), "tests", "migrate-nodegroups", "steps", "step4"),
					Additive: true,
				},
				// Remove the unused 2xlarge node group.
				{
					Dir:      path.Join(getCwd(t), "tests", "migrate-nodegroups", "steps", "step5"),
					Additive: true,
				},
			},
		})

	integration.ProgramTest(t, &test)
}

func getJSBaseOptions(t *testing.T) integration.ProgramTestOptions {
	region := getEnvRegion(t)
	base := getBaseOptions(t)
	baseJS := base.With(integration.ProgramTestOptions{
		Config: map[string]string{
			"aws:region": region,
		},
		Dependencies: []string{
			"@pulumi/eks",
		},
		Verbose: true,
	})

	return baseJS
}
