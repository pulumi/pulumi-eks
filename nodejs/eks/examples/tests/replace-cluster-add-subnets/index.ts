import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

const projectName = pulumi.getProject();

const vpc = new awsx.Network(`${projectName}-net`, {
    numberOfAvailabilityZones: 3,
});

const publicSubnetIds = vpc.publicSubnetIds;

// Remove this line after the init update to repro: https://git.io/fj8cn
publicSubnetIds.pop();

const cluster = new eks.Cluster(projectName, {
    vpcId: vpc.vpcId,
    subnetIds: publicSubnetIds,
    deployDashboard: false,
});

// Export the cluster name and kubeconfig
export const clusterName = cluster.core.cluster.name;
export const kubeconfig = cluster.kubeconfig;
