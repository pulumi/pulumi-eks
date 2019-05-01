import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

// Create an EKS cluster with cluster and resource tags.
const cluster1 = new eks.Cluster("tags-cluster1", {
    instanceType: "t2.medium",
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    tags: {
        "project": "foobar",
        "org": "barfoo",
    },
    clusterSecurityGroupTags: { "myClusterSecurityGroupTag1": "true" },
    deployDashboard: false,
});

// Export the cluster's kubeconfig.
export const kubeconfig1 = cluster1.kubeconfig;

// Create an EKS cluster with no default node group.
const role0 = iam.createRole("tags-myrole0");
const instanceProfile0 = new aws.iam.InstanceProfile("tags-myInstanceProfile0", {role: role0});
const cluster2 = new eks.Cluster("tags-cluster2", {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    instanceRole: role0,
    tags: {
        "project": "foo",
        "org": "bar",
    },
    clusterSecurityGroupTags: { "myClusterSecurityGroupTag2": "true" },
});

// There are two approaches that can be used to add additional NodeGroups.
// 1. A `createNodeGroup` API on `eks.Cluster`
// 2. A `NodeGroup` resource which accepts an `eks.Cluster` as input

// Create the node group using an on-demand instance and resource tags.
cluster2.createNodeGroup("ng-tags-ondemand", {
    instanceType: "t2.medium",
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    labels: {"ondemand": "true"},
    instanceProfile: instanceProfile0,
    nodeSecurityGroupTags: { "myNodeSecurityGroupTag2": "true" },
    autoScalingGroupTags: { "myAutoScalingGroupTag2": "true" },
    cloudFormationTags: { "myCloudFormationTag2": "true" },
});

// Create the second node group using a spot price instance and resource tags.
const spot = new eks.NodeGroup("ng-tags-spot", {
    cluster: cluster2,
    instanceType: "t2.medium",
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    spotPrice: "1",
    instanceProfile: instanceProfile0,
    labels: {"preemptible": "true"},
    taints: {
        "special": {
            value: "true",
            effect: "NoSchedule",
        },
    },
    nodeSecurityGroupTags: { "myNodeSecurityGroupTag3": "true" },
    autoScalingGroupTags: { "myAutoScalingGroupTag3": "true" },
    cloudFormationTags: { "myCloudFormationTag3": "true" },
}, {
    providers: { kubernetes: cluster2.provider},
});

// Export the cluster's kubeconfig.
export const kubeconfig2 = cluster2.kubeconfig;
