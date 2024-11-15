import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as process from "process";

const projectName = pulumi.getProject();

if (!process.env.AWS_REGION) {
  throw new Error("AWS_REGION must be set");
}

// AWS named profile to use.
const profileName = "aws-profile-node";
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
const kubeconfigOpts: eks.KubeconfigOptions = { profileName: profileName };

// Create the cluster using the AWS provider and credential opts.
const cluster = new eks.Cluster(
  `${projectName}`,
  {
    providerCredentialOpts: kubeconfigOpts,
    corednsAddonOptions: { enabled: false }, // Speed up the test.
  },
  { provider: awsProvider }
);

// Export the cluster kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Export the cluster kubeconfig with the AWS_PROFILE set.
export const kubeconfigWithProfile = cluster.getKubeconfig({
  profileName: profileName,
}).result;

const k8sProvider = new k8s.Provider("with-kubeconfig", {
  kubeconfig: kubeconfigWithProfile,
});

// Deploy something into the cluster so upgrade tests can check for unexpected
// replacements.
new k8s.core.v1.ConfigMap(
  "cm",
  {
    data: { foo: "bar" },
  },
  { provider: k8sProvider }
);
