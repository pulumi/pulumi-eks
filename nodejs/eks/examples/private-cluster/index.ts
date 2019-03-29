import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

const name = "private-cluster";

// Create a VPC that uses private subnets.
const network = new awsx.Network(name, {
    numberOfAvailabilityZones: 2,
    usePrivateSubnets: true,
});

// Create a cluster with the desired specs, that does not auto assign a public
// IP to its workers.
const cluster = new eks.Cluster(name, {
    deployDashboard: false,
    desiredCapacity: 1,
    maxSize: 1,
    vpcId: network.vpcId,
    subnetIds: network.subnetIds,
    nodeAssociatePublicIpAddress: false,
});

export const kubeconfig = cluster.kubeconfig;
