import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

const projectName = pulumi.getProject();

const cluster = new eks.Cluster(`${projectName}`, {
    deployDashboard: false,
    gpu: true,
});

// Export the cluster kubeconfig.
export const kubeconfig = cluster.kubeconfig;
