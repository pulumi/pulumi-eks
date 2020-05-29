import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import assert = require("assert");

const projectName = pulumi.getProject();

// Create an EKS cluster.
const cluster = new eks.Cluster(`${projectName}`, {
    deployDashboard: false,
    createOidcProvider: true,
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

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

// Create the new IAM policy for the Service Account using the
// AssumeRoleWebWebIdentity action.
const saName = "s3";
const saAssumeRolePolicy = pulumi.all([clusterOidcProviderUrl, clusterOidcProvider.arn, appsNamespaceName]).apply(([url, arn, namespace]) => aws.iam.getPolicyDocument({
    statements: [{
        actions: ["sts:AssumeRoleWithWebIdentity"],
        conditions: [{
            test: "StringEquals",
            values: [`system:serviceaccount:${namespace}:${saName}`],
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
    policyArn: "arn:aws:iam::aws:policy/AmazonS3FullAccess",
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
    }, {provider: provider},
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

// (For testing only): Assert that an S3 Job succeeds.
// Per: https://aws.amazon.com/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts
const bucket = new aws.s3.Bucket("pod-irsa-job-bucket", {
    forceDestroy: true,
});
const bucketName = bucket.id;
const regionName = pulumi.output(aws.getRegion({}, {async: true})).name;
const podName = `${saName}-pod-test`;
const s3Pod = new k8s.core.v1.Pod(podName,
    {
        metadata: {labels: labels, namespace: appsNamespaceName},
        spec: {
            serviceAccountName: sa.metadata.name,
            containers: [
                {
                    name: podName,
                    image: "amazonlinux:2018.03",
                    command: ["sh", "-c",
                        pulumi.interpolate`curl -sL -o /s3-echoer https://git.io/JfnGX && chmod +x /s3-echoer && echo This is an in-cluster test | /s3-echoer ${bucketName} && sleep 3600`,
                    ],
                    env: [
                        {name: "AWS_DEFAULT_REGION", value: regionName},
                        {name: "ENABLE_IRP", value: "true"},
                    ],
                },
            ],
        },
    }, { provider: provider },
);
