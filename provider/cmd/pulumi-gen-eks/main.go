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

package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path"
	"path/filepath"
	"strings"

	// used for embedding docs
	_ "embed"

	"github.com/blang/semver"
	"github.com/pkg/errors"
	"github.com/spf13/cobra"

	dotnetgen "github.com/pulumi/pulumi/pkg/v3/codegen/dotnet"
	gogen "github.com/pulumi/pulumi/pkg/v3/codegen/go"
	nodejsgen "github.com/pulumi/pulumi/pkg/v3/codegen/nodejs"
	pygen "github.com/pulumi/pulumi/pkg/v3/codegen/python"
	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
	"github.com/pulumi/pulumi/sdk/v3/go/common/util/contract"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"

	"github.com/pulumi/pulumi-eks/provider/v4/pkg/version"
)

const Tool = "pulumi-gen-eks"

// Language is the SDK language.
type Language string

const (
	Nodejs Language = "nodejs"
	DotNet Language = "dotnet"
	Go     Language = "go"
	Python Language = "python"
	Schema Language = "schema"
)

type Dependencies struct {
	Aws        string `json:"@pulumi/aws"`
	Kubernetes string `json:"@pulumi/kubernetes"`
}

type PackageJSON struct {
	Dependencies Dependencies
}

func readPackageDependencies(packageDir string) Dependencies {
	content, err := os.ReadFile(path.Join(packageDir, "package.json"))
	if err != nil {
		log.Fatal("Error when opening file: ", err)
	}

	var payload PackageJSON
	err = json.Unmarshal(content, &payload)
	if err != nil {
		log.Fatal("Error during Unmarshal(): ", err)
	}

	return payload.Dependencies
}

func parseLanguage(text string) (Language, error) {
	switch text {
	case "dotnet":
		return DotNet, nil
	case "go":
		return Go, nil
	case "python":
		return Python, nil
	case "nodejs":
		return Nodejs, nil
	case "schema":
		return Schema, nil
	default:
		allLangs := []Language{DotNet, Go, Python, Schema, Nodejs}
		allLangStrings := []string{}
		for _, lang := range allLangs {
			allLangStrings = append(allLangStrings, string(lang))
		}
		all := strings.Join(allLangStrings, ", ")
		return "", fmt.Errorf(`Invalid language: %q, supported values include: %s`, text, all)
	}
}

func rootCmd() *cobra.Command {
	var outDir string
	cmd := &cobra.Command{
		Use:   Tool,
		Short: "Pulumi Package Schema and SDK generator for pulumi-awsx",
		Args: func(_ *cobra.Command, args []string) error {
			if len(args) != 1 {
				return fmt.Errorf("accepts %d arg(s), received %d", 1, len(args))
			}
			if _, err := parseLanguage(args[0]); err != nil {
				return err
			}
			return nil
		},
		RunE: func(_ *cobra.Command, args []string) error {
			cwd, err := os.Getwd()
			if err != nil {
				return err
			}
			lang, err := parseLanguage(args[0])
			if err != nil {
				return err
			}
			return generate(lang, cwd, outDir)
		},
	}
	cmd.PersistentFlags().StringVarP(&outDir, "out", "o", "", "Emit the generated code to this directory")
	return cmd
}

func generate(language Language, cwd, outDir string) error {
	pkgSpec := generateSchema(semver.MustParse(version.Version), cwd)
	if language == Schema {
		mustWritePulumiSchema(pkgSpec, outDir)
		return nil
	}
	// Following Makefile expectations from the bridged providers re-generate the schema on the fly.
	// Once that is refactored could instead load a pre-generated schema from a file.
	schema, err := bindSchema(pkgSpec, version.Version)
	if err != nil {
		return err
	}
	switch language {
	case Nodejs:
		templateDir := filepath.Join(cwd, "provider", "cmd", "pulumi-gen-eks", "nodejs-templates")
		return genNodejs(schema, templateDir, outDir)
	case DotNet:
		return genDotNet(schema, outDir)
	case Go:
		return genGo(schema, outDir)
	case Python:
		return genPython(schema, outDir)
	default:
		return fmt.Errorf("unrecognized language %q", language)
	}
}

func bindSchema(pkgSpec schema.PackageSpec, version string) (*schema.Package, error) {
	pkgSpec.Version = version
	pkg, err := schema.ImportSpec(pkgSpec, nil, schema.ValidationOptions{})
	if err != nil {
		return nil, err
	}
	return pkg, nil
}

func main() {
	if err := rootCmd().Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func awsRef(ref string, awsVersion string) string {
	return fmt.Sprintf("/aws/v%s/schema.json%s", awsVersion, ref)
}

func k8sRef(ref string, k8sVersion string) string {
	return fmt.Sprintf("/kubernetes/v%s/schema.json%s", k8sVersion, ref)
}

//go:embed docs/managedNodeGroup.md
var managedNodeGroupDocs string

//nolint:lll,goconst
func generateSchema(version semver.Version, outdir string) schema.PackageSpec {
	dependencies := readPackageDependencies(path.Join(outdir, "nodejs", "eks"))
	return schema.PackageSpec{
		Name:        "eks",
		Description: "Pulumi Amazon Web Services (AWS) EKS Components.",
		License:     "Apache-2.0",
		Keywords:    []string{"pulumi", "aws", "eks"},
		Homepage:    "https://pulumi.com",
		Repository:  "https://github.com/pulumi/pulumi-eks",

		Functions: map[string]schema.FunctionSpec{
			"eks:index:Cluster/getKubeconfig": {
				Description: "Generate a kubeconfig for cluster authentication that does not use the default AWS " +
					"credential provider chain, and instead is scoped to the supported options in " +
					"`KubeconfigOptions`.\n\n" +
					"The kubeconfig generated is automatically stringified for ease of use with the " +
					"pulumi/kubernetes provider.\n\n" +
					"See for more details:\n" +
					"- https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html\n" +
					"- https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html\n" +
					"- https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html",
				Inputs: &schema.ObjectTypeSpec{
					Properties: map[string]schema.PropertySpec{
						"__self__": {
							TypeSpec: schema.TypeSpec{Ref: "#/resources/eks:index:Cluster"},
						},
						"roleArn": {
							Description: "Role ARN to assume instead of the default AWS credential provider " +
								"chain.\n\n" +
								"The role is passed to kubeconfig as an authentication exec argument.",
							TypeSpec: schema.TypeSpec{Type: "string"},
						},
						"profileName": {
							Description: "AWS credential profile name to always use instead of the default AWS " +
								"credential provider chain.\n\n" +
								"The profile is passed to kubeconfig as an authentication environment setting.",
							TypeSpec: schema.TypeSpec{Type: "string"},
						},
					},
					Required: []string{"__self__"},
				},
				Outputs: &schema.ObjectTypeSpec{
					Properties: map[string]schema.PropertySpec{
						"result": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The kubeconfig for the cluster.",
						},
					},
					Required: []string{"result"},
				},
			},
		},

		Resources: map[string]schema.ResourceSpec{
			"eks:index:Cluster": {
				// TODO: method: createNodeGroup(name: string, args: ClusterNodeGroupOptions): NodeGroup
				IsComponent: true,
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Description: "Cluster is a component that wraps the AWS and Kubernetes resources necessary to run an EKS cluster, its worker nodes, its optional StorageClasses, and an optional deployment of the Kubernetes Dashboard.\n\n" +
						"## Example Usage\n\n### Provisioning a New EKS Cluster\n\n" +
						"<!--Start PulumiCodeChooser -->\n" +
						// TS example
						"```typescript\nimport * as pulumi from \"@pulumi/pulumi\";\nimport * as eks from \"@pulumi/eks\";\n\n" +
						"// Create an EKS cluster with the default configuration.\nconst cluster = new eks.Cluster(\"cluster\", {});\n\n" +
						"// Export the cluster's kubeconfig.\nexport const kubeconfig = cluster.kubeconfig;\n ```\n\n" +
						// Python example
						"```python\n import pulumi\n import pulumi_eks as eks\n \n # Create an EKS cluster with the default configuration.\n cluster = eks.Cluster(\"cluster\")\n\n " +
						"# Export the cluster's kubeconfig.\n pulumi.export(\"kubeconfig\", cluster.kubeconfig)\n ```\n\n" +
						// Go example
						"```go\n package main\n \n import (\n \t\"github.com/pulumi/pulumi-eks/sdk/go/eks\"\n \t\"github.com/pulumi/pulumi/sdk/v3/go/pulumi\"\n )\n\n" +
						"func main() {\n \tpulumi.Run(func(ctx *pulumi.Context) error {\n \t\t// Create an EKS cluster with the default configuration.\n" +
						"\t\tcluster, err := eks.NewCluster(ctx, \"cluster\", nil)\n \t\tif err != nil {\n \t\t\treturn err\n \t\t}\n \t\t// Export the cluster's kubeconfig.\n \t\tctx.Export(\"kubeconfig\", cluster.Kubeconfig)\n" +
						"\t\treturn nil\n \t})\n }\n ```\n\n" +
						// C# example
						"```csharp\n using System.Collections.Generic;\n using Pulumi;\n using Eks = Pulumi.Eks;\n \n return await Deployment.RunAsync(() =>\n {\n \t// Create an EKS cluster with the default configuration.\n" +
						"\tvar cluster = new Eks.Cluster(\"cluster\");\n \n \treturn new Dictionary<string, object?>\n \t{\n \t\t// Export the cluster's kubeconfig.\n \t\t[\"kubeconfig\"] = cluster.Kubeconfig,\n \t};\n });\n\n```\n\n" +
						// Java example
						"```java\nimport com.pulumi.Context;\nimport com.pulumi.Pulumi;\nimport com.pulumi.core.Output;\nimport com.pulumi.eks.Cluster;\nimport java.util.List;\nimport java.util.ArrayList;\nimport java.util.Map;\n" +
						"import java.io.File;\nimport java.nio.file.Files;\nimport java.nio.file.Paths;\n\npublic class App {\n\tpublic static void main(String[] args) {\n\t\tPulumi.run(App::stack);\n\t}\n\n" +
						"\t public static void stack(Context ctx) {\n \t\t// Create an EKS cluster with the default configuration.\n \t\tvar cluster = new Cluster(\"cluster\");\n \n \t\t// Export the cluster's kubeconfig.\n" +
						"\t\tctx.export(\"kubeconfig\", cluster.kubeconfig());\n\t}\n }\n```\n\n" +
						// YAML example
						"```yaml\nresources:\n# Create an EKS cluster with the default configuration.\ncluster:\ntype: eks:Cluster\noutputs:\n# Export the cluster's kubeconfig.\n" +
						"kubeconfig: ${cluster.kubeconfig}\n\n```\n" +
						"<!--End PulumiCodeChooser -->",
					Properties: map[string]schema.PropertySpec{
						"kubeconfig": {
							TypeSpec:    schema.TypeSpec{Ref: "pulumi.json#/Any"},
							Description: "A kubeconfig that can be used to connect to the EKS cluster.",
						},
						"kubeconfigJson": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "A kubeconfig that can be used to connect to the EKS cluster as a JSON string.",
						},
						"awsProvider": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/provider", dependencies.Aws)},
							Description: "The AWS resource provider.",
						},
						"clusterSecurityGroup": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup", dependencies.Aws)},
							Description: "The security group for the EKS cluster.",
						},
						"instanceRoles": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role", dependencies.Aws)},
							},
							Description: "The service roles used by the EKS cluster. Only supported with authentication mode `CONFIG_MAP` or `API_AND_CONFIG_MAP`.",
						},
						"nodeSecurityGroup": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup", dependencies.Aws)},
							Description: "The security group for the cluster's nodes.",
						},
						"eksClusterIngressRule": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroupRule:SecurityGroupRule", dependencies.Aws)},
							Description: "The ingress rule that gives node group access to cluster API server.",
						},
						"defaultNodeGroup": {
							TypeSpec: schema.TypeSpec{Ref: "#/types/eks:index:NodeGroupData"},
							Description: "The default Node Group configuration, or undefined if " +
								"`skipDefaultNodeGroup` was specified.",
						},
						"eksCluster": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:eks%2Fcluster:Cluster", dependencies.Aws)},
							Description: "The EKS cluster.",
						},
						"core": {
							TypeSpec:    schema.TypeSpec{Ref: "#/types/eks:index:CoreData"},
							Description: "The EKS cluster and its dependencies.",
						},
						"clusterSecurityGroupId": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The cluster security group ID of the EKS cluster. Returns the EKS created security group if `skipDefaultSecurityGroups` is set to true.",
						},
						"nodeSecurityGroupId": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The node security group ID of the EKS cluster. Returns the EKS created security group if `skipDefaultSecurityGroups` is set to true.",
						},
						"clusterIngressRuleId": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The ID of the security group rule that gives node group access to the cluster API server. Defaults to an empty string if `skipDefaultSecurityGroups` is set to true.",
						},
						"defaultNodeGroupAsgName": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The name of the default node group's AutoScaling Group. Defaults to an empty string if `skipDefaultNodeGroup` is set to true.",
						},
						"fargateProfileId": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The ID of the Fargate Profile. Defaults to an empty string if no Fargate profile is configured.",
						},
						"fargateProfileStatus": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The status of the Fargate Profile. Defaults to an empty string if no Fargate profile is configured.",
						},
						"oidcProviderArn": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The ARN of the IAM OpenID Connect Provider for the EKS cluster. Defaults to an empty string if no OIDC provider is configured.",
						},
						"oidcProviderUrl": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "Issuer URL for the OpenID Connect identity provider of the EKS cluster.",
						},
						"oidcIssuer": {
							TypeSpec: schema.TypeSpec{Type: "string"},
							Description: "The OIDC Issuer of the EKS cluster (OIDC Provider URL without leading `https://`).\n\n" +
								"This value can be used to associate kubernetes service accounts with IAM roles. For more information, see " +
								"https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html.",
						},
						"autoModeNodeRoleName": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The name of the IAM role created for nodes managed by EKS Auto Mode. Defaults to an empty string.",
						},
					},
					Required: []string{
						"kubeconfig",
						"kubeconfigJson",
						"awsProvider",
						"instanceRoles",
						"eksCluster",
						"core",
						"clusterSecurityGroupId",
						"nodeSecurityGroupId",
						"clusterIngressRuleId",
						"defaultNodeGroupAsgName",
						"fargateProfileId",
						"fargateProfileStatus",
						"oidcProviderArn",
						"oidcProviderUrl",
						"oidcIssuer",
						"autoModeNodeRoleName",
					},
				},
				InputProperties: map[string]schema.PropertySpec{
					"vpcId": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "The VPC in which to create the cluster and its worker nodes. If unset, the " +
							"cluster will be created in the default VPC.",
					},
					"subnetIds": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Type: "string"},
						},
						Description: "The set of all subnets, public and private, to use for the worker node groups " +
							"on the EKS cluster. These subnets are automatically tagged by EKS for Kubernetes " +
							"purposes.\n\nIf `vpcId` is not set, the cluster will use the AWS account's default VPC " +
							"subnets.\n\nIf the list of subnets includes both public and private subnets, the worker " +
							"nodes will only be attached to the private subnets, and the public subnets will be used " +
							"for internet-facing load balancers.\n\nSee for more details: " +
							"https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.\n\nNote: The use of " +
							"`subnetIds`, along with `publicSubnetIds` and/or `privateSubnetIds` is mutually " +
							"exclusive. The use of `publicSubnetIds` and `privateSubnetIds` is encouraged.",
					},
					"publicSubnetIds": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Type: "string"},
						},
						Description: "The set of public subnets to use for the worker node groups on the EKS " +
							"cluster. These subnets are automatically tagged by EKS for Kubernetes purposes.\n\nIf " +
							"`vpcId` is not set, the cluster will use the AWS account's default VPC subnets.\n\n" +
							"Worker network architecture options:\n - Private-only: Only set `privateSubnetIds`.\n" +
							"   - Default workers to run in a private subnet. In this setting, Kubernetes cannot " +
							"create public, internet-facing load balancers for your pods.\n - Public-only: Only set " +
							"`publicSubnetIds`.\n   - Default workers to run in a public subnet.\n - Mixed " +
							"(recommended): Set both `privateSubnetIds` and `publicSubnetIds`.\n   - Default all " +
							"worker nodes to run in private subnets, and use the public subnets for internet-facing " +
							"load balancers.\n\nSee for more details: " +
							"https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.Note: The use of " +
							"`subnetIds`, along with `publicSubnetIds` and/or `privateSubnetIds` is mutually " +
							"exclusive. The use of `publicSubnetIds` and `privateSubnetIds` is encouraged.",
					},
					"privateSubnetIds": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Type: "string"},
						},
						Description: "The set of private subnets to use for the worker node groups on the EKS " +
							"cluster. These subnets are automatically tagged by EKS for Kubernetes purposes.\n\nIf " +
							"`vpcId` is not set, the cluster will use the AWS account's default VPC subnets.\n\n" +
							"Worker network architecture options:\n - Private-only: Only set `privateSubnetIds`.\n" +
							"   - Default workers to run in a private subnet. In this setting, Kubernetes cannot " +
							"create public, internet-facing load balancers for your pods.\n - Public-only: Only set " +
							"`publicSubnetIds`.\n   - Default workers to run in a public subnet.\n - Mixed " +
							"(recommended): Set both `privateSubnetIds` and `publicSubnetIds`.\n   - Default all " +
							"worker nodes to run in private subnets, and use the public subnets for internet-facing " +
							"load balancers.\n\nSee for more details: " +
							"https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.Note: The use of " +
							"`subnetIds`, along with `publicSubnetIds` and/or `privateSubnetIds` is mutually " +
							"exclusive. The use of `publicSubnetIds` and `privateSubnetIds` is encouraged.\n\n" +
							"Also consider setting `nodeAssociatePublicIpAddress: false` for fully private workers.",
					},
					"nodeGroupOptions": {
						TypeSpec: schema.TypeSpec{
							Ref:   "#/types/eks:index:ClusterNodeGroupOptions",
							Plain: true,
						},
						Description: "The common configuration settings for NodeGroups.",
					},
					"nodeAssociatePublicIpAddress": {
						TypeSpec: schema.TypeSpec{
							Type:  "boolean",
							Plain: true,
						},
						Description: "Whether or not to auto-assign the EKS worker nodes public IP addresses. If " +
							"this toggle is set to true, the EKS workers will be auto-assigned public IPs. If false, " +
							"they will not be auto-assigned public IPs.",
					},
					"roleMappings": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Ref: "#/types/eks:index:RoleMapping"},
						},
						Description: "Optional mappings from AWS IAM roles to Kubernetes users and groups. Only supported with authentication mode `CONFIG_MAP` or `API_AND_CONFIG_MAP`",
					},
					"userMappings": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Ref: "#/types/eks:index:UserMapping"},
						},
						Description: "Optional mappings from AWS IAM users to Kubernetes users and groups. Only supported with authentication mode `CONFIG_MAP` or `API_AND_CONFIG_MAP`.",
					},
					"vpcCniOptions": {
						TypeSpec: schema.TypeSpec{
							Ref:   "#/types/eks:index:VpcCniOptions",
							Plain: true,
						},
						Description: "The configuration of the Amazon VPC CNI plugin for this instance. Defaults are " +
							"described in the documentation for the VpcCniOptions type.",
					},
					"useDefaultVpcCni": {
						TypeSpec: schema.TypeSpec{
							Type:  "boolean",
							Plain: true,
						},
						Description: "Use the default VPC CNI instead of creating a custom one. Should not be used in conjunction with `vpcCniOptions`.\n" +
							"Defaults to true, unless `autoMode` is enabled.",
					},
					"instanceType": {
						TypeSpec:    schema.TypeSpec{Type: "string"}, // TODO: aws.ec2.InstanceType is a string enum.
						Description: "The instance type to use for the cluster's nodes. Defaults to \"t3.medium\".",
					},
					"instanceRole": {
						TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role", dependencies.Aws)},
						Description: "This enables the simple case of only registering a *single* IAM instance role " +
							"with the cluster, that is required to be shared by *all* node groups in their instance " +
							"profiles.\n\n" +
							"Note: options `instanceRole` and `instanceRoles` are mutually exclusive.",
					},
					"instanceProfileName": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "The default IAM InstanceProfile to use on the Worker NodeGroups, if one is not " +
							"already set in the NodeGroup.",
					},
					"serviceRole": {
						TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role", dependencies.Aws)},
						Description: "IAM Service Role for EKS to use to manage the cluster.",
					},
					"creationRoleProvider": {
						// Note: It'd be nice if we could pass the ClusterCreationRoleProvider component here.
						TypeSpec: schema.TypeSpec{
							Ref:   "#/types/eks:index:CreationRoleProvider",
							Plain: true,
						},
						Description: "The IAM Role Provider used to create & authenticate against the EKS cluster. " +
							"This role is given `[system:masters]` permission in K8S, See: " +
							"https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html\n\n" +
							"Note: This option is only supported with Pulumi nodejs programs. Please use `ProviderCredentialOpts` as an alternative instead.",
					},
					"instanceRoles": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role", dependencies.Aws)},
						},
						Description: "This enables the advanced case of registering *many* IAM instance roles with " +
							"the cluster for per node group IAM, instead of the simpler, shared case of " +
							"`instanceRole`.\n\n" +
							"Note: options `instanceRole` and `instanceRoles` are mutually exclusive.",
					},
					"nodeAmiId": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "The AMI ID to use for the worker nodes.\n\nDefaults to the latest recommended " +
							"EKS Optimized Linux AMI from the AWS Systems Manager Parameter Store.\n\nNote: " +
							"`nodeAmiId` and `gpu` are mutually exclusive.\n\nSee for more details:\n" +
							"- https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.",
					},
					"gpu": {
						TypeSpec: schema.TypeSpec{Type: "boolean"},
						Description: "Use the latest recommended EKS Optimized Linux AMI with GPU support for the " +
							"worker nodes from the AWS Systems Manager Parameter Store.\n\nDefaults to false.\n\n" +
							"Note: `gpu` and `nodeAmiId` are mutually exclusive.\n\nSee for more details:\n" +
							"- https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html\n" +
							"- https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html",
					},
					"nodePublicKey": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "Public key material for SSH access to worker nodes. See allowed formats at:\n" +
							"https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html\n" +
							"If not provided, no SSH access is enabled on VMs.",
					},
					"nodeSubnetIds": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Type: "string"},
						},
						Description: "The subnets to use for worker nodes. Defaults to the value of subnetIds.",
					},
					"clusterSecurityGroup": {
						TypeSpec: schema.TypeSpec{
							Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup", dependencies.Aws),
						},
						Description: "The security group to use for the cluster API endpoint. If not provided, a new " +
							"security group will be created with full internet egress and ingress from node groups.\n\n" +
							"Note: The security group resource should not contain any inline ingress or egress rules.",
					},
					"clusterSecurityGroupTags": {
						TypeSpec: schema.TypeSpec{
							Type:                 "object",
							AdditionalProperties: &schema.TypeSpec{Type: "string"},
						},
						Description: "The tags to apply to the cluster security group.",
					},
					"nodeRootVolumeEncrypted": {
						TypeSpec:    schema.TypeSpec{Type: "boolean"},
						Description: "Encrypt the root block device of the nodes in the node group.",
					},
					"nodeSecurityGroupTags": {
						TypeSpec: schema.TypeSpec{
							Type:                 "object",
							AdditionalProperties: &schema.TypeSpec{Type: "string"},
						},
						Description: "The tags to apply to the default `nodeSecurityGroup` created by the " +
							"cluster.\n\nNote: The `nodeSecurityGroupTags` option and the node group option " +
							"`nodeSecurityGroup` are mutually exclusive.",
					},
					"nodeRootVolumeSize": {
						TypeSpec:    schema.TypeSpec{Type: "integer"},
						Description: "The size in GiB of a cluster node's root volume. Defaults to 20.",
					},
					"nodeUserData": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "Extra code to run on node startup. This code will run after the AWS EKS " +
							"bootstrapping code and before the node signals its readiness to the managing " +
							"CloudFormation stack. This code must be a typical user data script: critically it must " +
							"begin with an interpreter directive (i.e. a `#!`).",
					},
					"desiredCapacity": {
						TypeSpec:    schema.TypeSpec{Type: "integer"},
						Description: "The number of worker nodes that should be running in the cluster. Defaults to 2.",
					},
					"minSize": {
						TypeSpec:    schema.TypeSpec{Type: "integer"},
						Description: "The minimum number of worker nodes running in the cluster. Defaults to 1.",
					},
					"maxSize": {
						TypeSpec:    schema.TypeSpec{Type: "integer"},
						Description: "The maximum number of worker nodes running in the cluster. Defaults to 2.",
					},
					"storageClasses": {
						TypeSpec: schema.TypeSpec{
							OneOf: []schema.TypeSpec{
								{
									Type:  "string", // TODO: EBSVolumeType enum "io1" | "gp2" | "sc1" | "st1"
									Plain: true,
								},
								{
									Type: "object",
									AdditionalProperties: &schema.TypeSpec{
										Ref:   "#/types/eks:index:StorageClass",
										Plain: true,
									},
									Plain: true,
								},
							},
							Plain: true,
						},
						Description: "An optional set of StorageClasses to enable for the cluster. If this is a " +
							"single volume type rather than a map, a single StorageClass will be created for that " +
							"volume type.\n\n" +
							"Note: As of Kubernetes v1.11+ on EKS, a default `gp2` storage class will always be " +
							"created automatically for the cluster by the EKS service. See " +
							"https://docs.aws.amazon.com/eks/latest/userguide/storage-classes.html",
					},
					"skipDefaultNodeGroup": {
						TypeSpec: schema.TypeSpec{
							Type:  "boolean",
							Plain: true,
						},
						Description: "If this toggle is set to true, the EKS cluster will be created without node " +
							"group attached. Defaults to false, unless `fargate` or `autoMode` is enabled.",
					},
					"skipDefaultSecurityGroups": {
						TypeSpec: schema.TypeSpec{
							Type:  "boolean",
							Plain: true,
						},
						Description: "If this toggle is set to true, the EKS cluster will be created without the default " +
							"node and cluster security groups. Defaults to false, unless `autoMode` is enabled.\n\n" +
							"See for more details: https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html",
					},
					"tags": {
						TypeSpec: schema.TypeSpec{
							Type:                 "object",
							AdditionalProperties: &schema.TypeSpec{Type: "string"},
						},
						Description: "Key-value mapping of tags that are automatically applied to all AWS resources " +
							"directly under management with this cluster, which support tagging.",
					},
					"version": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "Desired Kubernetes master / control plane version. If you do not specify a " +
							"value, the latest available version is used.",
					},
					"enabledClusterLogTypes": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Type: "string"},
						},
						Description: "Enable EKS control plane logging. This sends logs to cloudwatch. Possible list " +
							"of values are: [\"api\", \"audit\", \"authenticator\", \"controllerManager\", " +
							"\"scheduler\"]. By default it is off.",
					},
					"bootstrapSelfManagedAddons": {
						TypeSpec: schema.TypeSpec{Type: "boolean"},
						Description: "Install default unmanaged add-ons, such as `aws-cni`, `kube-proxy`, and CoreDNS during cluster creation. " +
							"If `false`, you must manually install desired add-ons. Changing this value will force a new cluster to be created. Defaults to `true`",
					},
					"endpointPublicAccess": {
						TypeSpec: schema.TypeSpec{Type: "boolean"},
						Description: "Indicates whether or not the Amazon EKS public API server endpoint is enabled. " +
							"Default is `true`.",
					},
					"endpointPrivateAccess": {
						TypeSpec: schema.TypeSpec{Type: "boolean"},
						Description: "Indicates whether or not the Amazon EKS private API server endpoint is enabled. " +
							"Default is `false`.",
					},
					"publicAccessCidrs": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Type: "string"},
						},
						Description: "Indicates which CIDR blocks can access the Amazon EKS public API server endpoint.",
					},
					"fargate": {
						TypeSpec: schema.TypeSpec{
							OneOf: []schema.TypeSpec{
								{Type: "boolean"},
								{Ref: "#/types/eks:index:FargateProfile"},
							},
						},
						Description: "Add support for launching pods in Fargate. Defaults to launching pods in the " +
							"`default` namespace.  If specified, the default node group is skipped as though " +
							"`skipDefaultNodeGroup: true` had been passed.",
					},
					"clusterTags": {
						TypeSpec: schema.TypeSpec{
							Type:                 "object",
							AdditionalProperties: &schema.TypeSpec{Type: "string"},
						},
						Description: "The tags to apply to the EKS cluster.",
					},
					"createOidcProvider": {
						TypeSpec: schema.TypeSpec{Type: "boolean"},
						Description: "Indicates whether an IAM OIDC Provider is created for the EKS cluster.\n\n" +
							"The OIDC provider is used in the cluster in combination with k8s Service Account " +
							"annotations to provide IAM roles at the k8s Pod level.\n\nSee for more details:\n" +
							" - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html\n" +
							" - https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html\n" +
							" - https://aws.amazon.com/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/\n" +
							" - https://www.pulumi.com/registry/packages/aws/api-docs/eks/cluster/#enabling-iam-roles-for-service-accounts",
					},
					"name": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "The cluster's physical resource name.\n\nIf not specified, the default is to " +
							"use auto-naming for the cluster's name, resulting in a physical name with the format " +
							"`${name}-eksCluster-0123abcd`.\n\nSee for more details: " +
							"https://www.pulumi.com/docs/intro/concepts/programming-model/#autonaming",
					},
					"proxy": {
						TypeSpec: schema.TypeSpec{
							Type:  "string",
							Plain: true,
						},
						Description: "The HTTP(S) proxy to use within a proxied environment.\n\n The proxy is used " +
							"during cluster creation, and OIDC configuration.\n\nThis is an alternative option to " +
							"setting the proxy environment variables: HTTP(S)_PROXY and/or http(s)_proxy.\n\nThis " +
							"option is required iff the proxy environment variables are not set.\n\n" +
							"Format:      <protocol>://<host>:<port>\n" +
							"Auth Format: <protocol>://<username>:<password>@<host>:<port>\n\nEx:\n" +
							"  - \"http://proxy.example.com:3128\"\n" +
							"  - \"https://proxy.example.com\"\n" +
							"  - \"http://username:password@proxy.example.com:3128\"",
					},
					"providerCredentialOpts": {
						TypeSpec: schema.TypeSpec{Ref: "#/types/eks:index:KubeconfigOptions"},
						Description: "The AWS provider credential options to scope the cluster's kubeconfig " +
							"authentication when using a non-default credential chain.\n\n" +
							"This is required for certain auth scenarios. For example:\n" +
							"- Creating and using a new AWS provider instance, or\n" +
							"- Setting the AWS_PROFILE environment variable, or\n" +
							"- Using a named profile configured on the AWS provider via:\n" +
							"`pulumi config set aws:profile <profileName>`\n\n" +
							"See for more details:\n" +
							"- https://www.pulumi.com/registry/packages/aws/api-docs/provider/\n" +
							"- https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/\n" +
							"- https://www.pulumi.com/docs/intro/cloud-providers/aws/#configuration\n" +
							"- https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html",
					},
					"enableConfigMapMutable": {
						TypeSpec: schema.TypeSpec{Type: "boolean"},
						Description: "Sets the 'enableConfigMapMutable' option on the cluster kubernetes provider.\n\n" +
							"Applies updates to the aws-auth ConfigMap in place over a replace operation if set to true.\n" +
							"https://www.pulumi.com/registry/packages/kubernetes/api-docs/provider/#enableconfigmapmutable_nodejs",
					},
					"encryptionConfigKeyArn": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "KMS Key ARN to use with the encryption configuration for the cluster.\n\n" +
							"Only available on Kubernetes 1.13+ clusters created after March 6, 2020.\n" +
							"See for more details:\n" +
							"- https://aws.amazon.com/about-aws/whats-new/2020/03/amazon-eks-adds-envelope-encryption-for-secrets-with-aws-kms/",
					},
					"ipFamily": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "The IP family used to assign Kubernetes pod and service addresses. Valid values are `ipv4` (default) and `ipv6`.\n" +
							"You can only specify an IP family when you create a cluster, changing this value will force a new cluster to be created.",
						ReplaceOnChanges: true,
					},
					"kubernetesServiceIpAddressRange": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "The CIDR block to assign Kubernetes service IP addresses from. If you don't\n" +
							"specify a block, Kubernetes assigns addresses from either the 10.100.0.0/16 or\n" +
							"172.20.0.0/16 CIDR blocks. This setting only applies to IPv4 clusters. We recommend that you specify a block\n" +
							"that does not overlap with resources in other networks that are peered or connected to your VPC. You can only specify\n" +
							"a custom CIDR block when you create a cluster, changing this value will force a new cluster to be created.\n\n" +
							"The block must meet the following requirements:\n" +
							"- Within one of the following private IP address blocks: 10.0.0.0/8, 172.16.0.0.0/12, or 192.168.0.0/16.\n" +
							"- Doesn't overlap with any CIDR block assigned to the VPC that you selected for VPC.\n" +
							"- Between /24 and /12." +
							"",
					},
					"accessEntries": {
						TypeSpec: schema.TypeSpec{
							Type: "object",
							AdditionalProperties: &schema.TypeSpec{
								Ref:   "#/types/eks:index:AccessEntry",
								Plain: true,
							},
							Plain: true,
						},
						Description: "Access entries to add to the EKS cluster. They can be used to allow IAM principals to access the cluster. " +
							"Access entries are only supported with authentication mode `API` or `API_AND_CONFIG_MAP`.\n\n" +
							"See for more details:\nhttps://docs.aws.amazon.com/eks/latest/userguide/access-entries.html",
					},
					"authenticationMode": {
						TypeSpec: schema.TypeSpec{
							Ref:   "#/types/eks:index:AuthenticationMode",
							Plain: true,
						},
						Description: "The authentication mode of the cluster. Valid values are `CONFIG_MAP`, `API` or `API_AND_CONFIG_MAP`.\n\n" +
							"See for more details:\nhttps://docs.aws.amazon.com/eks/latest/userguide/grant-k8s-access.html#set-cam",
					},
					"corednsAddonOptions": {
						TypeSpec: schema.TypeSpec{
							Plain: true,
							Ref:   "#/types/eks:index:CoreDnsAddonOptions",
						},
						Description: "Options for managing the `coredns` addon.",
					},
					"kubeProxyAddonOptions": {
						TypeSpec: schema.TypeSpec{
							Plain: true,
							Ref:   "#/types/eks:index:KubeProxyAddonOptions",
						},
						Description: "Options for managing the `kube-proxy` addon.",
					},
					"createInstanceRole": {
						TypeSpec: schema.TypeSpec{
							Type:  "boolean",
							Plain: true,
						},
						Description: "Whether to create the instance role for the EKS cluster. " +
							"Defaults to true when using the default node group, false otherwise.\n" +
							"If set to false when using the default node group, an instance role or instance profile must be provided.n\n" +
							"Note: this option has no effect if a custom instance role is provided with `instanceRole` or `instanceRoles`.",
					},
					"autoMode": {
						TypeSpec: schema.TypeSpec{
							Plain: true,
							Ref:   "#/types/eks:index:AutoModeOptions",
						},
						Description: "Configuration Options for EKS Auto Mode. If EKS Auto Mode is enabled, AWS will manage cluster " +
							"infrastructure on your behalf.\n\n" +
							"For more information, see: https://docs.aws.amazon.com/eks/latest/userguide/automode.html",
					},
					"upgradePolicy": {
						TypeSpec:    schema.TypeSpec{Ref: awsRef("#/types/aws:eks%2FClusterUpgradePolicy:ClusterUpgradePolicy", dependencies.Aws)},
						Description: `The cluster's upgrade policy. Valid support types are "STANDARD" and "EXTENDED". Defaults to "EXTENDED".`,
					},
				},
				Methods: map[string]string{
					"getKubeconfig": "eks:index:Cluster/getKubeconfig",
				},
			},
			"eks:index:ClusterCreationRoleProvider": {
				IsComponent: true,
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Description: "ClusterCreationRoleProvider is a component that wraps creating a role provider that " +
						"can be passed to the `Cluster`'s `creationRoleProvider`. This can be used to provide a " +
						"specific role to use for the creation of the EKS cluster different from the role being used " +
						"to run the Pulumi deployment.",
					Properties: map[string]schema.PropertySpec{
						"role": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role", dependencies.Aws)},
						},
						// Temporarily excluding the provider output since `Output<ProviderResource>`` is currently
						// unusable from multi-lang because `ResourceOptions` requires a plain `ProviderResource`.
						// "provider": {
						// 	TypeSpec: schema.TypeSpec{Ref: awsRef("#/provider")},
						// },
					},
					Required: []string{
						"role",
						// "provider",
					},
				},
				InputProperties: map[string]schema.PropertySpec{
					"region": {
						TypeSpec: schema.TypeSpec{Type: "string"}, // TODO: enum: consider typing as `aws.Region`
					},
					"profile": {
						TypeSpec: schema.TypeSpec{Type: "string"},
					},
				},
			},
			"eks:index:ManagedNodeGroup": {
				IsComponent: true,
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Description: managedNodeGroupDocs,
					Properties: map[string]schema.PropertySpec{
						"nodeGroup": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:eks%2FnodeGroup:NodeGroup", dependencies.Aws)},
							Description: "The AWS managed node group.",
						},
						"placementGroupName": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The name of the placement group created for the managed node group.",
						},
					},
					Required: []string{
						"nodeGroup",
						"placementGroupName",
					},
				},
				InputProperties: map[string]schema.PropertySpec{
					"cluster": {
						TypeSpec: schema.TypeSpec{
							OneOf: []schema.TypeSpec{
								{Ref: "#/resources/eks:index:Cluster"},
								{Ref: "#/types/eks:index:CoreData"},
							},
						},
						Description: "The target EKS cluster.",
					},
					// The following inputs are based on `aws.eks.NodeGroupArgs`, with the following properties made
					// optional since they can be set based on the passed-in `cluster` (clusterName, subnetIds,
					// and scalingConfig). `nodeRoleArn` is also now optional with convenience `nodeRole` input added.
					"amiType": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "Type of Amazon Machine Image (AMI) associated with the EKS Node Group. " +
							"Defaults to `AL2_x86_64`.\nNote: `amiType` and `amiId` are mutually exclusive.\n\nSee the AWS documentation " +
							"(https://docs.aws.amazon.com/eks/latest/APIReference/API_Nodegroup.html#AmazonEKS-Type-Nodegroup-amiType) " +
							"for valid AMI Types. This provider will only perform drift detection if a configuration value is provided.",
					},
					"capacityType": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "Type of capacity associated with the EKS Node Group. " +
							"Valid values: `ON_DEMAND`, `SPOT`. " +
							"This provider will only perform drift detection if a configuration value is provided.",
					},
					"clusterName": {
						TypeSpec:    schema.TypeSpec{Type: "string"},
						Description: "Name of the EKS Cluster.",
					},
					"diskSize": {
						TypeSpec: schema.TypeSpec{Type: "integer"},
						Description: "Disk size in GiB for worker nodes. Defaults to `20`. This provider will only " +
							"perform drift detection if a configuration value is provided.",
					},
					"forceUpdateVersion": {
						TypeSpec: schema.TypeSpec{Type: "boolean"},
						Description: "Force version update if existing pods are unable to be drained due to a pod " +
							"disruption budget issue.",
					},
					"instanceTypes": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Type: "string"},
						},
						Description: "Set of instance types associated with the EKS Node Group. Defaults to " +
							"`[\"t3.medium\"]`. This provider will only perform drift detection if a configuration " +
							"value is provided. Currently, the EKS API only accepts a single value in the set.",
					},
					"labels": {
						TypeSpec: schema.TypeSpec{
							Type:                 "object",
							AdditionalProperties: &schema.TypeSpec{Type: "string"},
						},
						Description: "Key-value map of Kubernetes labels. Only labels that are applied with the EKS " +
							"API are managed by this argument. Other Kubernetes labels applied to the EKS Node Group " +
							"will not be managed.",
					},
					"launchTemplate": {
						TypeSpec: schema.TypeSpec{Ref: awsRef("#/types/aws:eks%2FNodeGroupLaunchTemplate:NodeGroupLaunchTemplate", dependencies.Aws)},
						Description: "Launch Template settings.\n\n" +
							"Note: This field is mutually exclusive with `kubeletExtraArgs` and `bootstrapExtraArgs`.",
					},
					"nodeGroupName": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "Name of the EKS Node Group. " +
							"If omitted, this provider will assign a random, unique name. " +
							"Conflicts with `nodeGroupNamePrefix`.",
					},
					"nodeGroupNamePrefix": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "Creates a unique name beginning with the specified prefix. " +
							"Conflicts with `nodeGroupName`.",
					},
					"nodeRoleArn": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "Amazon Resource Name (ARN) of the IAM Role that provides permissions for the " +
							"EKS Node Group.\n\n" +
							"Note, `nodeRoleArn` and `nodeRole` are mutually exclusive, and a single option must be " +
							"used.",
					},
					"nodeRole": {
						TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role", dependencies.Aws)},
						Description: "The IAM Role that provides permissions for the EKS Node Group.\n\n" +
							"Note, `nodeRole` and `nodeRoleArn` are mutually exclusive, and a single option must be " +
							"used.",
					},
					"releaseVersion": {
						TypeSpec:    schema.TypeSpec{Type: "string"},
						Description: "AMI version of the EKS Node Group. Defaults to latest version for Kubernetes version.",
					},
					"remoteAccess": {
						TypeSpec:    schema.TypeSpec{Ref: awsRef("#/types/aws:eks%2FNodeGroupRemoteAccess:NodeGroupRemoteAccess", dependencies.Aws)},
						Description: "Remote access settings.",
					},
					"scalingConfig": {
						TypeSpec: schema.TypeSpec{Ref: awsRef("#/types/aws:eks%2FNodeGroupScalingConfig:NodeGroupScalingConfig", dependencies.Aws)},
						Description: "Scaling settings.\n\n" +
							"Default scaling amounts of the node group autoscaling group are:\n" +
							"  - desiredSize: 2\n" +
							"  - minSize: 1\n" +
							"  - maxSize: 2",
					},
					"subnetIds": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Type: "string"},
						},
						Description: "Identifiers of EC2 Subnets to associate with the EKS Node Group. These subnets " +
							"must have the following resource tag: `kubernetes.io/cluster/CLUSTER_NAME` (where " +
							"`CLUSTER_NAME` is replaced with the name of the EKS Cluster).\n\n" +
							"Default subnetIds is chosen from the following list, in order, if subnetIds arg is not " +
							"set:\n" +
							"  - core.subnetIds\n" +
							"  - core.privateIds\n" +
							"  - core.publicSubnetIds\n\n" +
							"This default logic is based on the existing subnet IDs logic of this package: " +
							"https://git.io/JeM11",
					},
					"tags": {
						TypeSpec: schema.TypeSpec{
							Type:                 "object",
							AdditionalProperties: &schema.TypeSpec{Type: "string"},
						},
						Description: "Key-value mapping of resource tags.",
					},
					"taints": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Ref: awsRef("#/types/aws:eks%2FNodeGroupTaint:NodeGroupTaint", dependencies.Aws)},
						},
						Description: "The Kubernetes taints to be applied to the nodes in the node group. Maximum of 50 taints per node group.",
					},
					"version": {
						TypeSpec: schema.TypeSpec{Type: "string"},
					},
					"kubeletExtraArgs": {
						TypeSpec: schema.TypeSpec{
							Type:  "string",
							Plain: true,
						},
						Description: "Extra args to pass to the Kubelet. Corresponds to the options passed in the " +
							"`--kubeletExtraArgs` flag to `/etc/eks/bootstrap.sh`. For example, " +
							"'--port=10251 --address=0.0.0.0'. To escape characters in the extra args" +
							"value, wrap the value in quotes. For example, `kubeletExtraArgs = '--allowed-unsafe-sysctls \"net.core.somaxconn\"'`.\n" +
							"Note that this field conflicts with `launchTemplate`.",
					},
					"bootstrapExtraArgs": {
						TypeSpec: schema.TypeSpec{
							Type:  "string",
							Plain: true,
						},
						Description: "Additional args to pass directly to `/etc/eks/bootstrap.sh`. For details on " +
							"available options, see: " +
							"https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh. " +
							"Note that the `--apiserver-endpoint`, `--b64-cluster-ca` and `--kubelet-extra-args` " +
							"flags are included automatically based on other configuration parameters.\n\n" +
							"Note that this field conflicts with `launchTemplate`.",
					},
					"enableIMDSv2": {
						TypeSpec: schema.TypeSpec{Type: "boolean", Plain: true},
						Description: "Enables the ability to use EC2 Instance Metadata Service v2, which provides a more secure way to access instance " +
							"metadata. For more information, see: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html.\n" +
							"Defaults to `false`.\n\n" +
							"Note that this field conflicts with `launchTemplate`. If you are providing a custom `launchTemplate`, you should " +
							"enable this feature within the `launchTemplateMetadataOptions` of the supplied `launchTemplate`.",
					},
					"operatingSystem": {
						TypeSpec: schema.TypeSpec{
							Ref: "#/types/eks:index:OperatingSystem",
						},
						Description: "The type of OS to use for the node group. Will be used to determine the right EKS optimized AMI to use based on the instance types and gpu configuration.\n" +
							"Valid values are `RECOMMENDED`, `AL2`, `AL2023` and `Bottlerocket`.\n\n" +
							"Defaults to the current recommended OS.",
					},
					"bottlerocketSettings": {
						TypeSpec: schema.TypeSpec{
							Type: "object",
							AdditionalProperties: &schema.TypeSpec{
								Ref: "pulumi.json#/Any",
							},
						},
						Description: "The configuration settings for Bottlerocket OS.\n" +
							"The settings will get merged with the base settings the provider uses to configure Bottlerocket.\n\nThis includes:\n" +
							"  - settings.kubernetes.api-server\n" +
							"  - settings.kubernetes.cluster-certificate\n" +
							"  - settings.kubernetes.cluster-name\n" +
							"  - settings.kubernetes.cluster-dns-ip\n\n" +
							"For an overview of the available settings, see https://bottlerocket.dev/en/os/1.20.x/api/settings/.",
					},
					"userData": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "User specified code to run on node startup. This is expected to handle " +
							"the full AWS EKS node bootstrapping. If omitted, the provider will configure the user data.\n\n" +
							"See for more details: https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html#launch-template-user-data.",
					},
					"gpu": {
						TypeSpec: schema.TypeSpec{Type: "boolean"},
						Description: "Use the latest recommended EKS Optimized AMI with GPU support for the " +
							"worker nodes.\nDefaults to false.\n\n" +
							"Note: `gpu` and `amiId` are mutually exclusive.\n\n" +
							"See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-amis.html.",
					},
					"amiId": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "The AMI ID to use for the worker nodes.\nDefaults to the latest recommended " +
							"EKS Optimized AMI from the AWS Systems Manager Parameter Store.\n\n" +
							"Note: `amiId` is mutually exclusive with `gpu` and `amiType`.\n\n" +
							"See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.",
					},
					"nodeadmExtraOptions": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Ref: "#/types/eks:index:NodeadmOptions"},
						},
						Description: "Extra nodeadm configuration sections to be added to the nodeadm user data. " +
							"This can be shell scripts, nodeadm NodeConfig or any other user data compatible script. " +
							"When configuring additional nodeadm NodeConfig sections, they'll be merged with the base " +
							"settings the provider sets. You can overwrite base settings or provide additional settings this way.\n" +
							"The base settings the provider sets are:\n" +
							"  - cluster.name\n" +
							"  - cluster.apiServerEndpoint\n" +
							"  - cluster.certificateAuthority\n" +
							"  - cluster.cidr\n\n" +
							"Note: This is only applicable when using AL2023.\n" +
							"See for more details:\n" +
							"  - https://awslabs.github.io/amazon-eks-ami/nodeadm/\n" +
							"  - https://awslabs.github.io/amazon-eks-ami/nodeadm/doc/api/",
					},
					"ignoreScalingChanges": {
						TypeSpec: schema.TypeSpec{
							Type:  "boolean",
							Plain: true,
						},
						Description: "Whether to ignore changes to the desired size of the Auto Scaling Group. This is useful when using Cluster Autoscaler.\n\n" +
							"See [EKS best practices](https://aws.github.io/aws-eks-best-practices/cluster-autoscaling/) for more details.",
					},
					"placementGroupAvailabilityZone": {
						TypeSpec: schema.TypeSpec{
							Type: "string",
						},
						Description: "The availability zone of the placement group for EFA support. Required if `enableEfaSupport` is true.",
					},
					"enableEfaSupport": {
						TypeSpec: schema.TypeSpec{Type: "boolean", Plain: true},
						Description: "Determines whether to enable Elastic Fabric Adapter (EFA) support for the node group. If multiple different instance types are configured for the node group, " +
							"the first one will be used to determine the network interfaces to use. Requires `placementGroupAvailabilityZone` to be set.",
					},
				},
				RequiredInputs: []string{"cluster"},
			},
			"eks:index:NodeGroup": {
				IsComponent: true,
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Description: "NodeGroup is a component that wraps the AWS EC2 instances that provide compute " +
						"capacity for an EKS cluster.",
					Properties: map[string]schema.PropertySpec{
						"nodeSecurityGroup": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup", dependencies.Aws)},
							Description: "The security group for the node group to communicate with the cluster, or undefined if using `nodeSecurityGroupId`.",
						},
						"nodeSecurityGroupId": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The ID of the security group for the node group to communicate with the cluster.",
						},
						"extraNodeSecurityGroups": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup", dependencies.Aws)},
							},
							Description: "The additional security groups for the node group that captures user-specific rules.",
						},
						"cfnStack": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:cloudformation%2Fstack:Stack", dependencies.Aws)},
							Description: "The CloudFormation Stack which defines the Node AutoScalingGroup.",
						},
						"autoScalingGroupName": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The AutoScalingGroup name for the Node group.",
						},
					},
					Required: []string{
						"nodeSecurityGroupId",
						"extraNodeSecurityGroups",
						"cfnStack",
						"autoScalingGroupName",
					},
				},
				DeprecationMessage: "NodeGroup uses AWS EC2 LaunchConfiguration which has been deprecated by AWS and doesn't support the newest instance types. Please use NodeGroupV2 instead.",
				InputProperties:    nodeGroupProperties(true /*cluster*/, false /*NodeGroupV2*/, dependencies.Aws),
				RequiredInputs:     []string{"cluster"},
			},
			"eks:index:NodeGroupV2": {
				IsComponent: true,
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Description: "NodeGroup is a component that wraps the AWS EC2 instances that provide compute " +
						"capacity for an EKS cluster.",
					Properties: map[string]schema.PropertySpec{
						"nodeSecurityGroup": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup", dependencies.Aws)},
							Description: "The security group for the node group to communicate with the cluster, or undefined if using `nodeSecurityGroupId`.",
						},
						"nodeSecurityGroupId": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The ID of the security group for the node group to communicate with the cluster.",
						},
						"extraNodeSecurityGroups": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup", dependencies.Aws)},
							},
							Description: "The additional security groups for the node group that captures user-specific rules.",
						},
						"autoScalingGroup": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:autoscaling%2Fgroup:Group", dependencies.Aws)},
							Description: "The AutoScalingGroup for the Node group.",
						},
					},
					Required: []string{
						"nodeSecurityGroupId",
						"extraNodeSecurityGroups",
						"autoScalingGroup",
					},
				},
				InputProperties: nodeGroupProperties(true /*cluster*/, true /*NodeGroupV2*/, dependencies.Aws),
				RequiredInputs:  []string{"cluster"},
			},
			"eks:index:NodeGroupSecurityGroup": {
				IsComponent: true,
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Description: "NodeGroupSecurityGroup is a component that wraps creating a security group for " +
						"node groups with the default ingress & egress rules required to connect and work with the " +
						"EKS cluster security group.",
					Properties: map[string]schema.PropertySpec{
						"securityGroup": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup", dependencies.Aws)},
							Description: "The security group for node groups with the default ingress & egress rules " +
								"required to connect and work with the EKS cluster security group.",
						},
						"securityGroupRule": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroupRule:SecurityGroupRule", dependencies.Aws)},
							Description: "The EKS cluster ingress rule.",
						},
					},
					Required: []string{
						"securityGroup",
						"securityGroupRule",
					},
				},
				InputProperties: map[string]schema.PropertySpec{
					"vpcId": {
						TypeSpec:    schema.TypeSpec{Type: "string"},
						Description: "The VPC in which to create the worker node group.",
					},
					"clusterSecurityGroup": {
						TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup", dependencies.Aws)},
						Description: "The security group associated with the EKS cluster.",
					},
					"tags": {
						TypeSpec: schema.TypeSpec{
							Type:                 "object",
							AdditionalProperties: &schema.TypeSpec{Type: "string"},
						},
						Description: "Key-value mapping of tags to apply to this security group.",
					},
					"eksCluster": {
						TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:eks%2Fcluster:Cluster", dependencies.Aws)},
						Description: "The EKS cluster associated with the worker node group",
					},
				},
				RequiredInputs: []string{
					"vpcId",
					"clusterSecurityGroup",
					"eksCluster",
				},
			},
			"eks:index:VpcCniAddon": {
				IsComponent: true,
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Description: "VpcCniAddon manages the configuration of the Amazon VPC CNI plugin for Kubernetes by leveraging the EKS managed add-on.\n" +
						"For more information see: https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html",
				},
				Aliases: []schema.AliasSpec{
					{Type: *pulumi.StringRef("eks:index:VpcCni")},
				},
				InputProperties: vpcCniProperties(false /*cluster*/),
				RequiredInputs:  []string{"clusterName"},
			},
			"eks:index:Addon": {
				IsComponent: true,
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Description: "Addon manages an EKS add-on.\n" +
						"For more information about supported add-ons, see: https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html",
				},
				InputProperties: map[string]schema.PropertySpec{
					"addonName": {
						TypeSpec:    schema.TypeSpec{Type: "string"},
						Description: "Name of the EKS add-on. The name must match one of the names returned by describe-addon-versions.",
					},
					"addonVersion": {
						TypeSpec:    schema.TypeSpec{Type: "string"},
						Description: "The version of the EKS add-on. The version must match one of the versions returned by describe-addon-versions.",
					},
					"cluster": {
						TypeSpec: schema.TypeSpec{
							Ref: "#/resources/eks:index:Cluster",
						},
						Description: "The target EKS cluster.",
					},
					"configurationValues": {
						TypeSpec: schema.TypeSpec{
							Type:                 "object",
							AdditionalProperties: &schema.TypeSpec{Ref: "pulumi.json#/Any"},
						},
						Description: "Custom configuration values for addons specified as an object. This object value must match the JSON schema derived from describe-addon-configuration.",
					},
					"preserve": {
						TypeSpec:    schema.TypeSpec{Type: "boolean"},
						Description: "Indicates if you want to preserve the created resources when deleting the EKS add-on.",
					},
					"resolveConflictsOnCreate": {
						TypeSpec:    schema.TypeSpec{Type: "string"},
						Description: "How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on. Valid values are NONE and OVERWRITE. For more details see the CreateAddon API Docs.",
					},
					"resolveConflictsOnUpdate": {
						TypeSpec:    schema.TypeSpec{Type: "string"},
						Description: "How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from the Amazon EKS default value. Valid values are NONE, OVERWRITE, and PRESERVE. For more details see the UpdateAddon API Docs.",
					},
					"serviceAccountRoleArn": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: `The Amazon Resource Name (ARN) of an existing IAM role to bind to the add-on's service account. The role must be assigned the IAM permissions required by the add-on. If you don't specify an existing IAM role, then the add-on uses the permissions assigned to the node IAM role. For more information, see Amazon EKS node IAM role in the Amazon EKS User Guide.

						Note: To specify an existing IAM role, you must have an IAM OpenID Connect (OIDC) provider created for your cluster. For more information, see Enabling IAM roles for service accounts on your cluster in the Amazon EKS User Guide.`,
					},
					"tags": {
						TypeSpec:    schema.TypeSpec{Type: "array", Items: &schema.TypeSpec{Type: "object", AdditionalProperties: &schema.TypeSpec{Type: "string"}}},
						Description: "Key-value map of resource tags. If configured with a provider default_tags configuration block present, tags with matching keys will overwrite those defined at the provider-level.",
					},
				},
				RequiredInputs: []string{"addonName", "cluster"},
			},
		},

		Types: map[string]schema.ComplexTypeSpec{
			"eks:index:CoreData": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: "Defines the core set of data associated with an EKS cluster, including the network in which it runs.",
					Properties: map[string]schema.PropertySpec{
						"cluster": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:eks%2Fcluster:Cluster", dependencies.Aws)},
						},
						"vpcId": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "ID of the cluster's VPC.",
						},
						"subnetIds": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Type: "string"},
							},
							Description: "List of subnet IDs for the EKS cluster.",
						},
						"endpoint": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The EKS cluster's Kubernetes API server endpoint.",
						},
						"clusterSecurityGroup": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup", dependencies.Aws)},
						},
						"provider": {
							TypeSpec: schema.TypeSpec{Ref: k8sRef("#/provider", dependencies.Kubernetes)},
						},
						"instanceRoles": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role", dependencies.Aws)},
							},
							Description: "The IAM instance roles for the cluster's nodes.",
						},
						"nodeGroupOptions": {
							TypeSpec:    schema.TypeSpec{Ref: "#/types/eks:index:ClusterNodeGroupOptions"},
							Description: "The cluster's node group options.",
						},
						"awsProvider": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/provider", dependencies.Aws)},
						},
						"publicSubnetIds": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Type: "string"},
							},
							Description: "List of subnet IDs for the public subnets.",
						},
						"privateSubnetIds": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Type: "string"},
							},
							Description: "List of subnet IDs for the private subnets.",
						},
						"eksNodeAccess": {
							TypeSpec: schema.TypeSpec{Ref: k8sRef("#/resources/kubernetes:core%2Fv1:ConfigMap", dependencies.Kubernetes)},
						},
						"storageClasses": {
							TypeSpec: schema.TypeSpec{
								Type:                 "object",
								AdditionalProperties: &schema.TypeSpec{Ref: k8sRef("#/resources/kubernetes:storage.k8s.io%2Fv1:StorageClass", dependencies.Kubernetes)},
							},
							Description: "The storage class used for persistent storage by the cluster.",
						},
						"kubeconfig": {
							TypeSpec:    schema.TypeSpec{Ref: "pulumi.json#/Any"},
							Description: "The kubeconfig file for the cluster.",
						},
						"vpcCni": {
							TypeSpec:    schema.TypeSpec{Ref: "#/resources/eks:index:VpcCniAddon"},
							Description: "The VPC CNI for the cluster.",
						},
						"tags": {
							TypeSpec: schema.TypeSpec{
								Type:                 "object",
								AdditionalProperties: &schema.TypeSpec{Type: "string"},
							},
							Description: "A map of tags assigned to the EKS cluster.",
						},
						"nodeSecurityGroupTags": {
							TypeSpec: schema.TypeSpec{
								Type:                 "object",
								AdditionalProperties: &schema.TypeSpec{Type: "string"},
							},
							Description: "Tags attached to the security groups associated with the cluster's worker nodes.",
						},
						"fargateProfile": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:eks%2FfargateProfile:FargateProfile", dependencies.Aws)},
							Description: "The Fargate profile used to manage which pods run on Fargate.",
						},
						"oidcProvider": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2FopenIdConnectProvider:OpenIdConnectProvider", dependencies.Aws)},
						},
						"encryptionConfig": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/types/aws:eks%2FClusterEncryptionConfig:ClusterEncryptionConfig", dependencies.Aws)},
						},
						"clusterIamRole": {
							Description: "The IAM Role attached to the EKS Cluster",
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role", dependencies.Aws)},
						},
						"accessEntries": {
							TypeSpec: schema.TypeSpec{
								Type: "array",
								Items: &schema.TypeSpec{
									Ref: "#/types/eks:index:AccessEntry",
								},
							},
							Description: "The access entries added to the cluster.",
						},
					},
					Required: []string{
						"cluster",
						"vpcId",
						"subnetIds",
						"endpoint",
						"provider",
						"instanceRoles",
						"nodeGroupOptions",
						"clusterIamRole",
					},
				},
			},
			"eks:index:CreationRoleProvider": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "object",
					Description: "Contains the AWS Role and Provider necessary to override the `[system:master]` " +
						"entity ARN. This is an optional argument used when creating `Cluster`. Read more: " +
						"https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html\n\n" +
						"Note: This option is only supported with Pulumi nodejs programs. Please use `ProviderCredentialOpts` as an alternative instead.",
					Properties: map[string]schema.PropertySpec{
						"role": {
							TypeSpec: schema.TypeSpec{
								Ref:   awsRef("#/resources/aws:iam%2Frole:Role", dependencies.Aws),
								Plain: true,
							},
						},
						"provider": {
							TypeSpec: schema.TypeSpec{
								Ref:   awsRef("#/provider", dependencies.Aws),
								Plain: true,
							},
						},
					},
					Required: []string{
						"role",
						"provider",
					},
				},
			},
			"eks:index:AutoModeOptions": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "object",
					Description: "Configuration Options for EKS Auto Mode. If EKS Auto Mode is enabled, AWS will manage cluster " +
						"infrastructure on your behalf.\n\n" +
						"For more information, see: https://docs.aws.amazon.com/eks/latest/userguide/automode.html",
					Properties: map[string]schema.PropertySpec{
						"enabled": {
							TypeSpec: schema.TypeSpec{
								Type:  "boolean",
								Plain: true,
							},
							Description: "Whether to enable EKS Auto Mode. If enabled, EKS will manage node pools, EBS volumes and Load Balancers for you.\n" +
								"When enabled, the vpc-cni and kube-proxy will not be enabled by default because EKS Auto Mode includes pod networking capabilities.",
						},
						"createNodeRole": {
							TypeSpec: schema.TypeSpec{
								Type:  "boolean",
								Plain: true,
							},
							Description: "Whether to create an IAM role for the EKS Auto Mode node group if none is provided in `computeConfig`.",
							Default:     true,
						},
						"computeConfig": {
							TypeSpec: schema.TypeSpec{
								Ref: "#/types/eks:index:ClusterComputeConfig",
							},
							Description: "Compute configuration for EKS Auto Mode.",
						},
					},
					Required: []string{"enabled"},
				},
			},
			"eks:index:ClusterComputeConfig": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "object",
					Properties: map[string]schema.PropertySpec{
						"nodePools": {
							TypeSpec: schema.TypeSpec{
								Type: "array",
								Items: &schema.TypeSpec{
									Type: "string",
								},
							},
							Description: "Configuration for node pools that defines the compute resources for your EKS Auto Mode cluster. Valid options are `general-purpose` and `system`.\n\n" +
								"By default, the built-in `system` and `general-purpose` nodepools are enabled.",
						},
						"nodeRoleArn": {
							TypeSpec: schema.TypeSpec{
								Type: "string",
							},
							Description: "The ARN of the IAM Role EKS will assign to EC2 Managed Instances in your EKS Auto Mode cluster. This value cannot be changed after the compute capability of EKS Auto Mode is enabled.",
						},
					},
					Description: "Configuration for the compute capability of your EKS Auto Mode cluster.",
				},
			},
			"eks:index:ClusterNodePools": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "string",
					Description: "Built-in node pools of EKS Auto Mode. For more details see: https://docs.aws.amazon.com/eks/latest/userguide/set-builtin-node-pools.html",
				},
				Enum: []schema.EnumValueSpec{
					{
						Name:  "System",
						Value: "system",
						Description: "This NodePool has a `CriticalAddonsOnly` taint. Many EKS addons, such as CoreDNS, tolerate this taint. Use this system node pool to segregate cluster-critical applications. " +
							"Supports both `amd64` and `arm64` architectures.",
					},
					{
						Name:        "GeneralPurpose",
						Value:       "general-purpose",
						Description: "This NodePool provides support for launching nodes for general purpose workloads in your cluster. Only supports `amd64` architecture.",
					},
				},
			},
			"eks:index:FargateProfile": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "object",
					Description: "Defines how Kubernetes pods are executed in Fargate. See " +
						"aws.eks.FargateProfileArgs for reference.",
					Properties: map[string]schema.PropertySpec{
						"podExecutionRoleArn": {
							TypeSpec: schema.TypeSpec{Type: "string"},
							Description: "Specify a custom role to use for executing pods in Fargate. Defaults to " +
								"creating a new role with the " +
								"`arn:aws:iam::aws:policy/AmazonEKSFargatePodExecutionRolePolicy` policy attached.",
						},
						"subnetIds": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Type: "string"},
							},
							Description: "Specify the subnets in which to execute Fargate tasks for pods. Defaults " +
								"to the private subnets associated with the cluster.",
						},
						"selectors": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Ref: awsRef("#/types/aws:eks%2FFargateProfileSelector:FargateProfileSelector", dependencies.Aws)},
							},
							Description: "Specify the namespace and label selectors to use for launching pods into Fargate.",
						},
					},
				},
			},
			"eks:index:KubeconfigOptions": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "object",
					Description: "Represents the AWS credentials to scope a given kubeconfig when using a " +
						"non-default credential chain.\n\nThe options can be used independently, or additively.\n\n" +
						"A scoped kubeconfig is necessary for certain auth scenarios. For example:\n" +
						"  1. Assume a role on the default account caller,\n" +
						"  2. Use an AWS creds profile instead of the default account caller,\n" +
						"  3. Use an AWS creds creds profile instead of the default account caller,\n" +
						"     and then assume a given role on the profile. This scenario is also\n" +
						"     possible by only using a profile, iff the profile includes a role to\n" +
						"     assume in its settings.\n\n" +
						"See for more details:\n" +
						"- https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html\n" +
						"- https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html\n" +
						"- https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html",
					Properties: map[string]schema.PropertySpec{
						"roleArn": {
							TypeSpec: schema.TypeSpec{Type: "string"}, // TODO enum `aws.ARN`.
							Description: "Role ARN to assume instead of the default AWS credential provider chain.\n\n" +
								"The role is passed to kubeconfig as an authentication exec argument.",
						},
						"profileName": {
							TypeSpec: schema.TypeSpec{Type: "string"},
							Description: "AWS credential profile name to always use instead of the default AWS " +
								"credential provider chain.\n\nThe profile is passed to kubeconfig as an " +
								"authentication environment setting.",
						},
					},
				},
			},
			"eks:index:NodeGroupData": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: "NodeGroupData describes the resources created for the given NodeGroup.",
					Properties: map[string]schema.PropertySpec{
						"nodeSecurityGroup": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup", dependencies.Aws)},
							Description: "The security group for the node group to communicate with the cluster.",
						},
						"extraNodeSecurityGroups": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup", dependencies.Aws)},
							},
							Description: "The additional security groups for the node group that captures user-specific rules.",
						},
						"autoScalingGroup": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:autoscaling%2Fgroup:Group", dependencies.Aws)},
							Description: "The AutoScalingGroup for the node group.",
						},
					},
					Required: []string{
						"nodeSecurityGroup",
						"extraNodeSecurityGroups",
						"autoScalingGroup",
					},
				},
			},
			"eks:index:RoleMapping": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: "Describes a mapping from an AWS IAM role to a Kubernetes user and groups.",
					Properties: map[string]schema.PropertySpec{
						"roleArn": {
							TypeSpec:    schema.TypeSpec{Type: "string"}, // TODO enum `aws.ARN`.
							Description: "The ARN of the IAM role to add.",
						},
						"username": {
							TypeSpec: schema.TypeSpec{Type: "string"},
							Description: "The user name within Kubernetes to map to the IAM role. By default, the " +
								"user name is the ARN of the IAM role.",
						},
						"groups": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Type: "string"},
							},
							Description: "A list of groups within Kubernetes to which the role is mapped.",
						},
					},
					Required: []string{
						"roleArn",
						"username",
						"groups",
					},
				},
			},
			"eks:index:StorageClass": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "object",
					Description: "StorageClass describes the inputs to a single Kubernetes StorageClass provisioned " +
						"by AWS. Any number of storage classes can be added to a cluster at creation time. One of " +
						"these storage classes may be configured the default storage class for the cluster.",
					Properties: map[string]schema.PropertySpec{
						"type": {
							TypeSpec:    schema.TypeSpec{Type: "string"}, // TODO: EBSVolumeType enum "io1" | "gp2" | "sc1" | "st1"
							Description: "The EBS volume type.",
						},
						"zones": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Type: "string"},
							},
							Description: "The AWS zone or zones for the EBS volume. If zones is not specified, " +
								"volumes are generally round-robin-ed across all active zones where Kubernetes " +
								"cluster has a node. zone and zones parameters must not be used at the same time.",
						},
						"iopsPerGb": {
							TypeSpec: schema.TypeSpec{Type: "integer"},
							Description: "I/O operations per second per GiB for \"io1\" volumes. The AWS volume " +
								"plugin multiplies this with the size of a requested volume to compute IOPS of the " +
								"volume and caps the result at 20,000 IOPS.",
						},
						"encrypted": {
							TypeSpec:    schema.TypeSpec{Type: "boolean"},
							Description: "Denotes whether the EBS volume should be encrypted.",
						},
						"kmsKeyId": {
							TypeSpec: schema.TypeSpec{Type: "string"},
							Description: "The full Amazon Resource Name of the key to use when encrypting the " +
								"volume. If none is supplied but encrypted is true, a key is generated by AWS.",
						},
						"default": {
							TypeSpec: schema.TypeSpec{Type: "boolean"},
							Description: "True if this storage class should be a default storage class for the " +
								"cluster.\n\n" +
								"Note: As of Kubernetes v1.11+ on EKS, a default `gp2` storage class will always be " +
								"created automatically for the cluster by the EKS service. See " +
								"https://docs.aws.amazon.com/eks/latest/userguide/storage-classes.html\n\n" +
								"Please note that at most one storage class can be marked as default. If two or more " +
								"of them are marked as default, a PersistentVolumeClaim without `storageClassName` " +
								"explicitly specified cannot be created. See: " +
								"https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/#changing-the-default-storageclass",
						},
						"allowVolumeExpansion": {
							TypeSpec:    schema.TypeSpec{Type: "boolean"},
							Description: "AllowVolumeExpansion shows whether the storage class allow volume expand.",
						},
						"metadata": {
							TypeSpec: schema.TypeSpec{Ref: k8sRef("#/types/kubernetes:meta%2Fv1:ObjectMeta", dependencies.Kubernetes)},
							Description: "Standard object's metadata. More info: " +
								"https://git.k8s.io/community/contributors/devel/api-conventions.md#metadata",
						},
						"mountOptions": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Type: "string"},
							},
							Description: "Dynamically provisioned PersistentVolumes of this storage class are " +
								"created with these mountOptions, e.g. [\"ro\", \"soft\"]. Not validated - mount of " +
								"the PVs will simply fail if one is invalid.",
						},
						"reclaimPolicy": {
							TypeSpec: schema.TypeSpec{Type: "string"},
							Description: "Dynamically provisioned PersistentVolumes of this storage class are " +
								"created with this reclaimPolicy. Defaults to Delete.",
						},
						"volumeBindingMode": {
							TypeSpec: schema.TypeSpec{Type: "string"},
							Description: "VolumeBindingMode indicates how PersistentVolumeClaims should be " +
								"provisioned and bound. When unset, VolumeBindingImmediate is used. This field is " +
								"alpha-level and is only honored by servers that enable the VolumeScheduling feature.",
						},
					},
					Required: []string{"type"},
				},
			},
			"eks:index:Taint": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "object",
					Description: "Represents a Kubernetes `taint` to apply to all Nodes in a NodeGroup. " +
						"See https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/.",
					Properties: map[string]schema.PropertySpec{
						"value": {
							TypeSpec: schema.TypeSpec{
								Type: "string",
							},
							Description: "The value of the taint.",
						},
						"effect": {
							TypeSpec: schema.TypeSpec{
								Type: "string", // TODO strict string enum: "NoSchedule" | "NoExecute" | "PreferNoSchedule".
							},
							Description: "The effect of the taint.",
						},
					},
					Required: []string{
						"value",
						"effect",
					},
				},
			},
			"eks:index:UserMapping": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: "Describes a mapping from an AWS IAM user to a Kubernetes user and groups.",
					Properties: map[string]schema.PropertySpec{
						"userArn": {
							TypeSpec:    schema.TypeSpec{Type: "string"}, // TODO enum `aws.ARN`.
							Description: "The ARN of the IAM user to add.",
						},
						"username": {
							TypeSpec: schema.TypeSpec{Type: "string"},
							Description: "The user name within Kubernetes to map to the IAM user. By default, the " +
								"user name is the ARN of the IAM user.",
						},
						"groups": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Type: "string"},
							},
							Description: "A list of groups within Kubernetes to which the user is mapped to.",
						},
					},
					Required: []string{
						"userArn",
						"username",
						"groups",
					},
				},
			},

			// The Cluster component accepts this for its nodeGroupOptions input property. Technically it represents the
			// input properties of the NodeGroup component. Unfortunately, we cannot type the Cluster component's
			// nodeGroupOptions as the NodeGroup resources's input args type because 1) the schema doesn't support it,
			// and 2) not all languages model input properties as a separate type (e.g. Python currently only exposes
			// resource inputs as arguments to the resource's constructor). In order to support these as an input to the
			// Cluster component, we must model it in the schema as its own type.
			"eks:index:ClusterNodeGroupOptions": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: "Describes the configuration options accepted by a cluster to create its own node groups.",
					Properties:  nodeGroupProperties(false /*cluster*/, true /*NodeGroupV2*/, dependencies.Aws),
				},
			},

			// The Cluster component accepts this for its vpcCniOptions input property. Technically it represents the
			// input properties of the VpcCni resource (aside from the kubeconfig property). Unfortunately, we cannot
			// type the Cluster component's vpcCniOptions as the VpcCni resources's input args type because 1) the
			// schema doesn't support it, and 2) not all languages model input properties as a separate type (e.g.
			// Python currently only exposes resource inputs as arguments to the resource's constructor). In order to
			// support these as an input to the Cluster component, we must model it in the schema as its own type.
			"eks:index:VpcCniOptions": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: "Describes the configuration options available for the Amazon VPC CNI plugin for Kubernetes.",
					Properties:  vpcCniProperties(true /*cluster*/),
				},
			},

			"eks:index:AccessEntry": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "object",
					Description: "Access entries allow an IAM principal to access your cluster.\n\n" +
						"You have the following options for authorizing an IAM principal to access Kubernetes objects on your cluster: Kubernetes role-based access control (RBAC), Amazon EKS, or both.\n" +
						"Kubernetes RBAC authorization requires you to create and manage Kubernetes Role , ClusterRole , RoleBinding , and ClusterRoleBinding objects, in addition to managing access entries. " +
						"If you use Amazon EKS authorization exclusively, you don't need to create and manage Kubernetes Role , ClusterRole , RoleBinding , and ClusterRoleBinding objects.",
					Properties: map[string]schema.PropertySpec{
						"principalArn": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The IAM Principal ARN which requires Authentication access to the EKS cluster.",
						},
						"username": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "Defaults to the principalArn if the principal is a user, else defaults to assume-role/session-name.",
						},
						"kubernetesGroups": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Type: "string"},
							},
							Description: "A list of groups within Kubernetes to which the IAM principal is mapped to.",
						},
						"accessPolicies": {
							TypeSpec: schema.TypeSpec{
								Type: "object",
								AdditionalProperties: &schema.TypeSpec{
									Ref: "#/types/eks:index:AccessPolicyAssociation",
								},
								Plain: true,
							},
							Description: "The access policies to associate to the access entry.",
						},
						"tags": {
							TypeSpec: schema.TypeSpec{
								Type:                 "object",
								AdditionalProperties: &schema.TypeSpec{Type: "string"},
							},
							Description: "The tags to apply to the AccessEntry.",
						},
						"type": {
							TypeSpec: schema.TypeSpec{
								Ref: "#/types/eks:index:AccessEntryType",
							},
							Description: "The type of the new access entry. Valid values are STANDARD, FARGATE_LINUX, EC2_LINUX, and EC2_WINDOWS.\n" +
								"Defaults to STANDARD which provides the standard workflow. EC2_LINUX, EC2_WINDOWS, FARGATE_LINUX types disallow users to input a username or kubernetesGroup, and prevent associating access policies.",
						},
					},
					Required: []string{"principalArn"},
				},
			},

			"eks:index:AccessPolicyAssociation": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "object",
					Description: "Associates an access policy and its scope to an IAM principal.\n\n" +
						"See for more details:\n" +
						"https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html",
					Properties: map[string]schema.PropertySpec{
						"policyArn": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The ARN of the access policy to associate with the principal",
						},
						"accessScope": {
							TypeSpec: schema.TypeSpec{
								Ref: awsRef("#/types/aws:eks%2FAccessPolicyAssociationAccessScope:AccessPolicyAssociationAccessScope", dependencies.Aws),
							},
							Description: "The scope of the access policy association. This controls whether the access policy is scoped " +
								"to the cluster or to a particular namespace.",
						},
					},
					Required: []string{"policyArn", "accessScope"},
				},
			},
			"eks:index:AccessEntryType": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "string",
					Description: "The type of the new access entry. Valid values are STANDARD, FARGATE_LINUX, EC2_LINUX, and EC2_WINDOWS.\n" +
						"Defaults to STANDARD which provides the standard workflow. EC2_LINUX and EC2_WINDOWS types disallow users to input a kubernetesGroup, and prevent associating access policies.",
				},
				Enum: []schema.EnumValueSpec{
					{
						Name:        "Standard",
						Value:       "STANDARD",
						Description: "Standard Access Entry Workflow. Allows users to input a username and kubernetesGroup, and to associate access policies.",
					},
					{
						Name:        "FargateLinux",
						Value:       "FARGATE_LINUX",
						Description: "For IAM roles used with AWS Fargate profiles.",
					},
					{
						Name:        "EC2Linux",
						Value:       "EC2_LINUX",
						Description: "For IAM roles associated with self-managed Linux node groups. Allows the nodes to join the cluster.",
					},
					{
						Name:        "EC2Windows",
						Value:       "EC2_WINDOWS",
						Description: "For IAM roles associated with self-managed Windows node groups. Allows the nodes to join the cluster.",
					},
					{
						Name:        "EC2",
						Value:       "EC2",
						Description: "For IAM roles associated with EC2 instances that need access policies. Allows the nodes to join the cluster.",
					},
				},
			},
			"eks:index:AuthenticationMode": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "string",
					Description: "The authentication mode of the cluster. Valid values are `CONFIG_MAP`, `API` or `API_AND_CONFIG_MAP`.\n\n" +
						"See for more details:\nhttps://docs.aws.amazon.com/eks/latest/userguide/grant-k8s-access.html#set-cam",
				},
				Enum: []schema.EnumValueSpec{
					{
						Name:        "ConfigMap",
						Value:       "CONFIG_MAP",
						Description: "Only aws-auth ConfigMap will be used for authenticating to the Kubernetes API.",
						DeprecationMessage: "The aws-auth ConfigMap is deprecated. The recommended method to manage access to Kubernetes APIs is Access Entries with the AuthenticationMode API.\n" +
							"For more information and instructions how to upgrade, see https://docs.aws.amazon.com/eks/latest/userguide/migrating-access-entries.html.",
					},
					{
						Name:        "Api",
						Value:       "API",
						Description: "Only Access Entries will be used for authenticating to the Kubernetes API.",
					},
					{
						Name:        "ApiAndConfigMap",
						Value:       "API_AND_CONFIG_MAP",
						Description: "Both aws-auth ConfigMap and Access Entries can be used for authenticating to the Kubernetes API.",
						DeprecationMessage: "The aws-auth ConfigMap is deprecated. The recommended method to manage access to Kubernetes APIs is Access Entries with the AuthenticationMode API.\n" +
							"For more information and instructions how to upgrade, see https://docs.aws.amazon.com/eks/latest/userguide/migrating-access-entries.html.",
					},
				},
			},
			"eks:index:OperatingSystem": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "string",
					Description: "The type of EKS optimized Operating System to use for node groups.\n\n" +
						"See for more details:\nhttps://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-amis.html",
				},
				Enum: []schema.EnumValueSpec{
					{
						Name:        "AL2",
						Value:       "AL2",
						Description: "EKS optimized OS based on Amazon Linux 2 (AL2).",

						// While it's still the default (until the next major version), we should warn users if they're
						// explicitly picking it.
						DeprecationMessage: "Amazon Linux 2 is deprecated. Please use Amazon Linux 2023 instead.\n" +
							"See for more details: https://docs.aws.amazon.com/eks/latest/userguide/al2023.html",
					},
					{
						Name:  "AL2023",
						Value: "AL2023",
						Description: "EKS optimized OS based on Amazon Linux 2023 (AL2023).\n" +
							"See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html",
					},
					{
						Name:  "Bottlerocket",
						Value: "Bottlerocket",
						Description: "EKS optimized Container OS based on Bottlerocket.\n" +
							"See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami-bottlerocket.html",
					},
					{
						Name:  "RECOMMENDED",
						Value: "AL2023",
						Description: "The recommended EKS optimized OS. Currently Amazon Linux 2023 (AL2023).\n" +
							"This will be kept up to date with AWS' recommendations for EKS optimized operating systems.\n\n" +
							"See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html",
					},
				},
			},
			"eks:index:AmiType": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "string",
					Description: "Predefined AMI types for EKS optimized AMIs. Can be used to select the latest EKS optimized AMI for a node group.",
				},
				Enum: []schema.EnumValueSpec{
					{
						Name:  "AL2X86_64",
						Value: "AL2_x86_64",
						DeprecationMessage: "Amazon Linux 2 is deprecated. Please use Amazon Linux 2023 instead.\n" +
							"See for more details: https://docs.aws.amazon.com/eks/latest/userguide/al2023.html",
					},
					{
						Name:  "AL2X86_64GPU",
						Value: "AL2_x86_64_GPU",
						DeprecationMessage: "Amazon Linux 2 is deprecated. Please use Amazon Linux 2023 instead.\n" +
							"See for more details: https://docs.aws.amazon.com/eks/latest/userguide/al2023.html",
					},
					{
						Name:  "AL2Arm64",
						Value: "AL2_ARM_64",
						DeprecationMessage: "Amazon Linux 2 is deprecated. Please use Amazon Linux 2023 instead.\n" +
							"See for more details: https://docs.aws.amazon.com/eks/latest/userguide/al2023.html",
					},

					{
						Name:  "AL2023X86_64Standard",
						Value: "AL2023_x86_64_STANDARD",
					},
					{
						Name:  "AL2023Arm64Standard",
						Value: "AL2023_ARM_64_STANDARD",
					},
					{
						Name:  "AL2023X86_64Nvidia",
						Value: "AL2023_x86_64_NVIDIA",
					},
					{
						Name:  "BottlerocketArm64",
						Value: "BOTTLEROCKET_ARM_64",
					},
					{
						Name:  "BottlerocketX86_64",
						Value: "BOTTLEROCKET_x86_64",
					},
					{
						Name:  "BottlerocketArm64Nvidia",
						Value: "BOTTLEROCKET_ARM_64_NVIDIA",
					},
					{
						Name:  "BottlerocketX86_64Nvidia",
						Value: "BOTTLEROCKET_x86_64_NVIDIA",
					},
				},
			},
			"eks:index:NodeadmOptions": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "object",
					Description: "MIME document parts for nodeadm configuration. This can be shell scripts, nodeadm configuration or any other user data compatible script.\n\n" +
						"See for more details: https://awslabs.github.io/amazon-eks-ami/nodeadm/.",
					Properties: map[string]schema.PropertySpec{
						"content": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The actual content of the MIME document part, such as shell script code or nodeadm configuration. Must be compatible with the specified contentType.",
						},
						"contentType": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The MIME type of the content. Examples are `text/x-shellscript; charset=\"us-ascii\"` for shell scripts, and `application/node.eks.aws` nodeadm configuration.",
						},
					},
					Required: []string{"content", "contentType"},
				},
			},
			"eks:index:ResolveConflictsOnUpdate": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "string",
					Description: "How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from the Amazon EKS default value. " +
						"Valid values are `NONE`, `OVERWRITE`, and `PRESERVE`. For more details see the [UpdateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateAddon.html) API Docs.",
				},
				Enum: []schema.EnumValueSpec{
					{
						Name:        "None",
						Value:       "NONE",
						Description: "Amazon EKS doesn't change the value. The update might fail.",
					},
					{
						Name:        "Overwrite",
						Value:       "OVERWRITE",
						Description: "Amazon EKS overwrites the changed value back to the Amazon EKS default value.",
					},
					{
						Name:        "Preserve",
						Value:       "PRESERVE",
						Description: "Amazon EKS preserves the value. If you choose this option, we recommend that you test any field and value changes on a non-production cluster before updating the add-on on your production cluster.",
					},
				},
			},
			"eks:index:ResolveConflictsOnCreate": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "string",
					Description: "How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on. " +
						"Valid values are `NONE` and `OVERWRITE`. For more details see the [CreateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html) API Docs.",
				},
				Enum: []schema.EnumValueSpec{
					{
						Name:        "None",
						Value:       "NONE",
						Description: "If the self-managed version of the add-on is installed on your cluster, Amazon EKS doesn't change the value. Creation of the add-on might fail.",
					},
					{
						Name:  "Overwrite",
						Value: "OVERWRITE",
						Description: "If the self-managed version of the add-on is installed on your cluster and the Amazon EKS default value is different than the existing value, " +
							"Amazon EKS changes the value to the Amazon EKS default value.",
					},
				},
			},
			"eks:index:CoreDnsAddonOptions": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "object",
					Properties: map[string]schema.PropertySpec{
						"enabled": {
							TypeSpec: schema.TypeSpec{Type: "boolean", Plain: true},
							Default:  true,
							Description: "Whether or not to create the `coredns` Addon in the cluster\n\n" +
								"The managed addon can only be enabled if the cluster is a Fargate cluster or if the cluster\n" +
								"uses the default node group, otherwise the self-managed addon is used.",
						},
						"version": {
							TypeSpec: schema.TypeSpec{Type: "string"},
							Description: "The version of the EKS add-on. The version must " +
								"match one of the versions returned by [describe-addon-versions](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-versions.html).",
						},
						"configurationValues": {
							TypeSpec: schema.TypeSpec{
								Type:                 "object",
								AdditionalProperties: &schema.TypeSpec{Ref: "pulumi.json#/Any"},
							},
							Description: "Custom configuration values for the coredns addon. This object must match the schema derived from " +
								"[describe-addon-configuration](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-configuration.html).",
						},
						"resolveConflictsOnCreate": {
							TypeSpec: schema.TypeSpec{Plain: true, Type: "string", Ref: "#/types/eks:index:ResolveConflictsOnCreate"},
							Description: "How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on. " +
								"Valid values are `NONE` and `OVERWRITE`. For more details see the [CreateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html) API Docs.",
							Default: "OVERWRITE",
						},
						"resolveConflictsOnUpdate": {
							TypeSpec: schema.TypeSpec{Plain: true, Type: "string", Ref: "#/types/eks:index:ResolveConflictsOnUpdate"},
							Description: "How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from the Amazon EKS default value. " +
								"Valid values are `NONE`, `OVERWRITE`, and `PRESERVE`. For more details see the [UpdateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateAddon.html) API Docs.",
							Default: "OVERWRITE",
						},
					},
				},
			},
			"eks:index:KubeProxyAddonOptions": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "object",
					Properties: map[string]schema.PropertySpec{
						"enabled": {
							TypeSpec:    schema.TypeSpec{Type: "boolean", Plain: true},
							Description: "Whether or not to create the `kube-proxy` Addon in the cluster. Defaults to true, unless `autoMode` is enabled.",
						},
						"version": {
							TypeSpec: schema.TypeSpec{Type: "string"},
							Description: "The version of the EKS add-on. The version must " +
								"match one of the versions returned by [describe-addon-versions](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-versions.html).",
						},
						"configurationValues": {
							TypeSpec: schema.TypeSpec{
								Type:                 "object",
								AdditionalProperties: &schema.TypeSpec{Ref: "pulumi.json#/Any"},
							},
							Description: "Custom configuration values for the kube-proxy addon. This object must match the schema derived from " +
								"[describe-addon-configuration](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-configuration.html).",
						},
						"resolveConflictsOnCreate": {
							TypeSpec: schema.TypeSpec{Plain: true, Type: "string", Ref: "#/types/eks:index:ResolveConflictsOnCreate"},
							Description: "How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on. " +
								"Valid values are `NONE` and `OVERWRITE`. For more details see the [CreateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html) API Docs.",
							Default: "OVERWRITE",
						},
						"resolveConflictsOnUpdate": {
							TypeSpec: schema.TypeSpec{Plain: true, Type: "string", Ref: "#/types/eks:index:ResolveConflictsOnUpdate"},
							Description: "How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from the Amazon EKS default value. " +
								"Valid values are `NONE`, `OVERWRITE`, and `PRESERVE`. For more details see the [UpdateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateAddon.html) API Docs.",
							Default: "OVERWRITE",
						},
					},
				},
			},
		},

		Language: map[string]schema.RawMessage{
			"csharp": rawMessage(map[string]interface{}{
				"packageReferences": map[string]string{
					"Pulumi":            "3.*",
					"Pulumi.Aws":        "7.*",
					"Pulumi.Kubernetes": "4.*",
				},
				"liftSingleValueMethodReturns": true,
				"respectSchemaVersion":         true,
			}),
			"python": rawMessage(map[string]interface{}{
				"requires": map[string]string{
					"pulumi-aws":        fmt.Sprintf(">=%s,<8.0.0", dependencies.Aws),
					"pulumi-kubernetes": fmt.Sprintf(">=%s,<5.0.0", dependencies.Kubernetes),
				},
				"usesIOClasses": true,
				// TODO: Embellish the readme
				"readme":                       "Pulumi Amazon Web Services (AWS) EKS Components.",
				"liftSingleValueMethodReturns": true,
				"pyproject": map[string]any{
					"enabled": true,
				},
				"respectSchemaVersion": true,
			}),
			"go": rawMessage(map[string]interface{}{
				"generateResourceContainerTypes": true,
				"importBasePath":                 fmt.Sprintf("github.com/pulumi/pulumi-eks/sdk/v%d/go/eks", version.Major),
				"liftSingleValueMethodReturns":   true,
				"internalModuleName":             "utilities",
				"respectSchemaVersion":           true,
			}),
			"java": rawMessage(map[string]interface{}{
				"dependencies": map[string]string{
					"com.pulumi:aws":        dependencies.Aws,
					"com.pulumi:kubernetes": dependencies.Kubernetes,
				},
			}),
			"nodejs": rawMessage(map[string]interface{}{
				"respectSchemaVersion": true,
				"dependencies": map[string]string{
					"@pulumi/aws":        "^" + dependencies.Aws,
					"@pulumi/kubernetes": "^" + dependencies.Kubernetes,
					"https-proxy-agent":  "^5.0.1",
					"js-yaml":            "^4.1.0",
					"netmask":            "^2.0.2",
					"semver":             "^7.3.7",
					"which":              "^1.3.1",
				},
				"devDependencies": map[string]string{
					"@types/js-yaml": "^4.0.5",
					"@types/netmask": "^1.0.30",
					"@types/node":    "^18.11.13",
					"@types/semver":  "^7.3.10",
					"typescript":     "^4.6.2",
					"@types/which":   "^1.3.1",
				},
			}),
		},
	}
}

//nolint:lll
func nodeGroupProperties(cluster, v2 bool, awsVersion string) map[string]schema.PropertySpec {
	props := map[string]schema.PropertySpec{
		"nodeSubnetIds": {
			TypeSpec: schema.TypeSpec{
				Type:  "array",
				Items: &schema.TypeSpec{Type: "string"},
			},
			Description: "The set of subnets to override and use for the worker node group.\n\nSetting " +
				"this option overrides which subnets to use for the worker node group, regardless if the " +
				"cluster's `subnetIds` is set, or if `publicSubnetIds` and/or `privateSubnetIds` were set.",
		},
		"instanceType": {
			TypeSpec:    schema.TypeSpec{Type: "string"}, // TODO: aws.ec2.InstanceType is a string enum.
			Description: "The instance type to use for the cluster's nodes. Defaults to \"t3.medium\".",
		},
		"spotPrice": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "Bidding price for spot instance. If set, only spot instances will be added as " +
				"worker node.",
		},
		"nodeSecurityGroup": {
			TypeSpec: schema.TypeSpec{
				Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup", awsVersion),
			},
			Description: "The security group for the worker node group to communicate with the cluster.\n\n" +
				"This security group requires specific inbound and outbound rules.\n\n" +
				"See for more details:\n" +
				"https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html\n\n" +
				"Note: The `nodeSecurityGroup` option and the cluster option`nodeSecurityGroupTags` are " +
				"mutually exclusive.",
		},
		"nodeSecurityGroupId": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "The ID of the security group for the worker node group to communicate with the cluster.\n\n" +
				"This security group requires specific inbound and outbound rules.\n\n" +
				"See for more details:\n" +
				"https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html\n\n" +
				"Note: The `nodeSecurityGroupId` option and the cluster option `nodeSecurityGroupTags` are " +
				"mutually exclusive.",
		},
		"clusterIngressRule": {
			TypeSpec: schema.TypeSpec{
				Ref: awsRef("#/resources/aws:ec2%2FsecurityGroupRule:SecurityGroupRule", awsVersion),
			},
			Description: "The ingress rule that gives node group access.",
		},
		"clusterIngressRuleId": {
			TypeSpec:    schema.TypeSpec{Type: "string"},
			Description: "The ID of the ingress rule that gives node group access.",
		},
		"extraNodeSecurityGroups": {
			TypeSpec: schema.TypeSpec{
				Type: "array",
				Items: &schema.TypeSpec{
					Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup", awsVersion),
				},
			},
			Description: "Extra security groups to attach on all nodes in this worker node group.\n\n" +
				"This additional set of security groups captures any user application rules that will be " +
				"needed for the nodes.",
		},
		"encryptRootBlockDevice": {
			TypeSpec:    schema.TypeSpec{Type: "boolean"},
			Description: "Encrypt the root block device of the nodes in the node group.",
		},
		"nodePublicKey": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "Public key material for SSH access to worker nodes. See allowed formats at:\n" +
				"https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html\n" +
				"If not provided, no SSH access is enabled on VMs.",
		},
		"keyName": {
			TypeSpec:    schema.TypeSpec{Type: "string"},
			Description: "Name of the key pair to use for SSH access to worker nodes.",
		},
		"nodeRootVolumeSize": {
			TypeSpec:    schema.TypeSpec{Type: "integer"},
			Description: "The size in GiB of a cluster node's root volume. Defaults to 20.",
		},
		"nodeRootVolumeDeleteOnTermination": {
			TypeSpec:    schema.TypeSpec{Type: "boolean"},
			Description: "Whether the root block device should be deleted on termination of the instance. Defaults to true.",
		},
		"nodeRootVolumeEncrypted": {
			TypeSpec:    schema.TypeSpec{Type: "boolean"},
			Description: "Whether to encrypt a cluster node's root volume. Defaults to false.",
		},
		"nodeRootVolumeIops": {
			TypeSpec:    schema.TypeSpec{Type: "integer"},
			Description: "The amount of provisioned IOPS. This is only valid with a volumeType of 'io1'.",
		},
		"nodeRootVolumeThroughput": {
			TypeSpec:    schema.TypeSpec{Type: "integer"},
			Description: "Provisioned throughput performance in integer MiB/s for a cluster node's root volume. This is only valid with a volumeType of 'gp3'.",
		},
		"nodeRootVolumeType": {
			TypeSpec:    schema.TypeSpec{Type: "string"},
			Description: "Configured EBS type for a cluster node's root volume. Default is 'gp2'. Supported values are 'standard', 'gp2', 'gp3', 'st1', 'sc1', 'io1'.",
		},
		"nodeUserData": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "Extra code to run on node startup. This code will run after the AWS EKS " +
				"bootstrapping code and before the node signals its readiness to the managing " +
				"CloudFormation stack. This code must be a typical user data script: critically it must " +
				"begin with an interpreter directive (i.e. a `#!`).",
		},
		"nodeUserDataOverride": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "User specified code to run on node startup. This code is expected to handle " +
				"the full AWS EKS bootstrapping code and signal node readiness to the managing " +
				"CloudFormation stack. This code must be a complete and executable user data script in " +
				"bash (Linux) or powershell (Windows).\n\n" +
				"See for more details: https://docs.aws.amazon.com/eks/latest/userguide/worker.html",
		},
		"desiredCapacity": {
			TypeSpec:    schema.TypeSpec{Type: "integer"},
			Description: "The number of worker nodes that should be running in the cluster. Defaults to 2.",
		},
		"minSize": {
			TypeSpec:    schema.TypeSpec{Type: "integer"},
			Description: "The minimum number of worker nodes running in the cluster. Defaults to 1.",
		},
		"maxSize": {
			TypeSpec:    schema.TypeSpec{Type: "integer"},
			Description: "The maximum number of worker nodes running in the cluster. Defaults to 2.",
		},
		"amiId": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "The AMI ID to use for the worker nodes.\n\nDefaults to the latest recommended " +
				"EKS Optimized Linux AMI from the AWS Systems Manager Parameter Store.\n\nNote: " +
				"`amiId` and `gpu` are mutually exclusive.\n\nSee for more details:\n" +
				"- https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.",
		},
		"amiType": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "The AMI Type to use for the worker nodes. \n\nOnly applicable when setting an " +
				"AMI ID that is of type `arm64`. \n\nNote: `amiType` and `gpu` are mutually exclusive.\n\n",
		},
		"gpu": {
			TypeSpec: schema.TypeSpec{Type: "boolean"},
			Description: "Use the latest recommended EKS Optimized Linux AMI with GPU support for the " +
				"worker nodes from the AWS Systems Manager Parameter Store.\n\nDefaults to false.\n\n" +
				"Note: `gpu` and `amiId` are mutually exclusive.\n\nSee for more details:\n" +
				"- https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html\n" +
				"- https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html",
		},
		"labels": {
			TypeSpec: schema.TypeSpec{
				Type: "object",
				AdditionalProperties: &schema.TypeSpec{
					Type: "string",
				},
			},
			Description: "Custom k8s node labels to be attached to each worker node. Adds the given " +
				"key/value pairs to the `--node-labels` kubelet argument.",
		},
		"taints": {
			TypeSpec: schema.TypeSpec{
				Type: "object",
				AdditionalProperties: &schema.TypeSpec{
					Ref: "#/types/eks:index:Taint",
				},
			},
			Description: "Custom k8s node taints to be attached to each worker node. Adds the given " +
				"taints to the `--register-with-taints` kubelet argument",
		},
		"kubeletExtraArgs": {
			TypeSpec: schema.TypeSpec{
				Type: "string",
			},
			Description: "Extra args to pass to the Kubelet. Corresponds to the options passed in the " +
				"`--kubeletExtraArgs` flag to `/etc/eks/bootstrap.sh`. For example, " +
				"'--port=10251 --address=0.0.0.0'. Note that the `labels` and `taints` properties will " +
				"be applied to this list (using `--node-labels` and `--register-with-taints` " +
				"respectively) after to the explicit `kubeletExtraArgs`.",
		},
		"bootstrapExtraArgs": {
			TypeSpec: schema.TypeSpec{
				Type: "string",
			},
			Description: "Additional args to pass directly to `/etc/eks/bootstrap.sh`. For details on " +
				"available options, see: " +
				"https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh. " +
				"Note that the `--apiserver-endpoint`, `--b64-cluster-ca` and `--kubelet-extra-args` " +
				"flags are included automatically based on other configuration parameters.",
		},
		"nodeAssociatePublicIpAddress": {
			TypeSpec: schema.TypeSpec{
				Type: "boolean",
			},
			Description: "Whether or not to auto-assign public IP addresses on the EKS worker nodes. If " +
				"this toggle is set to true, the EKS workers will be auto-assigned public IPs. If false, " +
				"they will not be auto-assigned public IPs.",
		},
		"version": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "Desired Kubernetes master / control plane version. If you do not specify a " +
				"value, the latest available version is used.",
		},
		"instanceProfile": {
			TypeSpec: schema.TypeSpec{
				Ref:   awsRef("#/resources/aws:iam%2FinstanceProfile:InstanceProfile", awsVersion),
				Plain: true,
			},
			Description: "The IAM InstanceProfile to use on the NodeGroup. Properties instanceProfile and instanceProfileName are mutually exclusive.",
		},
		"instanceProfileName": {
			TypeSpec:    schema.TypeSpec{Type: "string"},
			Description: "The name of the IAM InstanceProfile to use on the NodeGroup. Properties instanceProfile and instanceProfileName are mutually exclusive.",
		},
		"autoScalingGroupTags": {
			TypeSpec: schema.TypeSpec{
				Type:                 "object",
				AdditionalProperties: &schema.TypeSpec{Type: "string"},
			},
			Description: "The tags to apply to the NodeGroup's AutoScalingGroup in the CloudFormation " +
				"Stack.\n\nPer AWS, all stack-level tags, including automatically created tags, and the " +
				"`cloudFormationTags` option are propagated to resources that AWS CloudFormation " +
				"supports, including the AutoScalingGroup. See " +
				"https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html\n\n" +
				"Note: Given the inheritance of auto-generated CF tags and `cloudFormationTags`, you " +
				"should either supply the tag in `autoScalingGroupTags` or `cloudFormationTags`, but not " +
				"both.",
		},
		"cloudFormationTags": {
			TypeSpec: schema.TypeSpec{
				Type:                 "object",
				AdditionalProperties: &schema.TypeSpec{Type: "string"},
			},
			Description: "The tags to apply to the CloudFormation Stack of the Worker NodeGroup.\n\n" +
				"Note: Given the inheritance of auto-generated CF tags and `cloudFormationTags`, you " +
				"should either supply the tag in `autoScalingGroupTags` or `cloudFormationTags`, but not " +
				"both.",
		},
		"enableDetailedMonitoring": {
			TypeSpec: schema.TypeSpec{
				Type: "boolean",
			},
			Description: "Enables/disables detailed monitoring of the EC2 instances.\n\n" +
				"With detailed monitoring, all metrics, including status check metrics, are available in 1-minute intervals.\n" +
				"When enabled, you can also get aggregated data across groups of similar instances.\n\n" +
				"Note: You are charged per metric that is sent to CloudWatch. You are not charged for data storage.\n" +
				"For more information, see \"Paid tier\" and \"Example 1 - EC2 Detailed Monitoring\" here https://aws.amazon.com/cloudwatch/pricing/.",
		},
		"operatingSystem": {
			TypeSpec: schema.TypeSpec{
				Ref: "#/types/eks:index:OperatingSystem",
			},
			Description: "The type of OS to use for the node group. Will be used to determine the right EKS optimized AMI to use based on the instance types and gpu configuration.\n" +
				"Valid values are `RECOMMENDED`, `AL2`, `AL2023` and `Bottlerocket`.\n\n" +
				"Defaults to the current recommended OS.",
		},
		"bottlerocketSettings": {
			TypeSpec: schema.TypeSpec{
				Type: "object",
				AdditionalProperties: &schema.TypeSpec{
					Ref: "pulumi.json#/Any",
				},
			},
			Description: "The configuration settings for Bottlerocket OS.\n" +
				"The settings will get merged with the base settings the provider uses to configure Bottlerocket.\n\nThis includes:\n" +
				"  - settings.kubernetes.api-server\n" +
				"  - settings.kubernetes.cluster-certificate\n" +
				"  - settings.kubernetes.cluster-name\n" +
				"  - settings.kubernetes.cluster-dns-ip\n\n" +
				"For an overview of the available settings, see https://bottlerocket.dev/en/os/1.20.x/api/settings/.",
		},
		"nodeadmExtraOptions": {
			TypeSpec: schema.TypeSpec{
				Type:  "array",
				Items: &schema.TypeSpec{Ref: "#/types/eks:index:NodeadmOptions"},
			},
			Description: "Extra nodeadm configuration sections to be added to the nodeadm user data. " +
				"This can be shell scripts, nodeadm NodeConfig or any other user data compatible script. " +
				"When configuring additional nodeadm NodeConfig sections, they'll be merged with the base " +
				"settings the provider sets. You can overwrite base settings or provide additional settings this way.\n" +
				"The base settings the provider sets are:\n" +
				"  - cluster.name\n" +
				"  - cluster.apiServerEndpoint\n" +
				"  - cluster.certificateAuthority\n" +
				"  - cluster.cidr\n\n" +
				"Note: This is only applicable when using AL2023.\n" +
				"See for more details:\n" +
				"  - https://awslabs.github.io/amazon-eks-ami/nodeadm/\n" +
				"  - https://awslabs.github.io/amazon-eks-ami/nodeadm/doc/api/",
		},
	}

	if cluster {
		props["cluster"] = schema.PropertySpec{
			TypeSpec: schema.TypeSpec{
				OneOf: []schema.TypeSpec{
					{Ref: "#/resources/eks:index:Cluster"},
					{Ref: "#/types/eks:index:CoreData"},
				},
			},
			Description: "The target EKS cluster.",
		}
	}

	if v2 {
		props["minRefreshPercentage"] = schema.PropertySpec{
			TypeSpec: schema.TypeSpec{Type: "integer"},
			Description: "The minimum amount of instances that should remain available during an instance " +
				"refresh, expressed as a percentage. Defaults to 50.",
		}

		props["launchTemplateTagSpecifications"] = schema.PropertySpec{
			TypeSpec: schema.TypeSpec{
				Type: "array",
				Items: &schema.TypeSpec{
					Ref: awsRef("#/types/aws:ec2%2FLaunchTemplateTagSpecification:LaunchTemplateTagSpecification", awsVersion),
				},
			},
			Description: "The tag specifications to apply to the launch template.",
		}

		props["ignoreScalingChanges"] = schema.PropertySpec{
			TypeSpec: schema.TypeSpec{
				Type:  "boolean",
				Plain: true,
			},
			Description: "Whether to ignore changes to the desired size of the Auto Scaling Group. This is useful when using Cluster Autoscaler.\n\n" +
				"See [EKS best practices](https://aws.github.io/aws-eks-best-practices/cluster-autoscaling/) for more details.",
		}
	}

	return props
}

// vpcCniProperties returns a map of properties that can be used by either the VpcCni resource or VpcCniOptions type.
// When kubeconfig is set to true, the kubeconfig property is included in the map (for the VpcCni resource).
func vpcCniProperties(cluster bool) map[string]schema.PropertySpec {
	props := map[string]schema.PropertySpec{
		"nodePortSupport": {
			TypeSpec: schema.TypeSpec{Type: "boolean"},
			Description: "Specifies whether NodePort services are enabled on a worker node's primary " +
				"network interface. This requires additional iptables rules and that the kernel's " +
				"reverse path filter on the primary interface is set to loose.\n\nDefaults to true.",
		},
		"customNetworkConfig": {
			TypeSpec: schema.TypeSpec{Type: "boolean"},
			Description: "Specifies that your pods may use subnets and security groups (within the " +
				"same VPC as your control plane resources) that are independent of your cluster's " +
				"`resourcesVpcConfig`.\n\nDefaults to false.",
		},
		"externalSnat": {
			TypeSpec: schema.TypeSpec{Type: "boolean"},
			Description: "Specifies whether an external NAT gateway should be used to provide SNAT " +
				"of secondary ENI IP addresses. If set to true, the SNAT iptables rule and off-VPC " +
				"IP rule are not applied, and these rules are removed if they have already been " +
				"applied.\n\nDefaults to false.",
		},
		"warmEniTarget": {
			TypeSpec: schema.TypeSpec{Type: "integer"},
			Description: "Specifies the number of free elastic network interfaces (and all of their " +
				"available IP addresses) that the ipamD daemon should attempt to keep available for " +
				"pod assignment on the node.\n\nDefaults to 1.",
		},
		"warmIpTarget": {
			TypeSpec: schema.TypeSpec{Type: "integer"},
			Description: "Specifies the number of free IP addresses that the ipamD daemon should " +
				"attempt to keep available for pod assignment on the node.",
		},
		"warmPrefixTarget": {
			TypeSpec: schema.TypeSpec{Type: "integer"},
			Description: "WARM_PREFIX_TARGET will allocate one full (/28) prefix even if a single IP  " +
				"is consumed with the existing prefix. " +
				"Ref: https://github.com/aws/amazon-vpc-cni-k8s/blob/master/docs/prefix-and-ip-target.md",
		},
		"enablePrefixDelegation": {
			TypeSpec:    schema.TypeSpec{Type: "boolean"},
			Description: "IPAMD will start allocating (/28) prefixes to the ENIs with ENABLE_PREFIX_DELEGATION set to true.",
		},
		"logLevel": {
			TypeSpec: schema.TypeSpec{Type: "string"}, // TODO consider typing this as an enum
			Description: "Specifies the log level used for logs.\n\nDefaults to \"DEBUG\"\nValid " +
				"values: \"DEBUG\", \"INFO\", \"WARN\", \"ERROR\", or \"FATAL\".",
		},
		"logFile": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "Specifies the file path used for logs.\n\nDefaults to \"stdout\" to emit " +
				"Pod logs for `kubectl logs`.",
		},
		"vethPrefix": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "Specifies the veth prefix used to generate the host-side veth device name " +
				"for the CNI.\n\nThe prefix can be at most 4 characters long.\n\nDefaults to \"eni\".",
		},
		"eniMtu": {
			TypeSpec: schema.TypeSpec{Type: "integer"},
			Description: "Used to configure the MTU size for attached ENIs. The valid range is from " +
				"576 to 9001.\n\nDefaults to 9001.",
		},
		"eniConfigLabelDef": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "Specifies the ENI_CONFIG_LABEL_DEF environment variable value for worker " +
				"nodes. This is used to tell Kubernetes to automatically apply the ENIConfig for " +
				"each Availability Zone\n" +
				"Ref: https://docs.aws.amazon.com/eks/latest/userguide/cni-custom-network.html " +
				"(step 5(c))\n\nDefaults to the official AWS CNI image in ECR.",
		},
		"enablePodEni": {
			TypeSpec: schema.TypeSpec{Type: "boolean"},
			Description: "Specifies whether to allow IPAMD to add the `vpc.amazonaws.com/has-trunk-attached` label to " +
				"the node if the instance has capacity to attach an additional ENI. Default is `false`. " +
				"If using liveness and readiness probes, you will also need to disable TCP early demux.",
		},
		"disableTcpEarlyDemux": {
			TypeSpec: schema.TypeSpec{Type: "boolean"},
			Description: "Allows the kubelet's liveness and readiness probes to connect via TCP when pod ENI is enabled." +
				" This will slightly increase local TCP connection latency.",
		},
		"cniConfigureRpfilter": {
			TypeSpec:    schema.TypeSpec{Type: "boolean"},
			Description: "Specifies whether ipamd should configure rp filter for primary interface. Default is `false`.",
		},
		"cniCustomNetworkCfg": {
			TypeSpec: schema.TypeSpec{Type: "boolean"},
			Description: "Specifies that your pods may use subnets and security groups that are independent of your " +
				"worker node's VPC configuration. By default, pods share the same subnet and security groups as the " +
				"worker node's primary interface. Setting this variable to true causes ipamd to use the security groups " +
				"and VPC subnet in a worker node's ENIConfig for elastic network interface allocation. You must create " +
				"an ENIConfig custom resource for each subnet that your pods will reside in, and then annotate or label " +
				"each worker node to use a specific ENIConfig (multiple worker nodes can be annotated or labelled with " +
				"the same ENIConfig). Worker nodes can only be annotated with a single ENIConfig at a time, and the " +
				"subnet in the ENIConfig must belong to the same Availability Zone that the worker node resides in. " +
				"For more information, see CNI Custom Networking in the Amazon EKS User Guide." +
				" Default is `false`",
		},
		"cniExternalSnat": {
			TypeSpec: schema.TypeSpec{Type: "boolean"},
			Description: "Specifies whether an external NAT gateway should be used to provide SNAT of secondary ENI IP " +
				"addresses. If set to true, the SNAT iptables rule and off-VPC IP rule are not applied, and these " +
				"rules are removed if they have already been applied. Disable SNAT if you need to allow inbound " +
				"communication to your pods from external VPNs, direct connections, and external VPCs, and your pods " +
				"do not need to access the Internet directly via an Internet Gateway. However, your nodes must be " +
				"running in a private subnet and connected to the internet through an AWS NAT Gateway or another " +
				"external NAT device. Default is `false`",
		},
		"securityContextPrivileged": {
			TypeSpec: schema.TypeSpec{Type: "boolean"},
			Description: "Pass privilege to containers securityContext. This is required when SELinux is enabled. " +
				"This value will not be passed to the CNI config by default",
		},
		"configurationValues": {
			TypeSpec: schema.TypeSpec{
				Type:                 "object",
				AdditionalProperties: &schema.TypeSpec{Ref: "pulumi.json#/Any"},
			},
			Description: "Custom configuration values for the vpc-cni addon. This object must match the schema derived from " +
				"[describe-addon-configuration]" +
				"(https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-configuration.html).",
		},
		"resolveConflictsOnCreate": {
			TypeSpec: schema.TypeSpec{Plain: true, Type: "string", Ref: "#/types/eks:index:ResolveConflictsOnCreate"},
			Description: "How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on. " +
				"Valid values are `NONE` and `OVERWRITE`. For more details see the " +
				"[CreateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html) API Docs.",
			Default: "OVERWRITE",
		},
		"resolveConflictsOnUpdate": {
			TypeSpec: schema.TypeSpec{Plain: true, Type: "string", Ref: "#/types/eks:index:ResolveConflictsOnUpdate"},
			Description: "How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from the " +
				"Amazon EKS default value.  Valid values are `NONE`, `OVERWRITE`, and `PRESERVE`. For more details see the " +
				"[UpdateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateAddon.html) API Docs.",
			Default: "OVERWRITE",
		},
		"serviceAccountRoleArn": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "The Amazon Resource Name (ARN) of an existing IAM role to bind to the add-on's service account. " +
				"The role must be assigned the IAM permissions required by the add-on. If you don't specify an existing IAM " +
				"role, then the add-on uses the permissions assigned to the node IAM role.\n\nFor more information, see " +
				"[Amazon EKS node IAM role](https://docs.aws.amazon.com/eks/latest/userguide/create-node-role.html) in the " +
				"Amazon EKS User Guide.\n\nNote: To specify an existing IAM role, you must have an IAM OpenID Connect (OIDC) " +
				"provider created for your cluster. For more information, see " +
				"[Enabling IAM roles for service accounts on your cluster]" +
				"(https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html) " +
				"in the Amazon EKS User Guide.",
		},
		"addonVersion": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "The version of the addon to use. If not specified, the latest version of the addon for the " +
				"cluster's Kubernetes version will be used.",
		},
		"enableNetworkPolicy": {
			TypeSpec: schema.TypeSpec{Type: "boolean"},
			Description: "Enables using Kubernetes network policies. In Kubernetes, by default, all pod-to-pod " +
				"communication is allowed. Communication can be restricted with Kubernetes NetworkPolicy objects.\n\n" +
				"See for more information: " +
				"[Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/).",
		},
	}

	if !cluster {
		props["clusterName"] = schema.PropertySpec{
			TypeSpec:    schema.TypeSpec{Type: "string"},
			Description: "The name of the EKS cluster.",
		}
		props["clusterVersion"] = schema.PropertySpec{
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "The Kubernetes version of the cluster. This is used to determine the addon version to use if " +
				"`addonVersion` is not specified.",
		}
		props["tags"] = schema.PropertySpec{
			TypeSpec: schema.TypeSpec{
				Type: "array",
				Items: &schema.TypeSpec{
					Type:                 "object",
					AdditionalProperties: &schema.TypeSpec{Type: "string"},
				},
			},
			Description: "Key-value map of resource tags. If configured with a provider default_tags configuration " +
				"block present, tags with matching keys will overwrite those defined at the provider-level.",
		}
	}

	return props
}

func rawMessage(v interface{}) schema.RawMessage {
	bytes, err := json.Marshal(v)
	contract.Assertf(err == nil, "failed to marshal raw message: %v", err)
	return bytes
}

func genNodejs(pkg *schema.Package, templateDir, outdir string) error {
	overlays := map[string][]byte{
		"clusterMixins.ts":      mustLoadFile(filepath.Join(templateDir, "clusterMixins.ts")),
		"nodegroupMixins.ts":    mustLoadFile(filepath.Join(templateDir, "nodegroupMixins.ts")),
		"storageclassMixins.ts": mustLoadFile(filepath.Join(templateDir, "storageclassMixins.ts")),
	}
	// Need to add the old enum types from `nodejs/eks` for backwards compatibility.
	// Marking as deprecated so that users know to use the new names
	for _, typ := range pkg.Types {
		if enum, ok := typ.(*schema.EnumType); ok {
			switch enum.Token {
			case "eks:index:AuthenticationMode":
				enum.Elements = append(enum.Elements,
					&schema.Enum{
						Name:               "CONFIG_MAP",
						Value:              "CONFIG_MAP",
						DeprecationMessage: "Use `ConfigMap` instead",
					},
					&schema.Enum{
						Name:               "API",
						Value:              "API",
						DeprecationMessage: "Use `Api` instead",
					},
					&schema.Enum{
						Name:               "API_AND_CONFIG_MAP",
						Value:              "API_AND_CONFIG_MAP",
						DeprecationMessage: "Use `ApiAndConfigMap` instead",
					},
				)
			case "eks:index:AccessEntryType":
				enum.Elements = append(enum.Elements,
					&schema.Enum{
						Value:              "STANDARD",
						DeprecationMessage: "Use `Standard` instead`",
						Name:               "STANDARD",
					},
					&schema.Enum{
						Value:              "FARGATE_LINUX",
						DeprecationMessage: "Use `FargateLinux` instead`",
						Name:               "FARGATE_LINUX",
					},
					&schema.Enum{
						Value:              "EC2_LINUX",
						DeprecationMessage: "Use `EC2Linux` instead`",
						Name:               "EC2_LINUX",
					},
					&schema.Enum{
						Value:              "EC2_WINDOWS",
						DeprecationMessage: "Use `EC2Windows` instead`",
						Name:               "EC2_WINDOWS",
					},
				)
			}
		}
	}
	files, err := nodejsgen.GeneratePackage(Tool, pkg, overlays, nil, false, nil)
	if err != nil {
		return err
	}
	mustWriteFiles(outdir, files)
	return nil
}

func genDotNet(pkg *schema.Package, outdir string) error {
	files, err := dotnetgen.GeneratePackage(Tool, pkg, map[string][]byte{}, map[string]string{})
	if err != nil {
		return err
	}
	mustWriteFiles(outdir, files)
	return nil
}

func genGo(pkg *schema.Package, outdir string) error {
	files, err := gogen.GeneratePackage(Tool, pkg, map[string]string{})
	if err != nil {
		return err
	}
	mustWriteFiles(outdir, files)
	return nil
}

func genPython(pkg *schema.Package, outdir string) error {
	files, err := pygen.GeneratePackage(Tool, pkg, map[string][]byte{}, nil)
	if err != nil {
		return err
	}
	mustWriteFiles(outdir, files)
	return nil
}

func mustWriteFiles(rootDir string, files map[string][]byte) {
	for filename, contents := range files {
		mustWriteFile(rootDir, filename, contents)
	}
}

func mustWriteFile(rootDir, filename string, contents []byte) {
	outPath := filepath.Join(rootDir, filename)

	if err := os.MkdirAll(filepath.Dir(outPath), 0755); err != nil {
		panic(err)
	}
	err := os.WriteFile(outPath, contents, 0600)
	if err != nil {
		panic(err)
	}
}

func mustWritePulumiSchema(pkgSpec schema.PackageSpec, outdir string) {
	schemaJSON, err := json.MarshalIndent(pkgSpec, "", "    ")
	if err != nil {
		panic(errors.Wrap(err, "marshaling Pulumi schema"))
	}
	mustWriteFile(outdir, "schema.json", schemaJSON)
}
func mustLoadFile(path string) []byte {
	b, err := os.ReadFile(path)
	if err != nil {
		panic(err)
	}
	return b
}
