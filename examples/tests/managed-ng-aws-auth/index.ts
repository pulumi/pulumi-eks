import * as aws from '@pulumi/aws';
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";
import * as iam from "./iam";

const projectName = pulumi.getProject();

// Create IAM roles for role mappings and the managed node group.
const roles = iam.createRoles(projectName, 3);

// Create role mappings.
const roleMapping0: eks.types.input.RoleMappingArgs = {
    roleArn: roles[0].arn,
    username: "roleMapping0",
    groups: ["system:masters"],
};

// Create an EKS cluster.
const cluster = new eks.Cluster(`${projectName}`, {
    skipDefaultNodeGroup: true,
    roleMappings: [roleMapping0],
    instanceRoles: [roles[2]],
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Create a managed node group using a cluster as input.
new eks.ManagedNodeGroup(`${projectName}-managed-ng`, {
    cluster: cluster,
    nodeRole: roles[2],
});
