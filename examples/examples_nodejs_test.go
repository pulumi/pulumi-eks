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
//go:build nodejs || all
// +build nodejs all

package example

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path"
	"testing"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"

	"github.com/pulumi/providertest/pulumitest"
	"github.com/pulumi/providertest/pulumitest/opttest"
	"github.com/pulumi/pulumi-eks/examples/utils"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/optup"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAccCluster(t *testing.T) {

	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:           path.Join(getCwd(t), "./cluster"),
			RunUpdateTest: false,
			RunBuild:      true, // ensure that we can transpile the TypeScript program
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
					info.Outputs["kubeconfig3"],
					info.Outputs["kubeconfig4"],
				)

				// let's test there's a iamRoleArn specified for the cluster
				assert.NotEmpty(t, info.Outputs["iamRoleArn"])

				assert.NoError(t, utils.ValidateDaemonSet(t, info.Outputs["kubeconfig2"], "kube-system", "aws-node", func(ds *appsv1.DaemonSet) {
					// The exact image names/versions are obtained from the manifest in `nodejs/eks/cni/aws-k8s-cni.yaml`.

					var initContainerFound bool
					for _, ic := range ds.Spec.Template.Spec.InitContainers {
						if ic.Name != "aws-vpc-cni-init" {
							continue
						}

						initContainerFound = true
						assert.Equal(t, "602401143452.dkr.ecr.us-west-2.amazonaws.com/amazon-k8s-cni-init:v1.16.0", ic.Image)

						var tcpEarly bool
						for _, env := range ic.Env {
							if env.Name == "DISABLE_TCP_EARLY_DEMUX" {
								tcpEarly = env.Value == "true"
							}
						}
						assert.True(t, tcpEarly)
					}
					assert.True(t, initContainerFound)

					var awsNodeContainerFound bool
					for _, c := range ds.Spec.Template.Spec.Containers {
						switch c.Name {
						case "aws-node":
							awsNodeContainerFound = true
							assert.Equal(t, "602401143452.dkr.ecr.us-west-2.amazonaws.com/amazon-k8s-cni:v1.16.0", c.Image)
						case "aws-eks-nodeagent":
							assert.Equal(t, "602401143452.dkr.ecr.us-west-2.amazonaws.com/amazon/aws-network-policy-agent:v1.0.7", c.Image)
						}
					}
					assert.True(t, awsNodeContainerFound)
				}))

				// Ensure that cluster 4 only has ARM64 nodes.
				assert.NoError(t, utils.ValidateNodes(t, info.Outputs["kubeconfig4"], func(nodes *corev1.NodeList) {
					require.NotNil(t, nodes)
					assert.NotEmpty(t, nodes.Items)

					for _, node := range nodes.Items {
						assert.Equal(t, "arm64", node.Status.NodeInfo.Architecture)
						require.NotNil(t, node.ObjectMeta.Labels)
						assert.Equal(t, "arm64", node.ObjectMeta.Labels["kubernetes.io/arch"])
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
	t.Skip("https://github.com/pulumi/pulumi-eks/issues/1041")
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "./fargate"),
			Config: map[string]string{
				// Hard code to us-east-2 since Fargate support is not yet available in all regions
				// (specifically us-west-2).
				"aws:region": "us-east-2",
			},
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
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

func TestAccMNG_DiskSize(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "tests", "managed-ng-disk-size"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)

				assert.NoError(t, utils.ValidateNodes(t, info.Outputs["kubeconfig"], func(nodes *corev1.NodeList) {
					require.NotNil(t, nodes)
					assert.NotEmpty(t, nodes.Items)

					for _, node := range nodes.Items {
						nodeEphemeralStorage := node.Status.Capacity[corev1.ResourceEphemeralStorage]

						// Defined in test managed-ng-disk-size
						var desiredSizeGB int64 = 50
						assert.True(t, nodeEphemeralStorage.CmpInt64(desiredSizeGB*1_000_000_000) >= 0)
					}

				}))
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
	t.Skip("Currently fails with resource apps-0b02f85a/nginx-2eefdacd was not successfully created by the Kubernetes API server : pods \"nginx-2eefdacd\" is forbidden: User \"pulumi:alice\" cannot patch resource \"pods\" in API group \"\" in the namespace \"apps-0b02f85a\"")
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
	unsetAWSProfileEnv(t)

	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "aws-profile"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				// The `cluster.kubeconfig` output should fail as it does not have the right AWS_PROFILE set.
				t.Logf("Ensuring cluster.kubeconfig fails without AWS_PROFILE envvar set")
				utils.EnsureKubeconfigFails(t, info.Outputs["kubeconfig"])

				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfigWithProfile"],
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
						kubeconfigFile, err := os.CreateTemp(os.TempDir(), "kubeconfig-*.json")
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

// TestAccCNIAcrossUpdates tests that the CNI manifest is reapplied when the EKS provider changes its base manifest.
func TestAccCNIAcrossUpdates(t *testing.T) {
	t.Log("Running `pulumi up` with v2.1.0 of the EKS provider")
	pt := pulumitest.NewPulumiTest(t, "ensure-cni-upgrade", opttest.AttachDownloadedPlugin("eks", "2.1.0"))
	result := pt.Up()

	t.Log("Ensuring a kubeconfig output is present")
	kcfg, ok := result.Outputs["kubeconfig"]
	require.True(t, ok)

	t.Log("Validating that the v1.11.0 CNI manifest is applied correctly")
	var awsNodeContainerFound bool
	assert.NoError(t, utils.ValidateDaemonSet(t, kcfg.Value, "kube-system", "aws-node", func(ds *appsv1.DaemonSet) {
		for _, c := range ds.Spec.Template.Spec.Containers {
			switch c.Name {
			case "aws-node":
				awsNodeContainerFound = true
				assert.Equal(t, "602401143452.dkr.ecr.us-west-2.amazonaws.com/amazon-k8s-cni:v1.11.0", c.Image)
			}
		}
	}))
	assert.True(t, awsNodeContainerFound)

	t.Log("Running `pulumi up` with the latest version of the EKS provider")
	pt = pt.CopyToTempDir(opttest.Defaults())

	prevResult := pt.Preview()
	assert.Equal(t, 1, len(prevResult.ChangeSummary))

	result = pt.Up()
	kcfg, ok = result.Outputs["kubeconfig"]
	require.True(t, ok)

	t.Log("Validating that the CNI manifests has been updated to the latest v1.16.0 version")
	awsNodeContainerFound = false
	assert.NoError(t, utils.ValidateDaemonSet(t, kcfg.Value, "kube-system", "aws-node", func(ds *appsv1.DaemonSet) {
		// The exact image names/versions are obtained from the manifest in `nodejs/eks/cni/aws-k8s-cni.yaml`.
		for _, c := range ds.Spec.Template.Spec.Containers {
			switch c.Name {
			case "aws-node":
				awsNodeContainerFound = true
				assert.Equal(t, "602401143452.dkr.ecr.us-west-2.amazonaws.com/amazon-k8s-cni:v1.16.0", c.Image)
			case "aws-eks-nodeagent":
				assert.Equal(t, "602401143452.dkr.ecr.us-west-2.amazonaws.com/amazon/aws-network-policy-agent:v1.0.7", c.Image)
			}
		}
	}))
	assert.True(t, awsNodeContainerFound)

	t.Log("Ensuring that re-running `pulumi up` results in no changes and no spurious diffs")
	pt.Up(optup.ExpectNoChanges())
}

func TestAccAuthenticationMode(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "authentication-mode"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				// Verify that the clusters with all three authentication modes are working.
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfigConfigMap"],
					info.Outputs["kubeconfigBoth"],
					info.Outputs["kubeconfigApi"],
				)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccMultiRole(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "tests", "multi-role"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				// Verify that the cluster is working.
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccAuthenticationModeMigration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			// step1 has authentication mode set to CONFIG_MAP
			Dir: path.Join(getCwd(t), "tests", "authentication-mode-migration", "step1"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)
			},
			EditDirs: []integration.EditDir{
				// step2 changes authentication mode to API_AND_CONFIG_MAP and adds the necessary access entries
				{
					Dir:      path.Join(getCwd(t), "tests", "authentication-mode-migration", "step2"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						utils.RunEKSSmokeTest(t,
							info.Deployment.Resources,
							info.Outputs["kubeconfig"],
						)
					},
				},
				// step3 changes the authentication mode to API only, this also deletes the aws-auth config-map
				{
					Dir:      path.Join(getCwd(t), "tests", "authentication-mode-migration", "step3"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						utils.RunEKSSmokeTest(t,
							info.Deployment.Resources,
							info.Outputs["kubeconfig"],
						)
					},
				},
				// step4 scale nodegroups up to ensure new instances are able to register with the cluster
				{
					Dir:      path.Join(getCwd(t), "tests", "authentication-mode-migration", "step4"),
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

func TestAccManagedNodeGroupCustom(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "custom-managed-nodegroup"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.RunEKSSmokeTest(t,
					info.Deployment.Resources,
					info.Outputs["kubeconfig"],
				)

				expectedLaunchTemplateName := info.Outputs["launchTemplateName"]

				var launchTemplateFound bool = false
				for _, resource := range info.Deployment.Resources {
					if resource.Type.String() == "aws:eks/nodeGroup:NodeGroup" {
						launchTemplateFound = true
						// verify that the custom launch template is used
						launchTemplateName := resource.Outputs["launchTemplate"].(map[string]interface{})["name"]
						assert.Equal(t, expectedLaunchTemplateName, launchTemplateName)
					}
				}
				assert.True(t, launchTemplateFound, "Expected launch template was not found")
			},
		})

	integration.ProgramTest(t, &test)
}
