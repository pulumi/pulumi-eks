import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";
import * as tls from "@pulumi/tls";

const projectName = pulumi.getProject();

// Create and export an SSH public key that will be used by the cluster.
export const sshPublicKey = new tls.PrivateKey(`${projectName}`, {
    algorithm: "RSA",
    rsaBits: 4096,
}).publicKeyOpenssh;

// Create the cluster.
const cluster = new eks.Cluster(`${projectName}`, {
    nodeGroupOptions: {
        spotPrice: "1",
        nodePublicKey: sshPublicKey,
    },
    deployDashboard: false,
});

// Export the clusters' kubeconfig.
export const kubeconfig = cluster.kubeconfig;
