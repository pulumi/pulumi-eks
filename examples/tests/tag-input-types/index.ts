import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";
import * as iam from "./iam";

// Create example IAM roles and profiles.
const role0 = iam.createRole("myrole0");
const instanceProfile0 = new aws.iam.InstanceProfile("instanceProfile0", {role: role0});

// Create an EKS cluster with varying, specialized resource tags.
const cluster1 = new eks.Cluster("test-tag-input-types", {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    instanceRole: role0,
    tags: {
        "project": "foo",
        "org": "bar",
    },
    clusterSecurityGroupTags: {"myClusterSecurityGroupTag": "true" },
    nodeSecurityGroupTags: { "myNodeSecurityGroupTag": "true" },
    clusterTags: { "myClusterTag": "true" },
});
const cluster1Name = cluster1.core.cluster.name;

// Create a node group with the following autoScalingGroupTags.
const autoScalingGroupTags: pulumi.Input<{ [key: string]: pulumi.Input<string> }> = cluster1Name.apply(clusterName => ({
    "myAutoScalingGroupTag1": "true",
    "myOtherAutoScalingGroupTag2": clusterName,
    [`k8s.io/cluster-autoscaler/${clusterName}`]: "true",
    "k8s.io/cluster-autoscaler/enabled": "true",
}));
const ng = new eks.NodeGroup("test-tag-input-types-ondemand", {
    cluster: cluster1,
    instanceProfile: instanceProfile0,
    autoScalingGroupTags: autoScalingGroupTags,
    cloudFormationTags: { "myCloudFormationTag1": "true" },
}, {
    providers: { kubernetes: cluster1.provider},
});

export const kubeconfig = cluster1.kubeconfig;
