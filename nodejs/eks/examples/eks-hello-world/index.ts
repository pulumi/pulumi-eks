import * as awsinfra from "@pulumi/aws-infra";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

const name = "helloworld";

// Create an EKS cluster with non-default configuration
const vpc = new awsinfra.Network("vpc", { usePrivateSubnets: true });
const cluster = new eks.Cluster(name, {
    vpcId: vpc.vpcId,
    subnetIds: vpc.subnetIds,
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 2,
    storageClasses: "gp2",
    deployDashboard: false,
});

// Export the clusters' kubeconfig.
export const kubeconfig = cluster.kubeconfig

// Create a Kubernetes Namespace
const ns = new k8s.core.v1.Namespace(name, {}, { provider: cluster.provider });
export const namespaceName = ns.metadata.apply(m => m.name);

// Create a NGINX Deployment
const appLabels = { app: name };
export const deployment = new k8s.apps.v1.Deployment(name,
    {
        metadata: {
            namespace: namespaceName,
            labels: appLabels,
        },
        spec: {
            replicas: 1,
            selector: { matchLabels: appLabels },
            template: {
                metadata: {
                    labels: appLabels,
                },
                spec: {
                    containers: [
                        {
                            name: name,
                            image: "nginx:latest",
                            ports: [{ name: "http", containerPort: 80 }]
                        }
                    ],
                }
            }
        },
    },
    {
        provider: cluster.provider,
    }
);
export const deploymentName = deployment.metadata.apply(m => m.name);
