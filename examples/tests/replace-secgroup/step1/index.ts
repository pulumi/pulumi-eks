import * as aws from "@pulumi/aws";
import * as k8s from '@pulumi/kubernetes';
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";
import * as iam from "./iam";

const projectName = pulumi.getProject();

// Create an EKS cluster with non-default configuration
const role = iam.createRole(`${projectName}-role`);
const instanceProfile = new aws.iam.InstanceProfile(`${projectName}-instanceProfile`, {role: role});
const vpc = new awsx.ec2.Vpc(`${projectName}`, {
    cidrBlock: "172.16.0.0/16",
    tags: { "Name": `${projectName}` },
});

const testCluster = new eks.Cluster(`${projectName}`, {
    vpcId: vpc.vpcId,
    publicSubnetIds: vpc.publicSubnetIds,
    skipDefaultNodeGroup: true,
    instanceRole: role,
});

const provider = new k8s.Provider('k8s-eks', {
    kubeconfig: testCluster.kubeconfig,
});

// Create a node group.
const ng = new eks.NodeGroup(`${projectName}-ng`, {
    cluster: testCluster,
    instanceProfile: instanceProfile,
}, {
    providers: { kubernetes: provider},
});

// Export the cluster kubeconfig.
export const kubeconfig = testCluster.kubeconfig;
