import * as awsx from '@pulumi/awsx';
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";
import * as iam from "../iam";
import {GetParameterCommand, SSMClient} from "@aws-sdk/client-ssm";

const eksVpc = new awsx.ec2.Vpc("eks-vpc", {
    enableDnsHostnames: true,
    cidrBlock: "10.0.0.0/16",
  });

// IAM roles for the node groups.
const role = iam.createRole("example-role");

const projectName = pulumi.getProject();

const cluster = new eks.Cluster(`${projectName}`, {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    vpcId: eksVpc.vpcId,
    // Public subnets will be used for load balancers
    publicSubnetIds: eksVpc.publicSubnetIds,
    // Private subnets will be used for cluster nodes
    privateSubnetIds: eksVpc.privateSubnetIds,
    instanceRoles: [role],
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Find the recommended AMI for the EKS node group.
// See https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
async function getEksAmiId(k8sVersion: string): Promise<string> {
    const client = new SSMClient();
    const parameterName = `/aws/service/eks/optimized-ami/${k8sVersion}/amazon-linux/recommended/image_id`;
    const command = new GetParameterCommand({ Name: parameterName });
    const response = await client.send(command);

    if (!response.Parameter || !response.Parameter.Value) {
        throw new Error(`Could not find EKS optimized AMI for Kubernetes version ${k8sVersion}`);
    }

    return response.Parameter.Value;
}

const amiId = cluster.eksCluster.version.apply(version => pulumi.output(getEksAmiId(version)));

// Create a managed node group using a cluster as input.
eks.createManagedNodeGroup(`${projectName}-managed-ng`, {
    cluster: cluster,
    nodeRole: role,
    amiId: amiId,
});
