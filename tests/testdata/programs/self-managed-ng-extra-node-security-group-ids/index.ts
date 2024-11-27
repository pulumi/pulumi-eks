import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

// IAM roles for the node groups.
const role = iam.createRole("role");

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("vpc", {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
  natGateways: {
    strategy: awsx.ec2.NatGatewayStrategy.Single
  }
});

const cluster = new eks.Cluster("cluster", {
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
})

const capacity = {
  desiredCapacity: 1,
  minSize: 1,
  maxSize: 1,
}

const sg1 = new aws.ec2.SecurityGroup("sg1", {})
const sg2 = new aws.ec2.SecurityGroup("sg2", {})

const ng_extraNodeSecurityGroups = new eks.NodeGroup("ng_extraNodeSecurityGroups", {
  ...capacity,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  extraNodeSecurityGroups: [sg1, sg2]
});

const ng_extraNodeSecurityGroupIds = new eks.NodeGroup("ng_extraNodeSecurityGroupIds", {
  ...capacity,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  extraNodeSecurityGroupIds: [sg1.id, sg2.id]
});

const ngv2_extraNodeSecurityGroups = new eks.NodeGroupV2("ngv2_extraNodeSecurityGroups", {
  ...capacity,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  extraNodeSecurityGroups: [sg1, sg2]
});

const ngv2_extraNodeSecurityGroupIds = new eks.NodeGroupV2("ngv2_extraNodeSecurityGroupIds", {
  ...capacity,
  cluster: cluster,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  extraNodeSecurityGroupIds: [sg1.id, sg2.id]
});


export const passedExtraNodeSecurityGroupIds = [sg1.id, sg2.id]