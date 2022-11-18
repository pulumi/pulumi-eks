import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

const projectName = pulumi.getProject();

// Create an EKS cluster with the default configuration.
const cluster1 = new eks.Cluster(`${projectName}-1`);

// Create an EKS cluster with a non-default configuration.
const vpc = new awsx.ec2.Vpc(`${projectName}-2`, {
    tags: {"Name": `${projectName}-2`},
});

const cluster2 = new eks.Cluster(`${projectName}-2`, {
    vpcId: vpc.id,
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
    vpcCniOptions: {
        disableTcpEarlyDemux: true,
    },
});

const cluster3 = new eks.Cluster(`${projectName}-3`, {
    vpcId: vpc.id,
    publicSubnetIds: vpc.publicSubnetIds,
    nodeGroupOptions: {
        desiredCapacity: 1,
        minSize: 1,
        maxSize: 1,
        instanceType: "t2.small",
    }
})

// Export the clusters' kubeconfig.
export const kubeconfig1 = cluster1.kubeconfig;
export const kubeconfig2 = cluster2.kubeconfig;
export const kubeconfig3 = cluster3.kubeconfig;

// export the IAM Role ARN of the cluster
export const iamRoleArn = cluster1.core.clusterIamRole.arn;
