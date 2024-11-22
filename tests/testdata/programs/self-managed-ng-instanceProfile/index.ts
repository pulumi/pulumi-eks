import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

// IAM roles for the node groups.
const role = iam.createRole("ng-instanceProfile-test");
const instanceProfile = new aws.iam.InstanceProfile("ng-instanceProfile-test", {role: role});

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("ng-instanceProfile-test", {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
  natGateways: {
    strategy: awsx.ec2.NatGatewayStrategy.Single
  }
});

// Cluster that is not passed an instanceProfile or instanceProfileName
// and that does not create a default NodeGroupV2
const cluster_NoIp_NoIpn = new eks.Cluster("cluster-noIp-noIpn", {
  skipDefaultNodeGroup: true,
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.Api,
  // Public subnets will be used for load balancers
  publicSubnetIds: eksVpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: eksVpc.privateSubnetIds,
  accessEntries: {
    instances: {
      principalArn: role.arn,
      type: eks.AccessEntryType.EC2Linux,
    }
  },
  // Needed for AL2023 until the CNI is managed with an addon because our custom CNI is too old
  useDefaultVpcCni: true,
})

// Cluster that is passed an instanceProfile via nodeGroupOptions
// and that does not create a default NodeGroupV2
const cluster_instanceProfileFromNgOpts = new eks.Cluster("cluster-instanceProfileFromNgOpts", {
  nodeGroupOptions: {
    instanceProfile: instanceProfile
  },
  skipDefaultNodeGroup: true,
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.Api,
  // Public subnets will be used for load balancers
  publicSubnetIds: eksVpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: eksVpc.privateSubnetIds,
  accessEntries: {
    instances: {
      principalArn: role.arn,
      type: eks.AccessEntryType.EC2Linux,
    }
  },
  // Needed for AL2023 until the CNI is managed with an addon because our custom CNI is too old
  useDefaultVpcCni: true,
})

// Cluster that is passed an instanceProfileName via nodeGroupOptions
// and that does not create a default NodeGroupV2
const cluster_instanceProfileNameFromNgOpts = new eks.Cluster("cluster-instanceProfileNameFromNgOpts", {
  nodeGroupOptions: {
    instanceProfileName: instanceProfile.name
  },
  skipDefaultNodeGroup: true,
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.Api,
  // Public subnets will be used for load balancers
  publicSubnetIds: eksVpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: eksVpc.privateSubnetIds,
  accessEntries: {
    instances: {
      principalArn: role.arn,
      type: eks.AccessEntryType.EC2Linux,
    }
  },
  // Needed for AL2023 until the CNI is managed with an addon because our custom CNI is too old
  useDefaultVpcCni: true,
})

// Note: Cluster that is passed an instanceProfileName via args
// and that does not create a default NodeGroupV2 not tested as in this case
// the instanceProfileName is ignored and not passed as an output


const capacity = {
  desiredCapacity: 1,
  minSize: 1,
  maxSize: 1,
}

// NodeGroup //

const ng_instanceProfileFromNgArgs = new eks.NodeGroup("ng-instanceProfileFromNgArgs", {
  ...capacity,
  cluster: cluster_NoIp_NoIpn,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceProfile: instanceProfile,
});

const ng_instanceProfileNameFromNgArgs = new eks.NodeGroup("ng-instanceProfileNameFromNgArgs", {
  ...capacity,
  cluster: cluster_NoIp_NoIpn,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceProfileName: instanceProfile.name,
});

const ng_instanceProfileFromClusterNgOpts = new eks.NodeGroup("ng-instanceProfileFromClusterNgOpts", {
  ...capacity,
  cluster: cluster_instanceProfileFromNgOpts,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
});

const ng_instanceProfileNameFromClusterNgOpts = new eks.NodeGroup("ng-instanceProfileNameFromClusterNgOpts", {
  ...capacity,
  cluster: cluster_instanceProfileNameFromNgOpts,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
});


// NodeGroupV2 //

const ngv2_instanceProfileFromNgArgs = new eks.NodeGroupV2("ngv2-instanceProfileFromNgArgs", {
  ...capacity,
  cluster: cluster_NoIp_NoIpn,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceProfile: instanceProfile,
});

const ngv2_instanceProfileNameFromNgArgs = new eks.NodeGroupV2("ngv2-instanceProfileNameFromNgArgs", {
  ...capacity,
  cluster: cluster_NoIp_NoIpn,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceProfileName: instanceProfile.name,
});

const ngv2_instanceProfileFromClusterNgOpts = new eks.NodeGroupV2("ngv2-instanceProfileFromClusterNgOpts", {
  ...capacity,
  cluster: cluster_instanceProfileFromNgOpts,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
});

const ngv2_instanceProfileNameFromClusterNgOpts = new eks.NodeGroupV2("ng-instanceProfileNameFromClusterNgOpts", {
  ...capacity,
  cluster: cluster_instanceProfileNameFromNgOpts,
  instanceType: "t4g.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
});

export const passedInstanceProfileName = instanceProfile.name
export const kubeconfig = cluster_NoIp_NoIpn.kubeconfig;