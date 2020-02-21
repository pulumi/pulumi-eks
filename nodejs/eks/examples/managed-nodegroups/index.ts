import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

// IAM roles for the node groups.
const role0 = iam.createRole("example-role0");
const role1 = iam.createRole("example-role1");
const role2 = iam.createRole("example-role2");

// Create an EKS cluster.
const cluster = new eks.Cluster("example-managed-nodegroups", {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    instanceRoles: [role0, role1, role2],
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Create a simple AWS managed node group using a cluster as input and the
// refactored API.
const managedNodeGroup0 = eks.createManagedNodeGroup("example-managed-ng0", {
    cluster: cluster,
    nodeRole: role0,
});

// Create a simple AWS managed node group using a cluster as input and the
// initial API.
const managedNodeGroup1 = eks.createManagedNodeGroup("example-managed-ng1", {
    cluster: cluster,
    nodeGroupName: "aws-managed-ng1",
    nodeRoleArn: role1.arn,
}, cluster);

// Create an explicit AWS managed node group using a cluster as input and the
// initial API.
const managedNodeGroup2 = eks.createManagedNodeGroup("example-managed-ng2", {
    cluster: cluster,
    nodeGroupName: "aws-managed-ng2",
    nodeRoleArn: role2.arn,
    scalingConfig: {
        desiredSize: 1,
        minSize: 1,
        maxSize: 2,
    },
    diskSize: 20,
    instanceTypes: "t2.medium",
    labels: {"ondemand": "true"},
    tags: {"org": "pulumi"},
}, cluster);
