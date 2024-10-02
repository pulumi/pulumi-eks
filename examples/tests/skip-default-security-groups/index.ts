import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

// IAM roles for the node group
const role = iam.createRole("managed-ng-os");

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("managed-ng-os", {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
});

// Create an EKS cluster without default security groups, those are not needed
// for managed node groups because they use the cluster security group created
// by EKS.
const cluster = new eks.Cluster("managed-ng-os", {
  skipDefaultNodeGroup: true,
  skipDefaultSecurityGroups: true,
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.API,
  // Public subnets will be used for load balancers
  publicSubnetIds: eksVpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: eksVpc.privateSubnetIds,
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

const managedNodeGroupAL2023 = eks.createManagedNodeGroup("al-2023-mng", {
  scalingConfig: {
    minSize: 1,
    maxSize: 1,
    desiredSize: 1,
  },
  cluster: cluster,
  nodeRole: role,
});

export const clusterSecurityGroup = cluster.clusterSecurityGroup;
export const nodeSecurityGroup = cluster.nodeSecurityGroup;
