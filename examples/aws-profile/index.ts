import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";
import * as process from "process";

const projectName = pulumi.getProject();

// For CI testing only: used to set profileName to alternate AWS_PROFILE envvar.
if (!process.env.ALT_AWS_PROFILE) {
    throw new Error("ALT_AWS_PROFILE must be set");
}

if (!process.env.AWS_REGION) {
    throw new Error("AWS_REGION must be set");
}

// AWS named profile to use.
const profileName = process.env.ALT_AWS_PROFILE;
// AWS region to use.
const region = pulumi.output(process.env.AWS_REGION as aws.types.enums.Region);

// Create an AWS provider instance using the named profile creds
// and current region.
const awsProvider = new aws.Provider("aws-provider", {
    profile: profileName,
    region: region,
});

// Define the AWS provider credential opts to configure the cluster's
// kubeconfig auth.
const kubeconfigOpts: eks.types.input.KubeconfigOptionsArgs = {profileName: profileName};

// Create the cluster using the AWS provider and credential opts.
const cluster = new eks.Cluster(`${projectName}`, {
    providerCredentialOpts: kubeconfigOpts,
}, {provider: awsProvider});

// Export the cluster kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Export the cluster kubeconfig with the AWS_PROFILE set.
export const kubeconfigWithProfile = cluster.getKubeconfig({profileName: profileName})
