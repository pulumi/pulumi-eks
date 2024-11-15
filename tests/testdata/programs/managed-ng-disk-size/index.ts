import * as awsx from '@pulumi/awsx';
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";
import * as iam from "./iam";

const eksVpc = new awsx.ec2.Vpc("eks-vpc", {
    enableDnsHostnames: true,
    cidrBlock: "10.0.0.0/16",
  });

// IAM roles for the node groups.
const role = iam.createRole("example-role");

const projectName = pulumi.getProject();

const cluster = new eks.Cluster(`${projectName}`, {
    skipDefaultNodeGroup: true,
    vpcId: eksVpc.vpcId,
    // Public subnets will be used for load balancers
    publicSubnetIds: eksVpc.publicSubnetIds,
    // Private subnets will be used for cluster nodes
    privateSubnetIds: eksVpc.privateSubnetIds,
    instanceRoles: [role],
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Create a managed node group using a cluster as input.
eks.createManagedNodeGroup(`${projectName}-managed-ng`, {
    cluster: cluster,
    nodeRole: role,
    // Force creating a custom launch template
    kubeletExtraArgs: "--max-pods=500",
    diskSize: 50,
});
