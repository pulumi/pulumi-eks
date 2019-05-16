import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

// Create an EKS cluster with the default configuration.
const cluster1 = new eks.Cluster("example-cluster1");

// Create an EKS cluster with non-default configuration
const vpc = new awsx.Network("example-cluster2-vpc", { usePrivateSubnets: true });
const cluster2 = new eks.Cluster("example-cluster2", {
    vpcId: vpc.vpcId,
    subnetIds: vpc.subnetIds,
    desiredCapacity: 2,
    minSize: 2,
    maxSize: 2,
    deployDashboard: false,
    enabledClusterLogTypes: [
        "api",
        "audit",
        "authenticator",
    ],
});

// Export the clusters' kubeconfig.
export const kubeconfig1 = cluster1.kubeconfig;
export const kubeconfig2 = cluster2.kubeconfig;
