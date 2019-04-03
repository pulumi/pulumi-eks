import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

/**
 * Identical IAM for all NodeGroups: all NodeGroups share the same `instanceRole`.
 */

// Create example IAM roles and profiles to show to use them with NodeGroups.
// Note, all roles for the instance profiles are requried to at least have
// the following EKS Managed Policies attached to successfully auth and join the
// cluster:
//   - "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
//   - "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
//   - "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
const role0 = iam.createRole("myrole0");
const instanceProfile0 = new aws.iam.InstanceProfile("myInstanceProfile0", {role: role0});

// Create an EKS cluster with a shared IAM instance role to register with the
// cluster auth.
const cluster1 = new eks.Cluster("nodegroup-iam-simple", {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    instanceRole: role0,
});

// There are two approaches that can be used to add additional NodeGroups.
// 1. A `createNodeGroup` API on `eks.Cluster`
// 2. A `NodeGroup` resource which accepts an `eks.Cluster` as input

// Create the node group using an `instanceProfile` tied to the shared, cluster
// instance role registered with the cluster auth through `instanceRole`.
cluster1.createNodeGroup("ng-simple-ondemand", {
    instanceType: "t2.large",
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    labels: {"ondemand": "true"},
    instanceProfile: instanceProfile0,
});

// Create the second node group with spot m4.large instance
const spot = new eks.NodeGroup("ng-simple-spot", {
    cluster: cluster1,
    instanceType: "m4.large",
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    spotPrice: "1",
    labels: {"preemptible": "true"},
    taints: {
        "special": {
            value: "true",
            effect: "NoSchedule",
        },
    },
    instanceProfile: instanceProfile0,
}, {
    providers: { kubernetes: cluster1.provider},
});

// Export the cluster's kubeconfig.
export const kubeconfig1 = cluster1.kubeconfig;

/**
 * Per NodeGroup IAM: each NodeGroup will bring its own, specific instance
 * role and profile.
 */

const role1 = iam.createRole("myrole1");
const role2 = iam.createRole("myrole2");
const instanceProfile1 = new aws.iam.InstanceProfile("myInstanceProfile1", {role: role1});
const instanceProfile2 = new aws.iam.InstanceProfile("myInstanceProfile2", {role: role2});

// Create an EKS cluster with many IAM roles to register with the cluster auth.
const cluster2 = new eks.Cluster("nodegroup-iam-advanced", {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    instanceRoles: [role1, role2],
});

// Create node groups using a different `instanceProfile` tied to one of the many
// instance roles registered with the cluster auth through `instanceRoles`.
cluster2.createNodeGroup("ng-advanced-ondemand", {
    instanceType: "t2.large",
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    labels: {"ondemand": "true"},
    instanceProfile: instanceProfile1,
});

const spot2 = new eks.NodeGroup("ng-advanced-spot", {
    cluster: cluster2,
    instanceType: "m4.large",
    desiredCapacity: 1,
    spotPrice: "1",
    minSize: 1,
    maxSize: 2,
    labels: {"preemptible": "true"},
    taints: {
        "special": {
            value: "true",
            effect: "NoSchedule",
        },
    },
    instanceProfile: instanceProfile2,
}, {
    providers: { kubernetes: cluster2.provider},
});


// Export the cluster's kubeconfig.
export const kubeconfig2 = cluster2.kubeconfig;
