import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

// IAM roles for the node groups.
const role = iam.createRole("managed-ng-os");

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("managed-ng-os", {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
});

// Create an EKS cluster.
const cluster = new eks.Cluster("managed-ng-os", {
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

// Create a simple AL 2023 node group with x64 instances
const managedNodeGroupAL2023 = eks.createManagedNodeGroup("al-2023-mng", {
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
});

// Create a simple AL 2023 node group with arm instances
const managedNodeGroupAL2023Arm = eks.createManagedNodeGroup("al-2023-arm-mng", {
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceTypes: ["t4g.medium"],
  nodeRole: role,
});

// Create a simple Bottlerocket node group with x64 instances
const managedNodeGroupBottlerocket = eks.createManagedNodeGroup("bottlerocket-mng", {
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
});

// Create a simple AL 2023 node group with arm instances
const managedNodeGroupBottlerocketArm = eks.createManagedNodeGroup("bottlerocket-arm-mng", {
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  instanceTypes: ["t4g.medium"],
  nodeRole: role,
});
