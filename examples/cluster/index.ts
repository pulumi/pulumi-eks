import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

const projectName = pulumi.getProject();

// Create an EKS cluster with a non-default configuration.
const vpc = new awsx.ec2.Vpc(`${projectName}-2`, {
  tags: { Name: `${projectName}-2` },
});

////////////////////////////
///     EKS Clusters     ///
////////////////////////////

// Create an EKS cluster with the default configuration.
const cluster1 = new eks.Cluster(`${projectName}-1`, {
    nodeAmiId: "ami-0384725f0d30527c7",
});

const cluster2 = new eks.Cluster(`${projectName}-2`, {
    vpcId: vpc.vpcId,
    publicSubnetIds: vpc.publicSubnetIds,
    desiredCapacity: 2,
    minSize: 2,
    maxSize: 2,
    nodeAmiId: "ami-0384725f0d30527c7",
    enabledClusterLogTypes: [
        "api",
        "audit",
        "authenticator",
    ],
    vpcCniOptions: {
        disableTcpEarlyDemux: true,
    },
});

const cluster3 = new eks.Cluster(`${projectName}-3`, {
    vpcId: vpc.vpcId,
    publicSubnetIds: vpc.publicSubnetIds,
    nodeGroupOptions: {
        amiId: "ami-0384725f0d30527c7",
        desiredCapacity: 1,
        minSize: 1,
        maxSize: 1,
        instanceType: pulumi.output(Promise.resolve("t3.small")),
        enableDetailedMonitoring: false,
    }
})

// cluster4 is a graviton cluster to test the ARM64 architecture
// can be successfully provisioned.
const cluster4 = new eks.Cluster(`${projectName}-4`, {
    vpcId: vpc.vpcId,
    publicSubnetIds: vpc.publicSubnetIds,
    nodeAmiId: "ami-0350263ff18287b83",
    instanceType: "t4g.small",
})

//////////////////////////
///     EKS Addons     ///
//////////////////////////

// Test that we can create a coredns addon within cluster3.
const coredns = new eks.Addon("coredns", {
  cluster: cluster3,
  addonName: "coredns",
  addonVersion: "v1.11.1-eksbuild.9",
  resolveConflictsOnUpdate: "PRESERVE",
  configurationValues: {
    replicaCount: 4,
    resources: {
      limits: {
        cpu: "100m",
        memory: "150Mi",
      },
      requests: {
        cpu: "100m",
        memory: "150Mi",
      },
    },
  },
});

// Export the clusters' kubeconfig.
export const kubeconfig1: pulumi.Output<any> = cluster1.kubeconfig;
export const kubeconfig2: pulumi.Output<any> = cluster2.kubeconfig;
export const kubeconfig3: pulumi.Output<any> = cluster3.kubeconfig;
export const kubeconfig4: pulumi.Output<any> = cluster4.kubeconfig;

// export the IAM Role ARN of the cluster
export const iamRoleArn: pulumi.Output<string> = cluster1.core.clusterIamRole.arn;
