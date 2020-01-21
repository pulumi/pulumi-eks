import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

const projectName = pulumi.getProject();

// Create an EKS cluster with the fargate configuration.
const vpc = new awsx.ec2.Vpc(`${projectName}`, {});
const cluster = new eks.Cluster(`${projectName}`, {
    vpcId: vpc.id,
    privateSubnetIds: vpc.privateSubnetIds,
    fargate: true,
    deployDashboard: false,
});

// Export the clusters' kubeconfig.
export const kubeconfig = cluster.kubeconfig;
