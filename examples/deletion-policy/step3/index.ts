import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";

const projectName = pulumi.getProject();

////////////////////////////
///     EKS Clusters     ///
////////////////////////////

// Create an EKS cluster with the deletionProtection disabled.
const cluster1 = new eks.Cluster(`${projectName}-1`, {
    nodeAmiId: "ami-066e69f6f03b5383e",
    deletionProtection: false,
});

// Export the clusters' kubeconfig.
export const kubeconfig1: pulumi.Output<any> = cluster1.kubeconfig;
