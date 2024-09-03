import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

// IAM roles for the node groups.
const role = iam.createRole("self-managed-ng-os");
const instanceProfile = new aws.iam.InstanceProfile("self-managed-ng-os", {role: role});

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("self-managed-ng-os", {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
});

// Create an EKS cluster.
const cluster = new eks.Cluster("self-managed-ng-os", {
  skipDefaultNodeGroup: true,
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.API,
  // Public subnets will be used for load balancers
  publicSubnetIds: eksVpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: eksVpc.privateSubnetIds,
  accessEntries: {
    instances: {
      principalArn: role.arn,
      type: eks.AccessEntryType.EC2_LINUX,
    }
  },

  // Needed for AL2023 until the CNI is managed with an addon because our custom CNI is too old
  useDefaultVpcCni: true,
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

const nodeGroupAL2023V1 = new eks.NodeGroup("al-2023-v1-ng", {
  cluster: cluster,
  instanceType: "t3.medium",
  desiredCapacity: 1,
  minSize: 1,
  maxSize: 2,
  operatingSystem: eks.OperatingSystem.AL2023,
  labels: {"ondemand": "true"},
  instanceProfile: instanceProfile,
});

const nodeGroupAL2023 = new eks.NodeGroupV2("al-2023-ng", {
  cluster: cluster,
  instanceType: "t3.medium",
  desiredCapacity: 1,
  minSize: 1,
  maxSize: 2,
  operatingSystem: eks.OperatingSystem.AL2023,
  labels: {"ondemand": "true"},
  instanceProfile: instanceProfile,
});

const nodeGroupAL2023Arm = new eks.NodeGroupV2("al-2023-ng-arm", {
  cluster: cluster,
  instanceType: "t4g.medium",
  desiredCapacity: 1,
  minSize: 1,
  maxSize: 2,
  operatingSystem: eks.OperatingSystem.AL2023,
  labels: {"ondemand": "true"},
  instanceProfile: instanceProfile,
});