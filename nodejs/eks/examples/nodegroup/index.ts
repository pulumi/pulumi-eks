import * as eks from "@pulumi/eks";

// Create an EKS cluster with the default configuration.
const cluster = new eks.Cluster("cluster", {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
});

// Create the first node group with ondemand t2.large instance
cluster.createNodeGroup("ondemand", {
    instanceType: "t2.large",
});

// Create the second node group with spot m4.large instance
cluster.createNodeGroup("spot", {
    instanceType: "m4.large",
    spotPrice: "1",
    labels: {"preemptible": "true"},
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
