import * as aws from '@pulumi/aws';
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

const projectName = pulumi.getProject();

const cluster = new eks.Cluster(`${projectName}`, {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Create a managed node group using a cluster as input.
eks.createManagedNodeGroup(`${projectName}-managed-ng`, {
    cluster: cluster,
    // Force creating a custom launch template
    bootstrapExtraArgs: "--max-pods=500",
    diskSize: 50,
});
