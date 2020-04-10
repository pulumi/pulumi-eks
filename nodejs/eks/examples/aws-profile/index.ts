import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";
import * as process from "process";

const projectName = pulumi.getProject();

// For CI testing only: used to set profileName to alternate AWS_PROFILE envvar.
if (!process.env.ALT_AWS_PROFILE) {
    throw new Error("ALT_AWS_PROFILE must be set");
}

// AWS named profile to use.
const profileName = process.env.ALT_AWS_PROFILE;

// Create an AWS provider instance using the named profile creds
// and current region.
const awsProvider = new aws.Provider("aws-provider", {
    profile: profileName,
    region: <aws.Region>aws.getRegion().name,
});

// Define the AWS provider credential opts to configure the cluster's
// kubeconfig auth.
const kubeconfigOpts: eks.KubeconfigOptions = {profileName: profileName};

// Create the cluster using the AWS provider and credential opts.
const cluster = new eks.Cluster(`${projectName}`, {
    providerCredentialOpts: kubeconfigOpts,
    deployDashboard: false,
}, {provider: awsProvider});

// Export the cluster kubeconfig.
export const kubeconfig = cluster.kubeconfig;
