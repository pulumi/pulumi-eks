import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

const projectName = pulumi.getProject();

// Allocate a new VPC with custom settings, and a public & private subnet per AZ.
const vpc = new awsx.ec2.Vpc(`${projectName}`, {
    cidrBlock: "172.16.0.0/16",
    numberOfAvailabilityZones: 3,
    tags: { "Name": `${projectName}` },
});

const publicSubnetIds = vpc.publicSubnetIds;

// Remove this line after the init update to repro: https://git.io/fj8cn
const popped = pulumi.output(publicSubnetIds).apply(subnets => {
    subnets.pop();
    return subnets;
});

const cluster = new eks.Cluster(`${projectName}`, {
    vpcId: vpc.id,
    publicSubnetIds: popped,
    deployDashboard: false,
});

// Export the cluster name and kubeconfig
export const clusterName = cluster.core.cluster.name;
export const kubeconfig = cluster.kubeconfig;
