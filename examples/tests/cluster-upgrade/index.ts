
import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

const config = new pulumi.Config();
const clusterVersion = config.require("initialVersion");

// IAM roles for the node groups.
const role = iam.createRole("cluster-upgrade");

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("cluster-upgrade", {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
});

// Create an EKS cluster.
const cluster = new eks.Cluster("cluster-upgrade", {
  skipDefaultNodeGroup: true,
  version: clusterVersion,
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.API,
  // Public subnets will be used for load balancers
  publicSubnetIds: eksVpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: eksVpc.privateSubnetIds,
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Create a simple AL 2023 node group with x64 instances
const mng = eks.createManagedNodeGroup("cluster-upgrade", {
  scalingConfig: {
    minSize: 1,
    maxSize: 2,
    desiredSize: 1,
  },
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
});

export const clusterName = cluster.core.cluster.name;
export const nodeGroupName = mng.nodeGroupName;
