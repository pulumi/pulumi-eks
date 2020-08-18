import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

const projectName = pulumi.getProject();

// Create a new VPC.
const vpc = new awsx.ec2.Vpc(`${projectName}`, {
    tags: { "Name": `${projectName}` },
});

// Create a new IAM role on the account caller to use as a cluster admin.
const accountId = pulumi.output(aws.getCallerIdentity({async: true})).accountId;
const assumeRolePolicy = accountId.apply(id => JSON.stringify(
    {
        Version: "2012-10-17",
        Statement: [
            {
                Sid: "",
                Effect: "Allow",
                Principal: {
                    AWS: `arn:aws:iam::${id}:root`,
                },
                Action: "sts:AssumeRole",
            },
        ],
    },
));
const clusterAdminRole = new aws.iam.Role("clusterAdminRole", {
    assumeRolePolicy,
    tags: {
        clusterAccess: "admin-usr",
    },
});

// Create an EKS cluster with a named profile. Map in the new IAM role into
// RBAC for usage after the cluster is running.
//
// Note, the role needs to be mapped into the cluster before it can be used.
// It is omitted from providerCredentialOpts as it will not have access
// to the cluster yet to write the aws-auth configmap for its own permissions.
// See example pod below to use the role once the cluster is ready.
const cluster = new eks.Cluster(`${projectName}`, {
    vpcId: vpc.id,
    publicSubnetIds: vpc.publicSubnetIds,
    providerCredentialOpts: {
        profileName: aws.config.profile,
    },
    roleMappings: [
        {
            groups: ["system:masters"],
            roleArn: clusterAdminRole.arn,
            username: "pulumi:admin-usr",
        },
    ],
});

// Export the cluster kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Create a role-based kubeconfig with the named profile and the new
// role mapped into the cluster's RBAC.
const roleKubeconfigOpts: eks.KubeconfigOptions = {
    profileName: aws.config.profile,
    roleArn: clusterAdminRole.arn,
};
export const roleKubeconfig = cluster.getKubeconfig(roleKubeconfigOpts);
const roleProvider = new k8s.Provider("provider", {
    kubeconfig: roleKubeconfig,
}, {dependsOn: [cluster.provider]});

// Create a pod with the role-based kubeconfig.
const pod = new k8s.core.v1.Pod("nginx", {
    spec: {
        containers: [{
            name: "nginx",
            image: "nginx",
            ports: [{ name: "http", containerPort: 80 }],
        }],
    },
}, { provider: roleProvider });
