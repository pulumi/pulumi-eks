
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("default-instance-role", {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
  subnetSpecs: [
    { type: "Public" }
  ],
  natGateways: {
      strategy: "None",
  }
});

const cluster = new eks.Cluster("default-instance-role", {
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.Api,
  publicSubnetIds: eksVpc.publicSubnetIds,
  skipDefaultNodeGroup: true,
  createInstanceRole: true,
});

export const instanceRoles = cluster.instanceRoles.apply(roles => roles.map(role => role.name));
export const kubeconfig = cluster.kubeconfig;

const mng = eks.createManagedNodeGroup("default-instance-role-mng", {
  scalingConfig: {
    minSize: 1,
    maxSize: 1,
    desiredSize: 1,
  },
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceTypes: ["t3.medium"],
  nodeRole: cluster.instanceRoles.apply(roles => roles[0]),
  subnetIds: eksVpc.privateSubnetIds,
});
