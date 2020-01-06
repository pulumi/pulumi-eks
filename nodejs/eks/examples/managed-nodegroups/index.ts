import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

// IAM roles for the node groups.
const role1 = iam.createRole("example-role1");
const role2 = iam.createRole("example-role2");

// Create an EKS cluster.
const cluster = new eks.Cluster("example-managed-nodegroups", {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    instanceRoles: [role1, role2],
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Create a simple AWS managed node group using a cluster as input.
const managedNodeGroup1 = eks.createManagedNodeGroup("example-managed-ng1", {
    cluster: cluster,
    nodeRole: role1,
});

// Create an explicit AWS managed node group using a cluster as input.
const managedNodeGroup2 = eks.createManagedNodeGroup("example-managed-ng2", {
    cluster: cluster,
    nodeGroupName: "aws-managed-ng",
    nodeRoleArn: role2.arn,
    scalingConfig: {
        desiredSize: 1,
        minSize: 1,
        maxSize: 2,
    },
    diskSize: 20,
    instanceTypes: "t2.medium",
    labels: {"ondemand": "true"},
    releaseVersion: "1.14.7-20190927",
    tags: {"org": "pulumi"},
    version: "1.14",
});
