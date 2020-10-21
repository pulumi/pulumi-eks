import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

// Create an EKS cluster with cluster and resource tags.
const cluster1 = new eks.Cluster("example-tags-cluster1", {
    instanceType: "t2.medium",
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    tags: {
        "project": "foobar",
        "org": "barfoo",
    },
    clusterSecurityGroupTags: { "myClusterSecurityGroupTag1": "true" },
    nodeSecurityGroupTags: { "myNodeSecurityGroupTag1": "true" },
    clusterTags: { "myClusterTag1": "true" },
    deployDashboard: false,
});

// Export the cluster's kubeconfig.
export const kubeconfig1 = cluster1.kubeconfig;

// Create an EKS cluster with no default node group.
const role0 = iam.createRole("example-tags-role0");
const instanceProfile0 = new aws.iam.InstanceProfile("example-tags-instanceProfile0", {role: role0});
const cluster2 = new eks.Cluster("example-tags-cluster2", {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    instanceRole: role0,
    tags: {
        "project": "foo",
        "org": "bar",
    },
    clusterSecurityGroupTags: { "myClusterSecurityGroupTag2": "true" },
    nodeSecurityGroupTags: { "myNodeSecurityGroupTag2": "true" },
    clusterTags: { "myClusterTag1": "true" },
});

// There are two approaches that can be used to add additional NodeGroups.
// 1. A `createNodeGroup` API on `eks.Cluster`
// 2. A `NodeGroup` resource which accepts an `eks.Cluster` as input

// Create the node group using an on-demand instance and resource tags.
cluster2.createNodeGroup("example-ng-tags-ondemand", {
    instanceType: "t2.medium",
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    labels: {"ondemand": "true"},
    instanceProfile: instanceProfile0,
    cloudFormationTags: { "myCloudFormationTag2": "true" },
});

// Create the second node group using a spot price instance, resource tags, and
// specialized resource tags such as the autoScalingGroupTags.
const spot = new eks.NodeGroup("example-ng-tags-spot", {
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
    autoScalingGroupTags: cluster2.core.cluster.name.apply(clusterName => ({
        "myAutoScalingGroupTag3": "true",
        "k8s.io/cluster-autoscaler/enabled": "true",
        [`k8s.io/cluster-autoscaler/${clusterName}`]: "true",
    })),
}, {
    providers: { kubernetes: cluster2.provider},
});

// Export the cluster's kubeconfig.
export const kubeconfig2 = cluster2.kubeconfig;
