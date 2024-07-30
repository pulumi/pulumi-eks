import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

// IAM roles for the node groups.
const role0 = iam.createRole("example-role0");
const role1 = iam.createRole("example-role1");

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("eks-vpc", {
    enableDnsHostnames: true,
    cidrBlock: "10.0.0.0/16",
});

// Create an EKS cluster.
const cluster = new eks.Cluster("example-managed-nodegroups", {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    vpcId: eksVpc.vpcId,
    // Public subnets will be used for load balancers
    publicSubnetIds: eksVpc.publicSubnetIds,
    // Private subnets will be used for cluster nodes
    privateSubnetIds: eksVpc.privateSubnetIds,
    instanceRoles: [role0, role1],
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Managed node group with parameters that cause a custom launch template to be created
const managedNodeGroup0 = eks.createManagedNodeGroup("example-managed-ng0", {
    cluster: cluster,
    nodeRole: role0,
    kubeletExtraArgs: "--max-pods=500",
    enableIMDSv2: true,
    version: cluster.eksCluster.version,
}, cluster);

// Simple managed node group
const managedNodeGroup1 = eks.createManagedNodeGroup("example-managed-ng1", {
    cluster: cluster,
    nodeGroupName: "aws-managed-ng1",
    nodeRoleArn: role1.arn,
    version: cluster.eksCluster.version,
}, cluster);
