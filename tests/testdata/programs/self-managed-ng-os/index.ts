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

const baseSettings = {
  desiredCapacity: 1,
  minSize: 1,
  maxSize: 1,
  subnetIds: eksVpc.privateSubnetIds,
}

const nodeGroupAL2023V1 = new eks.NodeGroup("al-2023-v1-ng", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  labels: {"ondemand": "true"},
  instanceProfile: instanceProfile,
});

const nodeGroupAL2023V1Storage = new eks.NodeGroup("al-2023-v1-storage-ng", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceProfile: instanceProfile,
  labels: {"increased-storage-capacity": "true"},
  nodeRootVolumeSize: 100,
});

const nodeGroupAL2023V1Userdata = new eks.NodeGroup("al-2023-v1-userdata-ng", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  labels: {"increased-pod-capacity": "true"},
  kubeletExtraArgs: "--max-pods=100",
  instanceProfile: instanceProfile,
});

const nodeGroupBottlerocketV1 = new eks.NodeGroup("bottlerocket-v1-ng", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  instanceProfile: instanceProfile,
});

const nodeGroupBottlerocketV1Storage = new eks.NodeGroup("bottlerocket-v1-storage-ng", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  instanceProfile: instanceProfile,
  labels: {"increased-storage-capacity": "true"},
  nodeRootVolumeSize: 100,
});

const nodeGroupBottlerocketV1Userdata = new eks.NodeGroup("bottlerocket-v1-userdata-ng", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  labels: {"increased-pod-capacity": "true"},
  instanceProfile: instanceProfile,
  bottlerocketSettings: {
    settings: {
      kubernetes: {
        "max-pods": 100,
      },
    },
  },
});

const nodeGroupAL2023 = new eks.NodeGroupV2("al-2023-ng", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  labels: {"ondemand": "true"},
  instanceProfile: instanceProfile,
});

const nodeGroupAL2023Storage = new eks.NodeGroupV2("al-2023-storage-ng", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  nodeRootVolumeSize: 100,
  labels: {"increased-storage-capacity": "true"},
  instanceProfile: instanceProfile,
});

const nodeGroupAL2023Userdata = new eks.NodeGroupV2("al-2023-userdata-ng", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  labels: {"increased-pod-capacity": "true"},
  kubeletExtraArgs: "--max-pods=100",
  instanceProfile: instanceProfile,
});

const nodeGroupAL2023Arm = new eks.NodeGroupV2("al-2023-ng-arm", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t4g.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  labels: {"ondemand": "true"},
  instanceProfile: instanceProfile,
});

const nodeGroupBottlerocket = new eks.NodeGroupV2("bottlerocket-ng", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  labels: {"ondemand": "true"},
  instanceProfile: instanceProfile,
});

const nodeGroupBottlerocketStorage = new eks.NodeGroupV2("bottlerocket-storage-ng", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  labels: {"increased-storage-capacity": "true"},
  nodeRootVolumeSize: 100,
  instanceProfile: instanceProfile,
});

const nodeGroupBottlerocketArm = new eks.NodeGroupV2("bottlerocket-ng-arm", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t4g.medium",
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  labels: {"ondemand": "true"},
  instanceProfile: instanceProfile,
});

const nodeGroupBottlerocketUserdata = new eks.NodeGroupV2("bottlerocket-userdata-ng", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  labels: {"increased-pod-capacity": "true"},
  instanceProfile: instanceProfile,
  bottlerocketSettings: {
    settings: {
      kubernetes: {
        "max-pods": 100,
      },
    },
  },
});

const nodegroupWithSecurityGroupId = new eks.NodeGroup("ng-security-group-id", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t3.medium",
  instanceProfile: instanceProfile,
  nodeSecurityGroupId: cluster.nodeSecurityGroupId,
  clusterIngressRuleId: cluster.clusterIngressRuleId,
});

const nodegroupV2WithSecurityGroupId = new eks.NodeGroupV2("ng-security-group-id", {
  ...baseSettings,
  cluster: cluster,
  instanceType: "t3.medium",
  instanceProfile: instanceProfile,
  nodeSecurityGroupId: cluster.nodeSecurityGroupId,
  clusterIngressRuleId: cluster.clusterIngressRuleId,
});

export const standardNodeSecurityGroup = nodeGroupAL2023V1.nodeSecurityGroup;
export const standardNodeSecurityGroupId = nodeGroupAL2023V1.nodeSecurityGroupId;
export const standardNodeSecurityGroupV2 = nodeGroupAL2023.nodeSecurityGroup;
export const standardNodeSecurityGroupIdV2 = nodeGroupAL2023.nodeSecurityGroupId;

export const clusterNodeSecurityGroupId = cluster.nodeSecurityGroupId;
export const customNodeSecurityGroup = nodegroupWithSecurityGroupId.nodeSecurityGroup;
export const customNodeSecurityGroupId = nodegroupWithSecurityGroupId.nodeSecurityGroupId;
export const customNodeSecurityGroupV2 = nodegroupV2WithSecurityGroupId.nodeSecurityGroup;
export const customNodeSecurityGroupIdV2 = nodegroupV2WithSecurityGroupId.nodeSecurityGroupId;
