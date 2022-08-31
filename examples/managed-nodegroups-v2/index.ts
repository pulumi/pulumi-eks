import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

// IAM roles for the node groups.
const role0 = iam.createRole("example-role0");


// Create an EKS cluster.
const cluster = new eks.Cluster("example-nodegroups-v2", {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    instanceRoles: [role0],
});

const instanceProfile = new aws.iam.InstanceProfile("example-nodegroups-v2", {
    role: role0,
})

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;


// Create a simple AWS managed node group using a cluster as input and the
// refactored API.
const nodes = new eks.NodeGroupV2("example-nodegroup-v2", {
    cluster: cluster,
    instanceProfile: instanceProfile,
    keyName: "lbriggs",
})
