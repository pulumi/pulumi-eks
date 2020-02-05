import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import assert = require("assert");

const projectName = pulumi.getProject();

const managedPolicyArns: string[] = [
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
];

// Creates a role and attaches the EKS worker node IAM managed policies.
export function createRole(name: string): aws.iam.Role {
    const role = new aws.iam.Role(name, {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: "ec2.amazonaws.com",
        }),
    });

    let counter = 0;
    for (const policy of managedPolicyArns) {
        // Create RolePolicyAttachment without returning it.
        const rpa = new aws.iam.RolePolicyAttachment(`${name}-policy-${counter++}`,
            { policyArn: policy, role: role },
        );
    }

    return role;
}

// IAM role for the node group.
const role1 = createRole("example-role1");

// Create an EKS cluster.
const cluster = new eks.Cluster(`${projectName}`, {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    instanceRoles: [role1],
    createOidcProvider: true,
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Create a simple AWS managed node group using a cluster as input.
const managedNodeGroup1 = eks.createManagedNodeGroup("example-managed-ng1", {
    cluster: cluster,
    nodeRole: role1,
    version: "1.14",
});

// Export the cluster OIDC provider URL.
if (!cluster?.core?.oidcProvider) {
    throw new Error("Invalid cluster OIDC provider URL");
}
const clusterOidcProvider = cluster.core.oidcProvider;
export const clusterOidcProviderUrl = clusterOidcProvider.url;

// Setup Pulumi Kubernetes provider.
const provider = new k8s.Provider("eks-k8s", {
    kubeconfig: kubeconfig.apply(JSON.stringify),
});

// Create a namespace.
const appsNamespace = new k8s.core.v1.Namespace("apps", undefined, {provider: provider});
export const appsNamespaceName = appsNamespace.metadata.name;

// Create the IAM target policy and role for the Service Account.
const saName = "s3-readonly";
const saAssumeRolePolicy = pulumi.all([clusterOidcProviderUrl, clusterOidcProvider.arn]).apply(([url, arn]) => aws.iam.getPolicyDocument({
    statements: [{
        actions: ["sts:AssumeRoleWithWebIdentity"],
        conditions: [{
            test: "StringEquals",
            values: [`system:serviceaccount:${appsNamespaceName}:${saName}`],
            variable: `${url.replace("https://", "")}:sub`,
        }],
        effect: "Allow",
        principals: [{
            identifiers: [arn],
            type: "Federated",
        }],
    }],
}));

const saRole = new aws.iam.Role(saName, {
    assumeRolePolicy: saAssumeRolePolicy.json,
});

// Attach the S3 read only access policy.
const saS3Rpa = new aws.iam.RolePolicyAttachment(saName, {
    policyArn: "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess",
    role: saRole,
});

// Create the Service Account with the IAM role annotated.
const sa = new k8s.core.v1.ServiceAccount(saName, {
    metadata: {
        namespace: appsNamespaceName,
        name: saName,
        annotations: {
            "eks.amazonaws.com/role-arn": saRole.arn,
        },
    },
}, { provider: provider});

// Use the Service Account in a Pod.
const labels = {"app": saName};
const pod = new k8s.core.v1.Pod(saName,
    {
        metadata: {labels: labels, namespace: appsNamespaceName},
        spec: {
            serviceAccountName: sa.metadata.name,
            containers: [
                {
                    name: saName,
                    image: "nginx",
                    ports: [{ name: "http", containerPort: 80 }],
                },
            ],
        },
    },
    {
        provider: provider,
    },
);

// (For testing only): Assert that the Service Account's IAM role and token are projected into the Pod.
if (!pulumi.runtime.isDryRun()) {
    const envvars = pod.spec.containers[0].env;
    envvars.apply(evs => {
        if (evs) {
            assert(evs.find(e => e.name === "AWS_ROLE_ARN") !== undefined);
            assert(evs.find(e => e.name === "AWS_WEB_IDENTITY_TOKEN_FILE") !== undefined);
        } else {
            throw new Error("No AWS IAM envvars exist in the pod.");
        }
    });
}
