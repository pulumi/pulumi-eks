
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

const config = new pulumi.Config();
const vpcCniVersion = config.require("defaultVpcCniVersion");

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
    logLevel: "INFO",
    securityContextPrivileged: true,
    enableNetworkPolicy: true,
    
    // required for security groups for pods
    enablePodEni: true,
    configurationValues: {
      env: {
        POD_SECURITY_GROUP_ENFORCING_MODE: "standard",
      }
    },
  },
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
export const clusterName = cluster.core.cluster.name;

const ng = eks.createManagedNodeGroup("cluster-addons", {
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  scalingConfig: {
    minSize: 1,
    maxSize: 2,
    desiredSize: 1,
  },
  // need instances that support ENI trunking to support SGs for pods: https://docs.aws.amazon.com/eks/latest/userguide/security-groups-for-pods.html
  instanceTypes: ["c6i.large"],
  nodeRole: role,
});
