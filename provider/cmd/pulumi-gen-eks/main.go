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
	"regexp"

	"github.com/pkg/errors"
	dotnetgen "github.com/pulumi/pulumi/pkg/v2/codegen/dotnet"
	pygen "github.com/pulumi/pulumi/pkg/v2/codegen/python"
	"github.com/pulumi/pulumi/pkg/v2/codegen/schema"
	"github.com/pulumi/pulumi/sdk/v2/go/common/util/contract"
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
		panic("go support is coming soon")
	case Python:
		genPython(readSchema(schemaFile, version), outdir)
	case Schema:
		pkgSpec := generateSchema()
		mustWritePulumiSchema(pkgSpec, outdir)
	default:
		panic(fmt.Sprintf("Unrecognized language %q", language))
	}
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

		Resources: map[string]schema.ResourceSpec{
			"eks:index:Cluster": {
				IsComponent: true,
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type: "object",
					Description: "Cluster is a component that wraps the AWS and Kubernetes resources necessary to " +
						"run an EKS cluster, its worker nodes, its optional StorageClasses, and an optional " +
						"deployment of the Kubernetes Dashboard.",
					Properties: map[string]schema.PropertySpec{
						"kubeconfig": {
							TypeSpec:    schema.TypeSpec{Ref: "pulumi.json#/Any"},
							Description: "A kubeconfig that can be used to connect to the EKS cluster.",
						},
						// TODO: public readonly awsProvider: pulumi.ProviderResource;
						// TODO: public readonly provider: k8s.Provider;
						// TODO: public readonly clusterSecurityGroup: aws.ec2.SecurityGroup;
						// TODO: public readonly instanceRoles: pulumi.Output<aws.iam.Role[]>;
						// TODO: public readonly nodeSecurityGroup: aws.ec2.SecurityGroup;
						// TODO: public readonly eksClusterIngressRule: aws.ec2.SecurityGroupRule;
						// TODO: public readonly defaultNodeGroup: NodeGroupData | undefined;
						// TODO: public readonly eksCluster: aws.eks.Cluster;
						// TODO: public readonly core: CoreData;
					},
					Required: []string{
						"kubeconfig",
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
					// TODO: nodeGroupOptions?: ClusterNodeGroupOptions;
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
					// TODO: instanceType?: pulumi.Input<aws.ec2.InstanceType>;
					// TODO: instanceRole?: pulumi.Input<aws.iam.Role>;
					"instanceProfileName": {
						TypeSpec: schema.TypeSpec{Type: "string"},
						Description: "The default IAM InstanceProfile to use on the Worker NodeGroups, if one is not " +
							"already set in the NodeGroup.",
					},
					// TODO: serviceRole?: pulumi.Input<aws.iam.Role>;
					// TODO: creationRoleProvider?: CreationRoleProvider;
					// TODO: instanceRoles?: pulumi.Input<pulumi.Input<aws.iam.Role>[]>;
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
					// TODO: clusterSecurityGroup?: aws.ec2.SecurityGroup;
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
					// TODO: storageClasses?: { [name: string]: StorageClass } | EBSVolumeType;
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
							Type: "boolean",
							OneOf: []schema.TypeSpec{
								{Type: "boolean"},
								{Type: "boolean", Ref: "#/types/eks:index:FargateProfile"},
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
				},
			},
		},

		Types: map[string]schema.ComplexTypeSpec{
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
						// TODO: selectors?: pulumi.Input<pulumi.Input<aws.types.input.eks.FargateProfileSelector>[]>;
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
			"eks:index:VpcCniOptions": {
				ObjectTypeSpec: schema.ObjectTypeSpec{
					Type:        "object",
					Description: "Describes the configuration options available for the Amazon VPC CNI plugin for Kubernetes.",
					Properties: map[string]schema.PropertySpec{
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
						"logLevel": {
							TypeSpec: schema.TypeSpec{Type: "string"}, // TODO consider typing this as an enum
							Description: "Specifies the log level used for logs.\n\nDefaults to \"DEBUG\"\nSee more " +
								"options: https://git.io/fj92K", // TODO this URL is broken.
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
					},
				},
			},
		},

		Language: map[string]json.RawMessage{
			"csharp": rawMessage(map[string]interface{}{
				"packageReferences": map[string]string{
					"Pulumi":            "2.*",
					"Pulumi.Aws":        "3.*",
					"Pulumi.Kubernetes": "2.*",
				},
			}),
			"python": rawMessage(map[string]interface{}{
				"requires": map[string]string{
					"pulumi":            ">=2.12.0,<3.0.0",
					"pulumi-aws":        ">=3.2.0,<4.0.0",
					"pulumi-kubernetes": ">=2.0.0,<3.0.0",
				},
				"usesIOClasses": true,
				// TODO: Embellish the readme
				"readme": "Pulumi Amazon Web Services (AWS) EKS Components.",
			}),
		},
	}
}

func rawMessage(v interface{}) json.RawMessage {
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

	// The .NET code generator emits a Provider class that we don't need, so remove it.
	// This should be an option passed to the code generator, but we'll make the tweak here for now.
	delete(files, "Provider.cs")

	mustWriteFiles(outdir, files)
}

func genPython(pkg *schema.Package, outdir string) {
	files, err := pygen.GeneratePackage(Tool, pkg, map[string][]byte{})
	if err != nil {
		panic(err)
	}

	// The Python code generator emits a Provider resource that we don't need, so remove it.
	// This should be an option passed to the code generator, but we'll make the tweak here for now.
	const init = "pulumi_eks/__init__.py"
	if bytes, ok := files[init]; ok {
		code := string(bytes)
		code = regexp.MustCompile(`(?m)from \.provider.*$`).ReplaceAllString(code, "")
		files[init] = []byte(code)
	}
	delete(files, "pulumi_eks/provider.py")

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
