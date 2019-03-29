import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

// Create an EKS cluster with the default configuration.
const cluster1 = new eks.Cluster("cluster1", {
    nodeAmiId: "ami-0e17dd7eeae729d78",
});

// Create an EKS cluster with non-default configuration
const vpc = new awsx.Network("vpc", { usePrivateSubnets: true });
const cluster2 = new eks.Cluster("cluster2", {
    vpcId: vpc.vpcId,
    subnetIds: vpc.subnetIds,
    desiredCapacity: 2,
    minSize: 2,
    maxSize: 2,
    deployDashboard: false,
    nodeAmiId: "ami-0e17dd7eeae729d78",
});

// Export the clusters' kubeconfig.
export const kubeconfig1 = cluster1.kubeconfig;
export const kubeconfig2 = cluster2.kubeconfig;
