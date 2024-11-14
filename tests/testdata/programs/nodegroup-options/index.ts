import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

const projectName = pulumi.getProject();

const cluster = new eks.Cluster(`${projectName}`, {
    nodeGroupOptions: {
        // AL2023 doesn't support GPU instances yet.
        operatingSystem: eks.OperatingSystem.Bottlerocket,
        // The cheapest instance with GPU support.
        instanceType: "g5g.xlarge",
        gpu: true,
    }
});

// Export the cluster kubeconfig.
export const kubeconfig = cluster.kubeconfig;
