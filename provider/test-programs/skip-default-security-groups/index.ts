import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

const config = new pulumi.Config();
const skipDefaultSecurityGroups = config.requireBoolean("skipDefaultSecurityGroups");
const skipDefaultNodeGroup = config.requireBoolean("skipDefaultNodeGroup");

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("managed-ng-os", {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
});

// this should fail because skipDefaultSecurityGroups cannot be set when
// the default node group is used
const cluster = new eks.Cluster("managed-ng-os", {
  skipDefaultNodeGroup: skipDefaultNodeGroup,
  skipDefaultSecurityGroups: skipDefaultSecurityGroups,
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.API,
  // Public subnets will be used for load balancers
  publicSubnetIds: eksVpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: eksVpc.privateSubnetIds,
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

export const clusterSecurityGroup = cluster.clusterSecurityGroup;
export const nodeSecurityGroup = cluster.nodeSecurityGroup;
