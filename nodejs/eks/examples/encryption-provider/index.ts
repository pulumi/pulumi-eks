import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as kx from "@pulumi/kubernetesx";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";
import * as fs from "fs";
import * as os from "os";

const projectName = pulumi.getProject();

// Create a new KMS key.
const key = new aws.kms.Key("secrets-encryption-key", {
    deletionWindowInDays: 7,
    description: "KMS key for encrypting Kubernetes Secrets using envelope encryption",
});

// Create a new alias to the key.
const alias = new aws.kms.Alias("alias/k8s-secrets-encryption-key", {
    targetKeyId: key.keyId,
});

// Export the arns
export const keyArn = key.arn;
export const aliasArn = alias.arn;

// Create an EKS cluster with a KMS encryption provider.
const cluster = new eks.Cluster(`${projectName}`, {
    encryptionConfigKeyArn: alias.targetKeyArn,
});

// Export the cluster kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Create a random password for an example DB, and store it in a secret.
const dbPassword = new random.RandomPassword("db-password",
    {length: 32},
    {additionalSecretOutputs: ["result"]},
).result;
const dbPasswordSecret = new kx.Secret("db-password", {
    stringData: {"dbPassword": dbPassword},
}, {provider: cluster.provider});

/*
// Create an Kubernetes image pull secret to use local client Docker creds (if
// it exists).
const homedir = os.homedir();
const imagePullSecretData = fs.readFileSync(`${homedir}/.docker/config.json`);
const imagePullSecretStr = imagePullSecretData.toString();
const imagePullSecretB64Str = Buffer.from(imagePullSecretStr).toString("base64");
const imagePullSecret = new kx.Secret("image-pull-secret", {
    type: "kubernetes.io/dockerconfigjson",
    data: {".dockerconfigjson": imagePullSecretB64Str },
}, {provider: cluster.provider});
*/

// Create a pod builder that uses the DB password and local Docker creds.
const podBuilder = new kx.PodBuilder({
    // imagePullSecrets: [{ name: imagePullSecret.metadata.name }],
    containers: [{
        image: "nginx",
        ports: { "http": 8080 },
        env: {
            "PASSWORD": dbPasswordSecret.asEnvValue("dbPassword"),
        },
    }],
});

// Create a deployment from the pod builder.
const deployment = new kx.Deployment("nginx", {
    spec: podBuilder.asDeploymentSpec({replicas: 1}),
}, {provider: cluster.provider});
