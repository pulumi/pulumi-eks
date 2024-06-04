import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

/**
 * Identical IAM for all NodeGroups: all NodeGroups share the same `instanceRole`.
 */

// Create example IAM roles and profiles to show to use them with NodeGroups.
// Note, all roles for the instance profiles are required to at least have
// the following EKS Managed Policies attached to successfully auth and join the
// cluster:
//   - "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
//   - "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
//   - "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
const role0 = iam.createRole("example-role0");
const instanceProfile0 = new aws.iam.InstanceProfile("example-instanceProfile0", {role: role0});

// Create an EKS cluster with a shared IAM instance role to register with the
// cluster auth.
const cluster1 = new eks.Cluster("example-nodegroup-iam-simple", {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    nodeAmiId: "ami-0384725f0d30527c7",
    instanceRole: role0,
});

// There are two approaches that can be used to add additional NodeGroups.
// 1. A `createNodeGroup` API on `eks.Cluster`
// 2. A `NodeGroup` resource which accepts an `eks.Cluster` as input

// Create the node group using an `instanceProfile` tied to the shared, cluster
// instance role registered with the cluster auth through `instanceRole`.
cluster1.createNodeGroup("example-ng-simple-ondemand", {
    instanceType: "t3.medium",
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    amiId: "ami-0384725f0d30527c7",
    labels: {"ondemand": "true"},
    instanceProfile: instanceProfile0,
});

const ng = new eks.NodeGroupV2("example-ng2-simple-ondemand", {
    cluster: cluster1,
    instanceType: "t3.medium",
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    amiId: "ami-0384725f0d30527c7",
    labels: {"ondemand": "true"},
    instanceProfile: instanceProfile0,
});

// Create the second node group with spot t3.medium instance
const spot = new eks.NodeGroup("example-ng-simple-spot", {
    cluster: cluster1,
    instanceType: "t3.medium",
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    amiId: "ami-0384725f0d30527c7",
    spotPrice: "1",
    labels: {"preemptible": "true"},
    taints: {
        "special": {
            value: "true",
            effect: "NoSchedule",
        },
    },
    bootstrapExtraArgs: "--aws-api-retry-attempts 10",
    instanceProfile: instanceProfile0,
}, {
    providers: { kubernetes: cluster1.provider},
});

const withLaunchTemplateTagSpecifications = new eks.NodeGroupV2("example-ng2-launchtemplate-tags", {
    cluster: cluster1,
    instanceType: "t3.medium",
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    amiId: "ami-0384725f0d30527c7",
    labels: { "ondemand": "true" },
    instanceProfile: instanceProfile0,
    launchTemplateTagSpecifications: [
        {
            resourceType: "instance",
            tags: {
                "foo": "bar",
            },
        },
        {
            resourceType: "volume",
            tags: {
                "foo2": "bar2",
            },
        },
    ],
});

// Export the cluster's kubeconfig.
export const kubeconfig1 = cluster1.kubeconfig;

/**
 * Per NodeGroup IAM: each NodeGroup will bring its own, specific instance
 * role and profile.
 */

const role1 = iam.createRole("example-role1");
const role2 = iam.createRole("example-role2");
const role3 = iam.createRole("example-role3");
const instanceProfile1 = new aws.iam.InstanceProfile("example-instanceProfile1", {role: role1});
const instanceProfile2 = new aws.iam.InstanceProfile("example-instanceProfile2", {role: role2});
const instanceProfile3 = new aws.iam.InstanceProfile("example-instanceProfile3", {role: role3});

// Create an EKS cluster with many IAM roles to register with the cluster auth.
const cluster2 = new eks.Cluster("example-nodegroup-iam-advanced", {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    instanceRoles: [role1, role2, role3],
    nodeAmiId: "ami-0384725f0d30527c7",
});

// Create node groups using a different `instanceProfile` tied to one of the many
// instance roles registered with the cluster auth through `instanceRoles`.
cluster2.createNodeGroup("example-ng-advanced-ondemand", {
    instanceType: "t3.medium",
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    amiId: "ami-0384725f0d30527c7",
    labels: {"ondemand": "true"},
    instanceProfile: instanceProfile1,
});

const ng2 = new eks.NodeGroupV2("example-ng-advanced-ondemand", {
    cluster: cluster2,
    instanceType: "t3.medium",
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    amiId: "ami-0384725f0d30527c7",
    labels: {"ondemand": "true"},
    instanceProfile: instanceProfile2,
});

const spot2 = new eks.NodeGroup("example-ng-advanced-spot", {
    cluster: cluster2,
    instanceType: "t3.medium",
    desiredCapacity: 1,
    spotPrice: "1",
    minSize: 1,
    maxSize: 2,
    amiId: "ami-0384725f0d30527c7",
    labels: {"preemptible": "true"},
    taints: {
        "special": {
            value: "true",
            effect: "NoSchedule",
        },
    },
    instanceProfile: instanceProfile3,
}, {
    providers: { kubernetes: cluster2.provider},
});



// Export the cluster's kubeconfig.
export const kubeconfig2 = cluster2.kubeconfig;
