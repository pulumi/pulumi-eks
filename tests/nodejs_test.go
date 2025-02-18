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

package tests

import (
	"context"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"golang.org/x/exp/rand"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/utils/ptr"

	"github.com/pulumi/providertest/pulumitest"
	"github.com/pulumi/providertest/pulumitest/optnewstack"
	"github.com/pulumi/providertest/pulumitest/opttest"
	utils "github.com/pulumi/pulumi-eks/tests/internal"
	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/optup"
	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAccCluster(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:           path.Join(getExamples(t), "./cluster"),
			RunUpdateTest: false,
			RunBuild:      true, // ensure that we can transpile the TypeScript program
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(
					info.Outputs["kubeconfig1"],
					info.Outputs["kubeconfig2"],
					info.Outputs["kubeconfig3"],
					info.Outputs["kubeconfig4"],
				))

				assert.NotEmpty(t, info.Outputs["defaultAsgName"], "should have a default ASG")

				// let's test there's a iamRoleArn specified for the cluster
				assert.NotEmpty(t, info.Outputs["iamRoleArn"])

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

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccKubernetesServiceIPv4RangeForCluster(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:           path.Join(getExamples(t), "./cluster-with-serviceiprange"),
			RunUpdateTest: false, // this is a new feature so will not be available in the existing package
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				serviceIpv4Range := info.Outputs["kubernetesServiceRange"].(string)
				if serviceIpv4Range != "172.16.0.0/20" {
					t.Errorf("expected `172.16.0.020`: got %q", serviceIpv4Range)
				}
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccFargate(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "./fargate"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccNodeGroup(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           path.Join(getExamples(t), "nodegroup"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig1"], info.Outputs["kubeconfig2"]))
			},
			EditDirs: []integration.EditDir{
				{
					// Re-running should not introduce any changes.
					Dir:             path.Join(getExamples(t), "nodegroup"),
					ExpectNoChanges: true,
					Additive:        true,
				},
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccManagedNodeGroup(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			RunUpdateTest: false,
			Dir:           path.Join(getExamples(t), "managed-nodegroups"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccMNG_withMissingRole(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir:              path.Join(getTestPrograms(t), "managed-ng-missing-role"),
			ExpectFailure:    true,
			RetryFailedSteps: false,
			SkipRefresh:      true,
			Quick:            true,
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccMNG_withAwsAuth(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "managed-ng-aws-auth"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
			EditDirs: []integration.EditDir{
				{
					Dir:      path.Join(getTestPrograms(t), "managed-ng-aws-auth", "step1"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
					},
				},
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccMNG_DiskSize(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "managed-ng-disk-size"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))

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

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccTags(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "tags"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig1"], info.Outputs["kubeconfig2"]))
				for _, r := range info.Deployment.Resources {
					if r.Type == "aws:autoscaling/group:Group" {
						assert.NotEqualf(t, "example-ng-tags-ng2", string(r.ID),
							"aws.autoscaling.Group should have an autonamed random suffix")
					}
				}
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccStorageClasses(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "storage-classes"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig1"], info.Outputs["kubeconfig2"]))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccOidcIam(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "oidc-iam-sa"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccScopedKubeconfig(t *testing.T) {
	t.Skip("Currently fails with resource apps-0b02f85a/nginx-2eefdacd was not successfully created by the Kubernetes API server : pods \"nginx-2eefdacd\" is forbidden: User \"pulumi:alice\" cannot patch resource \"pods\" in API group \"\" in the namespace \"apps-0b02f85a\"")
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "scoped-kubeconfigs"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccAwsProfile(t *testing.T) {
	setProfileCredentials(t, "aws-profile-node")

	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "aws-profile"),
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

				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfigWithProfile"]))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccAwsProfileRole(t *testing.T) {
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "aws-profile-role"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
		})
	programTestWithExtraOptions(t, &test, nil)
}

func TestAccEncryptionProvider(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "encryption-provider"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccExtraSecurityGroups(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "extra-sg"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccReplaceClusterAddSubnets(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "replace-cluster-add-subnets"),
			EditDirs: []integration.EditDir{
				{
					Dir:      path.Join(getTestPrograms(t), "replace-cluster-add-subnets", "step1"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
					},
				},
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccTagInputTypes(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "tag-input-types"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccImportDefaultEksSecgroup(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "modify-default-eks-sg"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
			EditDirs: []integration.EditDir{
				{
					Dir:      path.Join(getExamples(t), "modify-default-eks-sg", "step1"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
					},
				},
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccVpcSubnetTags(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "subnet-tags"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
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
	// Skipping for now because we have removed the `eks:index:VpcCni` resource.
	// In the real world pulumi would use the previous version of the provider to delete the `eks:index:VpcCni` resource
	// but in the test it uses the current local provider which doesn't have the resource and causes the test to fail.
	t.Skip("Skipping for now")
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}

	cwd, err := os.Getwd()
	require.NoError(t, err)

	region := getEnvRegion(t)
	eksClient := createEksClient(t)
	mostRecentVpcCniVersion, err := utils.FindMostRecentAddonVersion(eksClient, "vpc-cni")
	require.NoError(t, err)

	t.Log("Running `pulumi up` with v2.7.9 of the EKS provider")

	pt := pulumitest.NewPulumiTest(t, "ensure-cni-upgrade", opttest.DownloadProviderVersion("eks", "2.7.9"), opttest.NewStackOptions(optnewstack.DisableAutoDestroy()))
	pt.SetConfig(t, "aws:region", region)
	result := pt.Up(t)

	t.Log("Ensuring a kubeconfig output is present")
	kcfg, ok := result.Outputs["kubeconfig"]
	require.True(t, ok)

	t.Log("Validating that the v1.16.0 CNI manifest is applied correctly")
	var awsNodeContainerFound bool
	assert.NoError(t, utils.ValidateDaemonSet(t, kcfg.Value, "kube-system", "aws-node", func(ds *appsv1.DaemonSet) {
		// The exact image names/versions are obtained from the manifest for v2.7.9 https://github.com/pulumi/pulumi-eks/blob/9d80b5df0dc491f3dd09c159a0183e40e8350bba/nodejs/eks/cni/aws-k8s-cni.yaml
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
	state := pt.ExportStack(t)

	t.Log("Running `pulumi up` with the latest version of the EKS provider")
	pt = pt.CopyToTempDir(t,
		opttest.Defaults(),
		opttest.NewStackOptions(optnewstack.EnableAutoDestroy()),
		opttest.DownloadProviderVersion("eks", "2.7.9"),
		opttest.LocalProviderPath("eks", filepath.Join(cwd, "..", "bin")),
		opttest.YarnLink("@pulumi/eks"),
	)
	pt.SetConfig(t, "aws:region", region)
	pt.ImportStack(t, state)

	prevResult := pt.Preview(t)
	assert.NotContains(t, prevResult.ChangeSummary, apitype.OpReplace, "Expected no resources to be replaced")

	result = pt.Up(t)

	t.Log("Validating that the CNI manifests has been updated to the latest version")

	utils.ValidateVpcCni(t, eksClient, utils.VpcCniValidation{
		ClusterName:          result.Outputs["clusterName"].Value.(string),
		Kubeconfig:           result.Outputs["kubeconfig"].Value,
		ExpectedAddonVersion: mostRecentVpcCniVersion,
		ExpectedInitEnvVars: map[string]string{
			"DISABLE_TCP_EARLY_DEMUX": "true",
		},
		ExpectedEnvVars: map[string]string{
			"AWS_VPC_K8S_CNI_LOGLEVEL": "INFO",
		},
		SecurityContextPrivileged: ptr.To(true),
	})

	t.Log("Ensuring that re-running `pulumi up` results in no changes and no spurious diffs")
	pt.Up(t, optup.ExpectNoChanges())
}

func TestAccAuthenticationMode(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "authentication-mode"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				// Verify that the clusters with all three authentication modes are working.
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(
					info.Outputs["kubeconfigConfigMap"],
					info.Outputs["kubeconfigBoth"],
					info.Outputs["kubeconfigApi"],
				))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccMultiRole(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "multi-role"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				// Verify that the cluster is working.
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccAuthenticationModeMigration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			// step1 has authentication mode set to CONFIG_MAP
			Dir: path.Join(getTestPrograms(t), "authentication-mode-migration", "step1"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
			EditDirs: []integration.EditDir{
				// step2 changes authentication mode to API_AND_CONFIG_MAP and adds the necessary access entries
				{
					Dir:      path.Join(getTestPrograms(t), "authentication-mode-migration", "step2"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
					},
				},
				// step3 changes the authentication mode to API only, this also deletes the aws-auth config-map
				{
					Dir:      path.Join(getTestPrograms(t), "authentication-mode-migration", "step3"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
					},
				},
				// step4 scale nodegroups up to ensure new instances are able to register with the cluster
				{
					Dir:      path.Join(getTestPrograms(t), "authentication-mode-migration", "step4"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
					},
				},
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccManagedNodeGroupCustom(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "custom-managed-nodegroup"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))

				defaultInstanceRoles := info.Outputs["defaultInstanceRoles"]
				assert.Empty(t, defaultInstanceRoles, "Expected no instanceRoles to be created")

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

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccManagedNodeGroupWithVersion(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "managed-ng-with-version"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

// TestAccManagedNodeGroupOS tests that the OS of the managed node group instances can be customized.
func TestAccManagedNodeGroupOS(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "managed-ng-os"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))

				assert.NoError(t, utils.ValidateNodePodCapacity(t, info.Outputs["kubeconfig"], 8, 100, "increased-pod-capacity"))
				assert.NoError(t, utils.ValidateNodeStorage(t, info.Outputs["kubeconfig"], 4, 100*1_000_000_000, "increased-storage-capacity"))

				assert.NoError(t, utils.ValidateNodes(t, info.Outputs["kubeconfig"], func(nodes *corev1.NodeList) {
					require.NotNil(t, nodes)
					assert.NotEmpty(t, nodes.Items)

					var foundNodes = 0
					for _, node := range nodes.Items {
						if gpus, ok := node.Status.Capacity["nvidia.com/gpu"]; !ok {
							continue
						} else {
							assert.True(t, gpus.CmpInt64(1) == 0)
							foundNodes++
						}
					}
					assert.Equal(t, 2, foundNodes, "Expected %s nodes with Nvidia GPUs", foundNodes)
				}))

				// Validate that the nodes with the custom AMI ID are present
				customAmiId := info.Outputs["customAmiId"].(string)
				ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
				defer cancel()
				err := utils.RetryWithExponentialBackoff(ctx, 10*time.Second, func() error {
					nodes, err := utils.FindNodesWithAmiID(t, info.Outputs["kubeconfig"], customAmiId)
					if err != nil {
						return err
					}
					t.Logf("Found %d nodes with custom AMI ID: %v", len(nodes), nodes)
					if len(nodes) != 2 {
						return fmt.Errorf("expected 2 nodes with custom AMI ID, got %d", len(nodes))
					}
					return nil
				})
				require.NoError(t, err)
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

// TestAccSelfManagedNodeGroupOS tests that the OS of the self managed node group instances can be customized.
func TestAccSelfManagedNodeGroupOS(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "self-managed-ng-os"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))

				assert.NoError(t, utils.ValidateNodePodCapacity(t, info.Outputs["kubeconfig"], 4, 100, "increased-pod-capacity"))
				assert.NoError(t, utils.ValidateNodeStorage(t, info.Outputs["kubeconfig"], 4, 100*1_000_000_000, "increased-storage-capacity"))

				// Validate that nodeSecurityGroupId is set to the security group passed in as an input
				require.NotNil(t, info.Outputs["standardNodeSecurityGroup"])
				require.NotNil(t, info.Outputs["standardNodeSecurityGroupV2"])
				standardSecurityGroup := info.Outputs["standardNodeSecurityGroup"].(map[string]interface{})
				standardSecurityGroupV2 := info.Outputs["standardNodeSecurityGroupV2"].(map[string]interface{})
				assert.Equal(t, standardSecurityGroup["id"], info.Outputs["standardNodeSecurityGroupId"])
				assert.Equal(t, standardSecurityGroupV2["id"], info.Outputs["standardNodeSecurityGroupIdV2"])

				// Validate that the nodeSecurityGroupId is set to security group ID passed in as an input
				assert.Nil(t, info.Outputs["customNodeSecurityGroup"])
				assert.Nil(t, info.Outputs["customNodeSecurityGroupV2"])
				require.NotEmpty(t, info.Outputs["clusterNodeSecurityGroupId"])
				clusterNodeGroupId := info.Outputs["clusterNodeSecurityGroupId"].(string)

				assert.Equal(t, clusterNodeGroupId, info.Outputs["customNodeSecurityGroupId"])
				assert.Equal(t, clusterNodeGroupId, info.Outputs["customNodeSecurityGroupIdV2"])
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

// TestAccSelfManagedNodeGroupInstanceProfile tests that NodeGroup and NodeGroupV2 can be passed
// an instanceProfile or instanceProfileName via args or cluster.nodeGroupOptions
func TestAccSelfManagedNodeGroupInstanceProfile(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "self-managed-ng-instanceProfile"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))

				require.NotEmpty(t, info.Outputs["passedInstanceProfileName"])
				passedInstanceProfileName := info.Outputs["passedInstanceProfileName"].(string)

				for _, resource := range info.Deployment.Resources {
					utils.PrintAndLog(resource.Type.String(), t)
					if resource.Type.String() == "aws:ec2/launchTemplate:LaunchTemplate" {
						require.NotEmpty(t, resource.Outputs["iamInstanceProfile"])
						instanceProfile := resource.Outputs["iamInstanceProfile"].(map[string]interface{})
						instanceProfileName := instanceProfile["name"].(string)
						utils.PrintAndLog(fmt.Sprintf("LaunchTemplate Output iamInstanceProfile.name: %v", instanceProfileName), t)
						assert.Equal(t, instanceProfileName, passedInstanceProfileName)
					}
					if resource.Type.String() == "aws:ec2/launchConfiguration:LaunchConfiguration" {
						require.NotEmpty(t, resource.Outputs["iamInstanceProfile"])
						instanceProfileName := resource.Outputs["iamInstanceProfile"].(string)
						utils.PrintAndLog(fmt.Sprintf("LaunchConfiguration Output iamInstanceProfile: %v", instanceProfileName), t)
						assert.Equal(t, instanceProfileName, passedInstanceProfileName)
					}
				}
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

// TestAccClusterAddons tests that the cluster addons are applied correctly and can be updated.
func TestAccClusterAddons(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}

	eksClient := createEksClient(t)
	defaultVpcCniVersion, err := utils.FindDefaultAddonVersion(eksClient, "vpc-cni")
	require.NoError(t, err)
	mostRecentVpcCniVersion, err := utils.FindMostRecentAddonVersion(eksClient, "vpc-cni")
	require.NoError(t, err)

	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "cluster-addons"),
			Config: map[string]string{
				"defaultVpcCniVersion": defaultVpcCniVersion,
				"latestVpcCniVersion":  mostRecentVpcCniVersion,
			},
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))

				// options are set in tests/cluster-addons
				utils.ValidateVpcCni(t, eksClient, utils.VpcCniValidation{
					ClusterName:          info.Outputs["clusterName"].(string),
					Kubeconfig:           info.Outputs["kubeconfig"],
					ExpectedAddonVersion: defaultVpcCniVersion,
					ExpectedInitEnvVars: map[string]string{
						"DISABLE_TCP_EARLY_DEMUX": "true",
					},
					ExpectedEnvVars: map[string]string{
						"AWS_VPC_K8S_CNI_LOGLEVEL":          "INFO",
						"POD_SECURITY_GROUP_ENFORCING_MODE": "standard",
						"ENABLE_POD_ENI":                    "true",
					},
					SecurityContextPrivileged: ptr.To(true),
					NetworkPoliciesEnabled:    ptr.To(true),
				})
			},
			// step2 doesn't specify a vpcCniVersion, so it should use the most recent for the cluster's version
			EditDirs: []integration.EditDir{
				{
					Dir:      path.Join(getTestPrograms(t), "cluster-addons", "step2"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))

						// options are set in tests/cluster-addons
						utils.ValidateVpcCni(t, eksClient, utils.VpcCniValidation{
							ClusterName:          info.Outputs["clusterName"].(string),
							Kubeconfig:           info.Outputs["kubeconfig"],
							ExpectedAddonVersion: mostRecentVpcCniVersion,
							ExpectedInitEnvVars: map[string]string{
								"DISABLE_TCP_EARLY_DEMUX": "true",
							},
							ExpectedEnvVars: map[string]string{
								"AWS_VPC_K8S_CNI_LOGLEVEL":          "INFO",
								"POD_SECURITY_GROUP_ENFORCING_MODE": "standard",
								"ENABLE_POD_ENI":                    "true",
							},
							SecurityContextPrivileged: ptr.To(true),
							NetworkPoliciesEnabled:    ptr.To(true),
						})
					},
				},
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccSkipDefaultSecurityGroups(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "skip-default-security-groups"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))

				assert.Nil(t, info.Outputs["clusterSecurityGroup"])
				assert.Nil(t, info.Outputs["nodeSecurityGroup"])
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccNetworkPolicies(t *testing.T) {
	t.Skip("pulumi/pulumi-eks#1465")
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "network-policies"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccPodSecurityGroups(t *testing.T) {
	t.Skip("pulumi/pulumi-eks#1530")
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "pod-security-groups"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccScalarTypes(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "scalar-types"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig1"], info.Outputs["kubeconfig2"]))

				// cluster1 runs the default settings with a default node group and an oidc provider
				require.NotNil(t, info.Outputs["cluster1"])
				cluster1 := info.Outputs["cluster1"].(map[string]interface{})
				require.NotNil(t, cluster1["eksCluster"])
				eksCluster1 := cluster1["eksCluster"].(map[string]interface{})

				require.NotNil(t, cluster1["clusterSecurityGroup"])
				require.NotNil(t, cluster1["nodeSecurityGroup"])
				assert.Equal(t, cluster1["clusterSecurityGroup"].(map[string]interface{})["id"], cluster1["clusterSecurityGroupId"].(string))
				assert.Equal(t, cluster1["nodeSecurityGroup"].(map[string]interface{})["id"], cluster1["nodeSecurityGroupId"].(string))
				assert.NotEmpty(t, cluster1["clusterIngressRuleId"])
				assert.Empty(t, cluster1["fargateProfileId"])
				assert.Empty(t, cluster1["fargateProfileStatus"])

				require.NotNil(t, cluster1["defaultNodeGroup"])
				defaultNodeGroup1 := cluster1["defaultNodeGroup"].(map[string]interface{})
				assert.Equal(t, defaultNodeGroup1["autoScalingGroup"].(map[string]interface{})["name"], cluster1["defaultNodeGroupAsgName"].(string))

				require.NotNil(t, cluster1["core"])
				coreData1 := cluster1["core"].(map[string]interface{})
				require.NotNil(t, coreData1["oidcProvider"])
				oidcProvider1 := coreData1["oidcProvider"].(map[string]interface{})

				assert.Equal(t, oidcProvider1["arn"], cluster1["oidcProviderArn"])
				oidcProviderUrl1 := getOidcProviderUrl(t, eksCluster1)
				assert.Equal(t, oidcProviderUrl1, cluster1["oidcProviderUrl"])
				assert.Equal(t, strings.ReplaceAll(oidcProviderUrl1, "https://", ""), cluster1["oidcIssuer"],
					"expected oidcIssuer to be the same as the oidcProvider url without the https:// prefix")

				// cluster2 runs with fargate, no default node group, no default security groups and no oidc provider
				require.NotNil(t, info.Outputs["cluster2"])
				cluster2 := info.Outputs["cluster2"].(map[string]interface{})
				require.NotNil(t, cluster2["eksCluster"])
				eksCluster2 := cluster2["eksCluster"].(map[string]interface{})
				require.NotNil(t, eksCluster2["vpcConfig"])
				vpcConfig := eksCluster2["vpcConfig"].(map[string]interface{})

				// AWS EKS always creates a security group for the cluster
				eksSecurityGroupId := vpcConfig["clusterSecurityGroupId"]
				require.NotEmpty(t, eksSecurityGroupId)

				// verify that the cluster and node security group ID are set to the eks security group ID
				assert.Equal(t, eksSecurityGroupId, cluster2["clusterSecurityGroupId"])
				assert.Equal(t, eksSecurityGroupId, cluster2["nodeSecurityGroupId"])

				// verify that the provider creates no security groups
				assert.Nil(t, cluster2["clusterSecurityGroup"])
				assert.Nil(t, cluster2["nodeSecurityGroup"])
				assert.Empty(t, cluster2["clusterIngressRuleId"])

				// verify that the provider creates no default node group
				assert.Nil(t, cluster2["defaultNodeGroup"])
				assert.Empty(t, cluster2["defaultNodeGroupAsgName"])

				require.NotNil(t, cluster2["core"])
				coreData2 := cluster2["core"].(map[string]interface{})

				// verify that the provider creates no IAM OIDC provider
				assert.Empty(t, cluster2["oidcProviderArn"])
				assert.Nil(t, coreData2["oidcProvider"])

				// every EKS cluster has an OIDC provider URL, even if no OIDC provider is created
				oidcProviderUrl2 := cluster2["oidcProviderUrl"].(string)
				assert.NotEmpty(t, oidcProviderUrl2)
				assert.NotEmpty(t, cluster2["oidcIssuer"])
				assert.Equal(t, strings.ReplaceAll(oidcProviderUrl2, "https://", ""), cluster2["oidcIssuer"],
					"expected oidcIssuer to be the same as the oidcProvider url without the https:// prefix")

				// verify that the provider creates a fargate profile
				require.NotNil(t, coreData2["fargateProfile"])
				fargateProfile := coreData2["fargateProfile"].(map[string]interface{})
				assert.Equal(t, fargateProfile["id"], cluster2["fargateProfileId"])
				assert.Equal(t, fargateProfile["status"], cluster2["fargateProfileStatus"])
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccDefaultInstanceRole(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "default-instance-role"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))

				require.NotNil(t, info.Outputs["instanceRoles"])
				instanceRoles := info.Outputs["instanceRoles"].([]interface{})
				assert.Len(t, instanceRoles, 1, "expected the default instance role to be created")
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccEksAutoMode(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}

	// The test needs a predictable cluster name for tagging the subnets.
	// Adding a random suffix to the cluster name to avoid conflicts between test runs.
	clusterName := fmt.Sprintf("eks-auto-mode-%s", randomString(8))

	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "eks-auto-mode"),
			Config: map[string]string{
				"clusterName": clusterName,
			},
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources,
					utils.WithKubeConfigs(info.Outputs["kubeconfig"]),
					utils.ValidateDaemonSets(), // no daemonsets in auto mode
					utils.ValidateDeployments(
						utils.KubernetesResource{Name: "nginx", Namespace: "nginx"},
						utils.KubernetesResource{Name: "coredns", Namespace: "kube-system"},
					),
				)

				assert.NotEmpty(t, info.Outputs["nodeRoleName"].(string), "expected nodeRoleName to be set")
				assert.Empty(t, info.Outputs["defaultNodeGroup"].(string), "expected no default node group to be created")
				integration.AssertHTTPResultWithRetry(t, info.Outputs["url"].(string), nil, 6*time.Minute, func(body string) bool {
					return assert.Contains(t, body, "Hello, Pulumi!")
				})
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

// TestAccEksAutoModeUpgrade tests that the EKS cluster can be upgraded from a cluster with regular managed node groups
// to a cluster using EKS Auto Mode
func TestAccEksAutoModeUpgrade(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}

	// The test needs a predictable cluster name for tagging the subnets.
	// Adding a random suffix to the cluster name to avoid conflicts between test runs.
	clusterName := fmt.Sprintf("eks-auto-mode-%s", randomString(8))

	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "auto-mode-upgrade"),
			Config: map[string]string{
				"clusterName": clusterName,
			},
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources,
					utils.WithKubeConfigs(info.Outputs["kubeconfig"]),
					utils.ValidateDeployments(
						utils.KubernetesResource{Name: "nginx", Namespace: "nginx"},
						utils.KubernetesResource{Name: "coredns", Namespace: "kube-system"},
					),
				)
			},
			EditDirs: []integration.EditDir{
				{
					Dir:      path.Join(getTestPrograms(t), "auto-mode-upgrade", "step2"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						utils.ValidateClusters(t, info.Deployment.Resources,
							utils.WithKubeConfigs(info.Outputs["kubeconfig"]),
							utils.ValidateDeployments(
								utils.KubernetesResource{Name: "nginx", Namespace: "nginx"},
								utils.KubernetesResource{Name: "coredns", Namespace: "kube-system"},
							),
						)
					},
				},
				{
					Dir:      path.Join(getTestPrograms(t), "auto-mode-upgrade", "step3"),
					Additive: true,
					ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
						utils.ValidateClusters(t, info.Deployment.Resources,
							utils.WithKubeConfigs(info.Outputs["kubeconfig"]),
							utils.ValidateDaemonSets(), // no daemonsets in auto mode
							utils.ValidateDeployments(
								utils.KubernetesResource{Name: "nginx", Namespace: "nginx"},
								utils.KubernetesResource{Name: "coredns", Namespace: "kube-system"},
							),
						)
					},
				},
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccEfa(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}

	// these are the cheapest instances that support EFA. We're using a mix of instance types to ensure availability
	instanceTypes := []string{"g6.8xlarge", "g4dn.8xlarge", "gr6.8xlarge", "g5.8xlarge", "g6.16xlarge"}
	supportedAZs, err := utils.FindSupportedAZs(t, instanceTypes)
	require.NoError(t, err)

	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getExamples(t), "efa"),
			Config: map[string]string{
				"instanceTypes":     strings.Join(instanceTypes, ","),
				"availabilityZones": strings.Join(supportedAZs, ","),
			},
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				require.NotEmpty(t, info.Outputs["placementGroupName"])

				// Verify that the cluster is working.
				utils.ValidateClusters(t, info.Deployment.Resources, utils.WithKubeConfigs(info.Outputs["kubeconfig"]))

				// verify that two nodes have EFA enabled
				assert.NoError(t, utils.ValidateNodes(t, info.Outputs["kubeconfig"], func(nodes *corev1.NodeList) {
					require.NotNil(t, nodes)
					assert.NotEmpty(t, nodes.Items)

					var foundNodes = 0
					for _, node := range nodes.Items {
						if efas, ok := node.Status.Capacity["vpc.amazonaws.com/efa"]; !ok {
							continue
						} else {
							assert.True(t, efas.CmpInt64(1) == 0)
							foundNodes++
						}
					}
					assert.Equal(t, 2, foundNodes, "Expected %s nodes with EFA enabled", foundNodes)
				}))
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccAutoModeCustomRole(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}

	test := getJSBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getTestPrograms(t), "auto-mode-custom-role"),
			ExtraRuntimeValidation: func(t *testing.T, info integration.RuntimeValidationStackInfo) {
				utils.ValidateClusters(t, info.Deployment.Resources,
					utils.WithKubeConfigs(info.Outputs["kubeconfig"]),
					utils.ValidateDaemonSets(), // no daemonsets in auto mode
					utils.ValidateDeployments(
						utils.KubernetesResource{Name: "nginx", Namespace: "nginx"},
						utils.KubernetesResource{Name: "coredns", Namespace: "kube-system"},
					),
				)
			},
		})

	programTestWithExtraOptions(t, &test, nil)
}

func TestAccAutoModePreview(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping test in short mode.")
	}
	cwd, err := os.Getwd()
	require.NoError(t, err)
	options := []opttest.Option{
		opttest.LocalProviderPath("eks", filepath.Join(cwd, "..", "bin")),
		opttest.YarnLink("@pulumi/eks"),
	}
	pt := pulumitest.NewPulumiTest(t, path.Join(getTestPrograms(t), "auto-mode-preview"), options...)

	previewResult := pt.Preview(t)
	t.Logf("Preview:\n%s", previewResult.StdOut)
}

func randomString(lenght int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	random := rand.New(rand.NewSource(uint64(time.Now().UnixNano())))
	b := make([]byte, lenght)
	for i := range b {
		b[i] = charset[random.Intn(len(charset))]
	}
	return string(b)
}

func getOidcProviderUrl(t *testing.T, eksCluster map[string]interface{}) string {
	require.NotEmpty(t, eksCluster["identities"])
	identities := eksCluster["identities"].([]interface{})
	require.NotEmpty(t, identities[0])

	require.Contains(t, identities[0].(map[string]interface{}), "oidcs")
	require.NotEmpty(t, identities[0].(map[string]interface{})["oidcs"])
	oidcs := identities[0].(map[string]interface{})["oidcs"].([]interface{})

	require.NotEmpty(t, oidcs[0])
	require.Contains(t, oidcs[0].(map[string]interface{}), "issuer")
	require.NotEmpty(t, oidcs[0].(map[string]interface{})["issuer"])

	return oidcs[0].(map[string]interface{})["issuer"].(string)
}
