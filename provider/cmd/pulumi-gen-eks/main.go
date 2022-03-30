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
	"io/ioutil"
	"os"
	"path/filepath"

	"github.com/pkg/errors"
	dotnetgen "github.com/pulumi/pulumi/pkg/v3/codegen/dotnet"
	gogen "github.com/pulumi/pulumi/pkg/v3/codegen/go"
	pygen "github.com/pulumi/pulumi/pkg/v3/codegen/python"
	"github.com/pulumi/pulumi/pkg/v3/codegen/schema"
	"github.com/pulumi/pulumi/sdk/v3/go/common/util/contract"
)

const Tool = "pulumi-gen-eks"

// Language is the SDK language.
type Language string

const (
	DotNet Language = "dotnet"
	Go     Language = "go"
	Python Language = "python"
	Schema Language = "schema"
)

func main() {
	printUsage := func() {
		fmt.Printf("Usage: %s <language> <out-dir> [schema-file] [version]\n", os.Args[0])
	}

	args := os.Args[1:]
	if len(args) < 2 {
		printUsage()
		os.Exit(1)
	}

	language, outdir := Language(args[0]), args[1]

	var schemaFile string
	var version string
	if language != Schema {
		if len(args) < 4 {
			printUsage()
			os.Exit(1)
		}
		schemaFile, version = args[2], args[3]
	}

	switch language {
	case DotNet:
		genDotNet(readSchema(schemaFile, version), outdir)
	case Go:
		genGo(readSchema(schemaFile, version), outdir)
	case Python:
		genPython(readSchema(schemaFile, version), outdir)
	case Schema:
		pkgSpec := generateSchema()
		mustWritePulumiSchema(pkgSpec, outdir)
	default:
		panic(fmt.Sprintf("Unrecognized language %q", language))
	}
}

const (
	awsVersion = "v5.1.0"
	k8sVersion = "v3.0.0"
)

func awsRef(ref string) string {
	return fmt.Sprintf("/aws/%s/schema.json%s", awsVersion, ref)
}

func k8sRef(ref string) string {
	return fmt.Sprintf("/kubernetes/%s/schema.json%s", k8sVersion, ref)
}

// nolint: lll
func generateSchema() schema.PackageSpec {
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
							TypeSpec: schema.TypeSpec{Type: "string"},
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
					Description: "Cluster is a component that wraps the AWS and Kubernetes resources necessary to " +
						"run an EKS cluster, its worker nodes, its optional StorageClasses, and an optional " +
						"deployment of the Kubernetes Dashboard.",
					Properties: map[string]schema.PropertySpec{
						"kubeconfig": {
							TypeSpec:    schema.TypeSpec{Ref: "pulumi.json#/Any"},
							Description: "A kubeconfig that can be used to connect to the EKS cluster.",
						},
						"awsProvider": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/provider")},
							Description: "The AWS resource provider.",
						},
						"provider": {
							TypeSpec:    schema.TypeSpec{Ref: k8sRef("#/provider")},
							Description: "A Kubernetes resource provider that can be used to deploy into this cluster.",
						},
						"clusterSecurityGroup": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup")},
							Description: "The security group for the EKS cluster.",
						},
						"instanceRoles": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role")},
							},
							Description: "The service roles used by the EKS cluster.",
						},
						"nodeSecurityGroup": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup")},
							Description: "The security group for the cluster's nodes.",
						},
						"eksClusterIngressRule": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroupRule:SecurityGroupRule")},
							Description: "The ingress rule that gives node group access to cluster API server.",
						},
						"defaultNodeGroup": {
							TypeSpec: schema.TypeSpec{Ref: "#/types/eks:index:NodeGroupData"},
							Description: "The default Node Group configuration, or undefined if " +
								"`skipDefaultNodeGroup` was specified.",
						},
						"eksCluster": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:eks%2Fcluster:Cluster")},
							Description: "The EKS cluster.",
						},
						"core": {
							TypeSpec:    schema.TypeSpec{Ref: "#/types/eks:index:CoreData"},
							Description: "The EKS cluster and its dependencies.",
						},
					},
					Required: []string{
						"kubeconfig",
						"awsProvider",
						"provider",
						"clusterSecurityGroup",
						"instanceRoles",
						"nodeSecurityGroup",
						"eksClusterIngressRule",
						"eksCluster",
						"core",
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
							"Also consider setting `nodeAssociatePublicIpAddress: true` for fully private workers.",
					},
					"nodeGroupOptions": {
						TypeSpec:    schema.TypeSpec{Ref: "#/types/eks:index:ClusterNodeGroupOptions"},
						Description: "The common configuration settings for NodeGroups.",
					},
					"nodeAssociatePublicIpAddress": {
						TypeSpec: schema.TypeSpec{Type: "boolean"},
						Description: "Whether or not to auto-assign the EKS worker nodes public IP addresses. If " +
							"this toggle is set to true, the EKS workers will be auto-assigned public IPs. If false, " +
							"they will not be auto-assigned public IPs.",
					},
					"roleMappings": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Ref: "#/types/eks:index:RoleMapping"},
						},
						Description: "Optional mappings from AWS IAM roles to Kubernetes users and groups.",
					},
					"userMappings": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Ref: "#/types/eks:index:UserMapping"},
						},
						Description: "Optional mappings from AWS IAM users to Kubernetes users and groups.",
					},
					"vpcCniOptions": {
						TypeSpec: schema.TypeSpec{Ref: "#/types/eks:index:VpcCniOptions"},
						Description: "The configuration of the Amazon VPC CNI plugin for this instance. Defaults are " +
							"described in the documentation for the VpcCniOptions type.",
					},
					"useDefaultVpcCni": {
						TypeSpec:    schema.TypeSpec{Type: "boolean"},
						Description: "Use the default VPC CNI instead of creating a custom one. Should not be used in conjunction with `vpcCniOptions`.",
					},
					"instanceType": {
						TypeSpec:    schema.TypeSpec{Type: "string"}, // TODO: aws.ec2.InstanceType is a string enum.
						Description: "The instance type to use for the cluster's nodes. Defaults to \"t2.medium\".",
					},
					"instanceRole": {
						TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role")},
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
						TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role")},
						Description: "IAM Service Role for EKS to use to manage the cluster.",
					},
					"creationRoleProvider": {
						// Note: It'd be nice if we could pass the ClusterCreationRoleProvider component here.
						TypeSpec: schema.TypeSpec{Ref: "#/types/eks:index:CreationRoleProvider"},
						Description: "The IAM Role Provider used to create & authenticate against the EKS cluster. " +
							"This role is given `[system:masters]` permission in K8S, See: " +
							"https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html",
					},
					"instanceRoles": {
						TypeSpec: schema.TypeSpec{
							Type:  "array",
							Items: &schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role")},
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
						TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup")},
						Description: "The security group to use for the cluster API endpoint. If not provided, a new " +
							"security group will be created with full internet egress and ingress from node groups.",
					},
					"clusterSecurityGroupTags": {
						TypeSpec: schema.TypeSpec{
							Type:                 "object",
							AdditionalProperties: &schema.TypeSpec{Type: "string"},
						},
						Description: "The tags to apply to the cluster security group.",
					},
					"encryptRootBlockDevice": {
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
						Default:     20,
					},
					"nodeRootVolumeDeleteOnTermination": {
						TypeSpec:    schema.TypeSpec{Type: "boolean"},
						Description: "Whether to delete a cluster node's root volume on termination. Defaults to true.",
						Default:     true,
					},
					"nodeRootVolumeEncrypted": {
						TypeSpec:    schema.TypeSpec{Type: "boolean"},
						Description: "Whether to encrypt a cluster node's root volume. Defaults to false.",
						Default:     false,
					},
					"nodeRootVolumeIops": {
						TypeSpec:    schema.TypeSpec{Type: "integer"},
						Description: "Provisioned IOPS for a cluster node's root volume. Only valid for io1 volumes.",
					},
					"nodeRootVolumeThroughput": {
						TypeSpec:    schema.TypeSpec{Type: "integer"},
						Description: "Provisioned throughput performance in integer MiB/s for a cluster node's root volume. Only valid for gp3 volumes.",
					},
					"nodeRootVolumeType": {
						TypeSpec:    schema.TypeSpec{Type: "string"},
						Description: "Configured EBS type for a cluster node's root volume. Default is gp2.",
						Default:     "gp2",
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
								{Type: "string"}, // TODO: EBSVolumeType enum "io1" | "gp2" | "sc1" | "st1"
								{Type: "object", AdditionalProperties: &schema.TypeSpec{Ref: "#/types/eks:index:StorageClass"}},
							},
						},
						Description: "An optional set of StorageClasses to enable for the cluster. If this is a " +
							"single volume type rather than a map, a single StorageClass will be created for that " +
							"volume type.\n\n" +
							"Note: As of Kubernetes v1.11+ on EKS, a default `gp2` storage class will always be " +
							"created automatically for the cluster by the EKS service. See " +
							"https://docs.aws.amazon.com/eks/latest/userguide/storage-classes.html",
					},
					"skipDefaultNodeGroup": {
						TypeSpec: schema.TypeSpec{Type: "boolean"},
						Description: "If this toggle is set to true, the EKS cluster will be created without node " +
							"group attached. Defaults to false, unless `fargate` input is provided.",
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
							" - https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/aws/eks/#enabling-iam-roles-for-service-accounts",
					},
					"name": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "The cluster's physical resource name.\n\nIf not specified, the default is to " +
							"use auto-naming for the cluster's name, resulting in a physical name with the format " +
							"`${name}-eksCluster-0123abcd`.\n\nSee for more details: " +
							"https://www.pulumi.com/docs/intro/concepts/programming-model/#autonaming",
					},
					"proxy": {
						TypeSpec: schema.TypeSpec{Type: "string"},
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
							"- https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/aws/#Provider\n" +
							"- https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/\n" +
							"- https://www.pulumi.com/docs/intro/cloud-providers/aws/#configuration\n" +
							"- https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html",
					},
					"encryptionConfigKeyArn": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "KMS Key ARN to use with the encryption configuration for the cluster.\n\n" +
							"Only available on Kubernetes 1.13+ clusters created after March 6, 2020.\n" +
							"See for more details:\n" +
							"- https://aws.amazon.com/about-aws/whats-new/2020/03/amazon-eks-adds-envelope-encryption-for-secrets-with-aws-kms/",
					},
					"kubernetesServiceIpAddressRange": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "The CIDR block to assign Kubernetes service IP addresses from. If you don't\n" +
							"specify a block, Kubernetes assigns addresses from either the 10.100.0.0/16 or\n" +
							"172.20.0.0/16 CIDR blocks. We recommend that you specify a block that does not overlap\n" +
							"with resources in other networks that are peered or connected to your VPC. You can only specify\n" +
							"a custom CIDR block when you create a cluster, changing this value will force a new cluster to be created.\n\n" +
							"The block must meet the following requirements:\n" +
							"- Within one of the following private IP address blocks: 10.0.0.0/8, 172.16.0.0.0/12, or 192.168.0.0/16.\n" +
							"- Doesn't overlap with any CIDR block assigned to the VPC that you selected for VPC.\n" +
							"- Between /24 and /12." +
							"",
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
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role")},
						},
						"provider": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/provider")},
						},
					},
					Required: []string{
						"role",
						"provider",
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
					Description: "ManagedNodeGroup is a component that wraps creating an AWS managed node group.\n\n" +
						"See for more details:\n" +
						"https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html",
					Properties: map[string]schema.PropertySpec{
						"nodeGroup": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:eks%2FnodeGroup:NodeGroup")},
							Description: "The AWS managed node group.",
						},
					},
					Required: []string{
						"nodeGroup",
					},
				},
				InputProperties: map[string]schema.PropertySpec{
					"cluster": {
						// Note: this is typed as `Cluster | CoreData` in the TS API. Ideally, the Cluster could be
						// passed directly.
						TypeSpec:    schema.TypeSpec{Ref: "#/types/eks:index:CoreData"},
						Description: "The target EKS cluster.",
					},
					// The following inputs are based on `aws.eks.NodeGroupArgs`, with the following properties made
					// optional since they can be set based on the passed-in `cluster` (clusterName, subnetIds,
					// and scalingConfig). `nodeRoleArn` is also now optional with convenience `nodeRole` input added.
					"amiType": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "Type of Amazon Machine Image (AMI) associated with the EKS Node Group. " +
							"Defaults to `AL2_x86_64`. Valid values: `AL2_x86_64`, `AL2_x86_64_GPU`, `AL2_ARM_64`. " +
							"This provider will only perform drift detection if a configuration value is provided.",
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
						TypeSpec:    schema.TypeSpec{Ref: awsRef("#/types/aws:eks%2FNodeGroupLaunchTemplate:NodeGroupLaunchTemplate")},
						Description: "Launch Template settings.",
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
						TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role")},
						Description: "The IAM Role that provides permissions for the EKS Node Group.\n\n" +
							"Note, `nodeRole` and `nodeRoleArn` are mutually exclusive, and a single option must be " +
							"used.",
					},
					"releaseVersion": {
						TypeSpec:    schema.TypeSpec{Type: "string"},
						Description: "AMI version of the EKS Node Group. Defaults to latest version for Kubernetes version.",
					},
					"remoteAccess": {
						TypeSpec:    schema.TypeSpec{Ref: awsRef("#/types/aws:eks%2FNodeGroupRemoteAccess:NodeGroupRemoteAccess")},
						Description: "Remote access settings.",
					},
					"scalingConfig": {
						TypeSpec: schema.TypeSpec{Ref: awsRef("#/types/aws:eks%2FNodeGroupScalingConfig:NodeGroupScalingConfig")},
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
							Items: &schema.TypeSpec{Ref: awsRef("#/types/aws:eks%2FNodeGroupTaint:NodeGroupTaint")},
						},
						Description: "The Kubernetes taints to be applied to the nodes in the node group. Maximum of 50 taints per node group.",
					},
					"version": {
						TypeSpec: schema.TypeSpec{Type: "string"},
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
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup")},
							Description: "The security group for the node group to communicate with the cluster.",
						},
						"extraNodeSecurityGroups": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup")},
							},
							Description: "The additional security groups for the node group that captures user-specific rules.",
						},
						"cfnStack": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:cloudformation%2Fstack:Stack")},
							Description: "The CloudFormation Stack which defines the Node AutoScalingGroup.",
						},
						"autoScalingGroupName": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The AutoScalingGroup name for the Node group.",
						},
					},
					Required: []string{
						"nodeSecurityGroup",
						"extraNodeSecurityGroups",
						"cfnStack",
						"autoScalingGroupName",
					},
				},
				InputProperties: nodeGroupProperties(true /*cluster*/),
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
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup")},
							Description: "The security group for node groups with the default ingress & egress rules " +
								"required to connect and work with the EKS cluster security group.",
						},
						"securityGroupRule": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroupRule:SecurityGroupRule")},
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
						TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup")},
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
						TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:eks%2Fcluster:Cluster")},
						Description: "The EKS cluster associated with the worker node group",
					},
				},
				RequiredInputs: []string{
					"vpcId",
					"clusterSecurityGroup",
					"eksCluster",
				},
			},
			// The TypeScript library exports this at the top-level index.ts, so we expose it here. Although, it's not
			// super useful on its own, so we could consider *not* exposing it to the other languages.
			// Note that this is a _custom_ resource (not a component), implemented in the provider plugin.
			// Previously it was implemented as a dynamic provider.
			"eks:index:VpcCni": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Description: "VpcCni manages the configuration of the Amazon VPC CNI plugin for Kubernetes by " +
						"applying its YAML chart.",
				},
				InputProperties: vpcCniProperties(true /*kubeconfig*/),
				RequiredInputs:  []string{"kubeconfig"},
			},
		},

		Types: map[string]schema.ComplexTypeSpec{
			"eks:index:CoreData": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: "Defines the core set of data associated with an EKS cluster, including the network in which it runs.",
					Properties: map[string]schema.PropertySpec{
						"cluster": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:eks%2Fcluster:Cluster")},
						},
						"vpcId": {
							TypeSpec: schema.TypeSpec{Type: "string"},
						},
						"subnetIds": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Type: "string"},
							},
						},
						"endpoint": {
							TypeSpec: schema.TypeSpec{Type: "string"},
						},
						"clusterSecurityGroup": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup")},
						},
						"provider": {
							TypeSpec: schema.TypeSpec{Ref: k8sRef("#/provider")},
						},
						"instanceRoles": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role")},
							},
						},
						"nodeGroupOptions": {
							TypeSpec: schema.TypeSpec{Ref: "#/types/eks:index:ClusterNodeGroupOptions"},
						},
						"awsProvider": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/provider")},
						},
						"publicSubnetIds": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Type: "string"},
							},
						},
						"privateSubnetIds": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Type: "string"},
							},
						},
						"eksNodeAccess": {
							TypeSpec: schema.TypeSpec{Ref: k8sRef("#/resources/kubernetes:core%2Fv1:ConfigMap")},
						},
						"storageClasses": {
							TypeSpec: schema.TypeSpec{
								Type:                 "object",
								AdditionalProperties: &schema.TypeSpec{Ref: k8sRef("#/resources/kubernetes:storage.k8s.io%2Fv1:StorageClass")},
							},
						},
						"kubeconfig": {
							TypeSpec: schema.TypeSpec{Ref: "pulumi.json#/Any"},
						},
						"vpcCni": {
							TypeSpec: schema.TypeSpec{Ref: "#/resources/eks:index:VpcCni"},
						},
						"tags": {
							TypeSpec: schema.TypeSpec{
								Type:                 "object",
								AdditionalProperties: &schema.TypeSpec{Type: "string"},
							},
						},
						"nodeSecurityGroupTags": {
							TypeSpec: schema.TypeSpec{
								Type:                 "object",
								AdditionalProperties: &schema.TypeSpec{Type: "string"},
							},
						},
						"fargateProfile": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:eks%2FfargateProfile:FargateProfile")},
						},
						"oidcProvider": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2FopenIdConnectProvider:OpenIdConnectProvider")},
						},
						"encryptionConfig": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/types/aws:eks%2FClusterEncryptionConfig:ClusterEncryptionConfig")},
						},
					},
					Required: []string{
						"cluster",
						"vpcId",
						"subnetIds",
						"endpoint",
						"clusterSecurityGroup",
						"provider",
						"instanceRoles",
						"nodeGroupOptions",
					},
				},
			},
			"eks:index:CreationRoleProvider": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "object",
					Description: "Contains the AWS Role and Provider necessary to override the `[system:master]` " +
						"entity ARN. This is an optional argument used when creating `Cluster`. Read more: " +
						"https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html",
					Properties: map[string]schema.PropertySpec{
						"role": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2Frole:Role")},
						},
						"provider": {
							TypeSpec: schema.TypeSpec{Ref: awsRef("#/provider")},
						},
					},
					Required: []string{
						"role",
						"provider",
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
								Items: &schema.TypeSpec{Ref: awsRef("#/types/aws:eks%2FFargateProfileSelector:FargateProfileSelector")},
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
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup")},
							Description: "The security group for the node group to communicate with the cluster.",
						},
						"extraNodeSecurityGroups": {
							TypeSpec: schema.TypeSpec{
								Type:  "array",
								Items: &schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup")},
							},
							Description: "The additional security groups for the node group that captures user-specific rules.",
						},
						"cfnStack": {
							TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:cloudformation%2Fstack:Stack")},
							Description: "The CloudFormation Stack which defines the Node AutoScalingGroup.",
						},
						"autoScalingGroupName": {
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The AutoScalingGroup name for the node group.",
						},
					},
					Required: []string{
						"nodeSecurityGroup",
						"extraNodeSecurityGroups",
						"cfnStack",
						"autoScalingGroupName",
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
							TypeSpec: schema.TypeSpec{Ref: k8sRef("#/types/kubernetes:meta%2Fv1:ObjectMeta")},
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
							TypeSpec:    schema.TypeSpec{Type: "string"},
							Description: "The value of the taint.",
						},
						"effect": {
							TypeSpec:    schema.TypeSpec{Type: "string"}, // TODO strict string enum: "NoSchedule" | "NoExecute" | "PreferNoSchedule".
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
					Properties:  nodeGroupProperties(false /*cluster*/),
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
					Properties:  vpcCniProperties(false /*kubeconfig*/),
				},
			},
		},

		Language: map[string]schema.RawMessage{
			"csharp": rawMessage(map[string]interface{}{
				"packageReferences": map[string]string{
					"Pulumi":            "3.*",
					"Pulumi.Aws":        "5.*",
					"Pulumi.Kubernetes": "3.*",
				},
				"liftSingleValueMethodReturns": true,
			}),
			"python": rawMessage(map[string]interface{}{
				"requires": map[string]string{
					"pulumi":            ">=3.0.0,<4.0.0",
					"pulumi-aws":        ">=5.0.0,<6.0.0",
					"pulumi-kubernetes": ">=3.0.0,<4.0.0",
				},
				"usesIOClasses": true,
				// TODO: Embellish the readme
				"readme":                       "Pulumi Amazon Web Services (AWS) EKS Components.",
				"liftSingleValueMethodReturns": true,
			}),
			"go": rawMessage(map[string]interface{}{
				"generateResourceContainerTypes": true,
				"importBasePath":                 "github.com/pulumi/pulumi-eks/sdk/go/eks",
				"liftSingleValueMethodReturns":   true,
			}),
		},
	}
}

func nodeGroupProperties(cluster bool) map[string]schema.PropertySpec {
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
			Description: "The instance type to use for the cluster's nodes. Defaults to \"t2.medium\".",
		},
		"spotPrice": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "Bidding price for spot instance. If set, only spot instances will be added as " +
				"worker node.",
		},
		"nodeSecurityGroup": {
			TypeSpec: schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup")},
			Description: "The security group for the worker node group to communicate with the cluster.\n\n" +
				"This security group requires specific inbound and outbound rules.\n\n" +
				"See for more details:\n" +
				"https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html\n\n" +
				"Note: The `nodeSecurityGroup` option and the cluster option`nodeSecurityGroupTags` are " +
				"mutually exclusive.",
		},
		"clusterIngressRule": {
			TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroupRule:SecurityGroupRule")},
			Description: "The ingress rule that gives node group access.",
		},
		"extraNodeSecurityGroups": {
			TypeSpec: schema.TypeSpec{
				Type:  "array",
				Items: &schema.TypeSpec{Ref: awsRef("#/resources/aws:ec2%2FsecurityGroup:SecurityGroup")},
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
				Type:                 "object",
				AdditionalProperties: &schema.TypeSpec{Type: "string"},
			},
			Description: "Custom k8s node labels to be attached to each worker node. Adds the given " +
				"key/value pairs to the `--node-labels` kubelet argument.",
		},
		"taints": {
			TypeSpec: schema.TypeSpec{
				Type:                 "object",
				AdditionalProperties: &schema.TypeSpec{Ref: "#/types/eks:index:Taint"},
			},
			Description: "Custom k8s node taints to be attached to each worker node. Adds the given " +
				"taints to the `--register-with-taints` kubelet argument",
		},
		"kubeletExtraArgs": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "Extra args to pass to the Kubelet. Corresponds to the options passed in the " +
				"`--kubeletExtraArgs` flag to `/etc/eks/bootstrap.sh`. For example, " +
				"'--port=10251 --address=0.0.0.0'. Note that the `labels` and `taints` properties will " +
				"be applied to this list (using `--node-labels` and `--register-with-taints` " +
				"respectively) after to the explicit `kubeletExtraArgs`.",
		},
		"bootstrapExtraArgs": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "Additional args to pass directly to `/etc/eks/bootstrap.sh`. For details on " +
				"available options, see: " +
				"https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh. " +
				"Note that the `--apiserver-endpoint`, `--b64-cluster-ca` and `--kubelet-extra-args` " +
				"flags are included automatically based on other configuration parameters.",
		},
		"nodeAssociatePublicIpAddress": {
			TypeSpec: schema.TypeSpec{Type: "boolean"},
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
			TypeSpec:    schema.TypeSpec{Ref: awsRef("#/resources/aws:iam%2FinstanceProfile:InstanceProfile")},
			Description: "The ingress rule that gives node group access.",
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
	}

	if cluster {
		props["cluster"] = schema.PropertySpec{
			// TODO: this is typed as `Cluster | CoreData` in the TS API.
			TypeSpec:    schema.TypeSpec{Ref: "#/types/eks:index:CoreData"},
			Description: "The target EKS cluster.",
		}
	}

	return props
}

// vpcCniProperties returns a map of properties that can be used by either the VpcCni resource or VpcCniOptions type.
// When kubeconfig is set to true, the kubeconfig property is included in the map (for the VpcCni resource).
func vpcCniProperties(kubeconfig bool) map[string]schema.PropertySpec {
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
		"image": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "Specifies the container image to use in the AWS CNI cluster DaemonSet.\n\n" +
				"Defaults to the official AWS CNI image in ECR.",
		},
		"initImage": {
			TypeSpec: schema.TypeSpec{Type: "string"},
			Description: "Specifies the init container image to use in the AWS CNI cluster DaemonSet.\n\n" +
				"Defaults to the official AWS CNI init container image in ECR.",
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
	}

	if kubeconfig {
		props["kubeconfig"] = schema.PropertySpec{
			TypeSpec:    schema.TypeSpec{Ref: "pulumi.json#/Any"},
			Description: "The kubeconfig to use when setting the VPC CNI options.",
		}
	}

	return props
}

func rawMessage(v interface{}) schema.RawMessage {
	bytes, err := json.Marshal(v)
	contract.Assert(err == nil)
	return bytes
}

func readSchema(schemaPath string, version string) *schema.Package {
	// Read in, decode, and import the schema.
	schemaBytes, err := ioutil.ReadFile(schemaPath)
	if err != nil {
		panic(err)
	}

	var pkgSpec schema.PackageSpec
	if err = json.Unmarshal(schemaBytes, &pkgSpec); err != nil {
		panic(err)
	}
	pkgSpec.Version = version

	pkg, err := schema.ImportSpec(pkgSpec, nil)
	if err != nil {
		panic(err)
	}
	return pkg
}

func genDotNet(pkg *schema.Package, outdir string) {
	files, err := dotnetgen.GeneratePackage(Tool, pkg, map[string][]byte{})
	if err != nil {
		panic(err)
	}
	mustWriteFiles(outdir, files)
}

func genGo(pkg *schema.Package, outdir string) {
	files, err := gogen.GeneratePackage(Tool, pkg)
	if err != nil {
		panic(err)
	}
	mustWriteFiles(outdir, files)
}

func genPython(pkg *schema.Package, outdir string) {
	files, err := pygen.GeneratePackage(Tool, pkg, map[string][]byte{})
	if err != nil {
		panic(err)
	}
	mustWriteFiles(outdir, files)
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
	err := ioutil.WriteFile(outPath, contents, 0600)
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
