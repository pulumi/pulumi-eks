import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";
import * as iam from "./iam";
import * as secgroup from "./securitygroup";

const projectName = pulumi.getProject();

// Create an EKS cluster with non-default configuration
const role = iam.createRole(`${projectName}-role`);
const instanceProfile = new aws.iam.InstanceProfile(`${projectName}-instanceProfile`, {role: role});
const vpc = new awsx.Network(`${projectName}-vpc`, { usePrivateSubnets: true });
const testCluster = new eks.Cluster(`${projectName}`, {
    vpcId: vpc.vpcId,
    subnetIds: vpc.subnetIds,
    skipDefaultNodeGroup: true,
    instanceRole: role,
});

// Create a node group.
const ng = new eks.NodeGroup(`${projectName}-ng`, {
    cluster: testCluster,
    instanceProfile: instanceProfile,
}, {
    providers: { kubernetes: testCluster.provider},
});

// Export the cluster kubeconfig.
export const kubeconfig = testCluster.kubeconfig;
