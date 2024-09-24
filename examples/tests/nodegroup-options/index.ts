import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

const projectName = pulumi.getProject();

const cluster = new eks.Cluster(`${projectName}`, {
    // AL2023 doesn't support GPU instances yet.
    operatingSystem: eks.OperatingSystem.Bottlerocket,
    gpu: true,
});

// Export the cluster kubeconfig.
export const kubeconfig = cluster.kubeconfig;
