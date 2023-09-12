import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

const projectName = pulumi.getProject();

// Create an EKS cluster with a non-default configuration.
const vpc = new awsx.ec2.Vpc(`${projectName}`, {
    cidrBlock: "192.168.0.0/16",
    tags: { "Name": `${projectName}` },
});

const cluster = new eks.Cluster(`${projectName}`, {
    vpcId: vpc.vpcId,
    publicSubnetIds: vpc.publicSubnetIds,
    desiredCapacity: 2,
    minSize: 2,
    maxSize: 2,
    deployDashboard: false,
    enabledClusterLogTypes: [
        "api",
        "audit",
        "authenticator",
    ],
    kubernetesServiceIpAddressRange: "172.16.0.0/20"
});

export const kubernetesServiceRange = cluster.eksCluster.kubernetesNetworkConfig.serviceIpv4Cidr
