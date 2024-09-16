
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

const config = new pulumi.Config();
const vpcCniVersion = config.require("vpcCniVersion");

// IAM roles for the node groups.
const role = iam.createRole("cluster-addons");

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("cluster-addons", {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
});

// Create an EKS cluster.
const cluster = new eks.Cluster("cluster-addons", {
  skipDefaultNodeGroup: true,
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.API,
  publicSubnetIds: eksVpc.publicSubnetIds,
  privateSubnetIds: eksVpc.privateSubnetIds,
  vpcCniOptions: {
    addonVersion: vpcCniVersion,
    disableTcpEarlyDemux: true,
  },
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
export const clusterVersion = cluster.core.cluster.version;
export const clusterName = cluster.core.cluster.name;

const ng = eks.createManagedNodeGroup("cluster-addons", {
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  scalingConfig: {
    minSize: 1,
    maxSize: 2,
    desiredSize: 1,
  },
  instanceTypes: ["t3.medium"],
  nodeRole: role,
});
