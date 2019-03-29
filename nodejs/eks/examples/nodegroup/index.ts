import * as eks from "@pulumi/eks";

// Create an EKS cluster with the default configuration.
const cluster = new eks.Cluster("cluster", {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    nodeAmiId: "ami-0e17dd7eeae729d78",
});

// There are two approaches that can be used to add additional NodeGroups.
// 1. A `createNodeGroup` API on `eks.Cluster`
// 2. A `NodeGroup` resource which accepts an `eks.Cluster` as input

// Create the first node group with ondemand t2.large instance
cluster.createNodeGroup("ondemand", {
    instanceType: "t2.large",
});

// Create the second node group with spot m4.large instance
const spot = new eks.NodeGroup("spot", {
    cluster: cluster,
    nodeAmiId: "ami-0e17dd7eeae729d78",
    instanceType: "m4.large",
    spotPrice: "1",
    labels: {"preemptible": "true"},
    taints: {
        "special": {
            value: "true",
            effect: "NoSchedule",
        },
    },
}, {
    providers: { kubernetes: cluster.provider},
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
