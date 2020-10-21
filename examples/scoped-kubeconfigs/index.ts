import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import assert = require("assert");

const projectName = pulumi.getProject();
const accountId = pulumi.output(aws.getCallerIdentity({async: true})).accountId;
const rolePolicy = accountId.apply(id => <aws.iam.PolicyDocument>{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "",
            "Effect": "Allow",
            "Principal": {"AWS": id},
            "Action": "sts:AssumeRole",
        },
    ],
});

// Create a new IAM role for devs on the account caller.
const devsGroupName = "pulumi:devs"; // Can be any value.
const devsAlice = "pulumi:alice"; // Can be any value.
const devsRole = new aws.iam.Role(`${projectName}`, {
    assumeRolePolicy: rolePolicy,
});

// Create an EKS cluster with a role mapping from the devs IAM role to the
// dev group and user in k8s.
const cluster = new eks.Cluster(`${projectName}`, {
    deployDashboard: false,
    roleMappings      : [
        {
            roleArn   : devsRole.arn,
            groups    : [devsGroupName],
            username  : devsAlice,
        },
    ],
});

// Export the cluster kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Create the devs namespace and limited RBAC role to only work with Pods.
const appsNamespace = new k8s.core.v1.Namespace("apps", undefined, {provider: cluster.provider});
const devsGroupRole = new k8s.rbac.v1.Role("pulumi-devs",
    {
        metadata: { namespace: appsNamespace.metadata.name },
        rules: [
            {
                apiGroups: [""],
                resources: ["pods"],
                verbs: ["get", "list", "watch", "create", "update", "delete"],
            },
        ],
    }, { provider: cluster.provider },
);

// Bind the devs RBAC group to the new, limited role.
const devsGroupRoleBinding = new k8s.rbac.v1.RoleBinding("pulumi-devs",
    {
        metadata: { namespace: appsNamespace.metadata.name },
        subjects: [{
            kind: "Group",
            name: devsGroupName,
        }],
        roleRef: {
            apiGroup: "rbac.authorization.k8s.io",
            kind: "Role",
            name: devsGroupRole.metadata.name,
        },
    }, { provider: cluster.provider },
);

// Create and use a role-based kubeconfig.
const roleKubeconfigOpts: eks.KubeconfigOptions = { roleArn: devsRole.arn };
const roleKubeconfig = cluster.getKubeconfig(roleKubeconfigOpts);
const roleProvider = new k8s.Provider("provider", {kubeconfig: roleKubeconfig});
const pod = new k8s.core.v1.Pod("nginx", {
    metadata: { namespace: appsNamespace.metadata.name },
    spec: {
        containers: [{
            name: "nginx",
            image: "nginx",
            ports: [{ name: "http", containerPort: 80 }],
        }],
    },
}, { provider: roleProvider, dependsOn: devsGroupRoleBinding  });
