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
})

const capacity = {
  desiredCapacity: 1,
  minSize: 1,
  maxSize: 1,
}

const ng_instanceProfileNameFromNgArgs = new eks.NodeGroup("ng-instanceProfileNameFromNgArgs", {
  ...capacity,
  cluster: cluster_NoIp_NoIpn,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceProfileName: instanceProfile.name,
});

const ngv2_instanceProfileNameFromNgArgs = new eks.NodeGroupV2("ngv2-instanceProfileNameFromNgArgs", {
  ...capacity,
  cluster: cluster_NoIp_NoIpn,
  instanceType: "t3.medium",
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceProfileName: instanceProfile.name,
});

export const passedInstanceProfileName = instanceProfile.name
export const kubeconfig = cluster_NoIp_NoIpn.kubeconfig;