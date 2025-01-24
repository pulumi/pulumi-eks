import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as iam from "./iam";

const config = new pulumi.Config();
const instanceType = config.require("instanceType");
const availabilityZones = config.require("availabilityZones").split(",");

const eksVpc = new awsx.ec2.Vpc("efa", {
    cidrBlock: "10.0.0.0/16",
    subnetStrategy: "Auto",
    availabilityZoneNames: availabilityZones,
});

const role = iam.createRole("efa");

const cluster = new eks.Cluster("efa", {
    authenticationMode: eks.AuthenticationMode.Api,
    vpcId: eksVpc.vpcId,
    publicSubnetIds: eksVpc.publicSubnetIds,
    privateSubnetIds: eksVpc.privateSubnetIds,
    skipDefaultNodeGroup: true,
});

export const kubeconfig = cluster.kubeconfig;

// node group to run system pods (e.g. kube-proxy, coredns, etc.)
const systemMng = new eks.ManagedNodeGroup("system-mng", {
    cluster: cluster,
    subnetIds: eksVpc.privateSubnetIds,
    nodeRole: role,
});

// install the EFA device plugin to configure EFA on the nodes
const efaDevicePlugin = new k8s.helm.v3.Release("efa-device-plugin", {
    version: "0.5.7",
    chart: "aws-efa-k8s-device-plugin",
    repositoryOpts: {
        repo: "https://aws.github.io/eks-charts",
    },
    namespace: "kube-system",
    atomic: true,
    values: {
        tolerations: [{
            key: "efa-enabled",
            operator: "Exists",
            effect: "NoExecute",
        }],
    }
}, { provider: cluster.provider });

// node group to run EFA enabled workloads
const efaMng = new eks.ManagedNodeGroup("efa-mng", {
    cluster: cluster,
    instanceTypes: [instanceType],
    // EFA needs at least 2 instances, otherwise there's nothing to communicate with
    scalingConfig: {
        minSize: 2,
        maxSize: 2,
        desiredSize: 2,
    },
    gpu: true,
    nodeRole: role,
    enableEfaSupport: true,
    placementGroupAvailabilityZone: availabilityZones[0],

    // taint the nodes so that only pods with the efa-enabled label can be scheduled on them
    taints: [{
        key: "efa-enabled",
        value: "true",
        effect: "NO_EXECUTE",
    }],

    // Instances with GPUs usually have nvme instance store volumes, so we can mount them in RAID-0 for kubelet and containerd
    // These are faster than the regular EBS volumes
    nodeadmExtraOptions: [{
        contentType: "application/node.eks.aws",
        content: `
apiVersion: node.eks.aws/v1alpha1
kind: NodeConfig
spec:
  instance:
    localStorage:
      strategy: RAID0
`
    }]
}, { dependsOn: [efaDevicePlugin] });

export const placementGroupName = efaMng.placementGroupName;
