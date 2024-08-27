import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

const projectName = pulumi.getProject();

// Create an EKS cluster with the default configuration.
const cluster = new eks.Cluster(`${projectName}-1`);

// Create a VPC CNI resource for the cluster.
// We have to use a strigified version of the kubeconfig because earlier versions
// of the EKS provider did not parse the kubeconfig correctly.
// https://github.com/pulumi/pulumi-eks/issues/1092
const vpcCni = new eks.VpcCni(`${projectName}-1-cni`, { kubeconfig: cluster.kubeconfigJson });


// Export the clusters' kubeconfig.
export const kubeconfig = cluster.kubeconfigJson;
