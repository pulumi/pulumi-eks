import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

const projectName = pulumi.getProject();

// Create an EKS cluster with awsx.Network VPC and cluster subnetIds.
const vpc1 = new awsx.Network(`${projectName}-1`);
const cluster1 = new eks.Cluster(`${projectName}-1`, {
    vpcId: vpc1.vpcId,
    subnetIds: vpc1.subnetIds,
    deployDashboard: false,
});

const role = iam.createRole("role");
const instanceProfile = new aws.iam.InstanceProfile("instanceProfile", {role: role});

// Create an EKS cluster with awsx.Network VPC and a nodegroup with
// nodeSubnetIds overrides.
const vpc2 = new awsx.Network(`${projectName}-2`);
const cluster2 = new eks.Cluster(`${projectName}-2`, {
    vpcId: vpc2.vpcId,
    subnetIds: vpc2.subnetIds,
    deployDashboard: false,
    instanceRole: role,
});

// Create the node group with the nodeSubnetIds override option.
const ng = new eks.NodeGroup(`${projectName}-2-ng`, {
    cluster: cluster2,
    nodeSubnetIds: vpc2.publicSubnetIds,
}, {
    providers: { kubernetes: cluster2.provider},
});

// Export the cluster's kubeconfig.
export const kubeconfig1 = cluster1.kubeconfig;
export const kubeconfig2 = cluster2.kubeconfig;
