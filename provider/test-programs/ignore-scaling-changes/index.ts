
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

const config = new pulumi.Config();
const desiredSize = config.requireNumber("desiredSize");

// IAM roles for the node groups.
const mngRole = iam.createRole("ignore-scaling-config-mng");
const ngV2Role = iam.createRole("ignore-scaling-config-ngv2");

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("ignore-scaling-config", {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
});

// Create an EKS cluster.
const cluster = new eks.Cluster("ignore-scaling-config", {
  skipDefaultNodeGroup: true,
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.API,
  // Public subnets will be used for load balancers
  publicSubnetIds: eksVpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: eksVpc.privateSubnetIds,
  accessEntries: {
    ngV2: {
      principalArn: ngV2Role.arn,
      type: eks.AccessEntryType.EC2_LINUX,
    },
  },
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Create a simple AL 2023 node group with x64 instances
const mng = eks.createManagedNodeGroup("ignore-scaling-config-mng", {
  scalingConfig: {
    minSize: 1,
    maxSize: 3,
    desiredSize,
  },
  ignoreScalingChanges: true,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceTypes: ["t3.medium"],
  nodeRole: mngRole,
});

const ngV2 = new eks.NodeGroupV2("ignore-scaling-config-ngv2", {
  minSize: 1,
  maxSize: 3,
  desiredCapacity: desiredSize,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceProfile: new aws.iam.InstanceProfile("ignore-scaling-config-ngv2", {role: ngV2Role}),
  ignoreScalingChanges: true,
});
