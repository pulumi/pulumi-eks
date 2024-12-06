import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import { SubnetType } from "@pulumi/awsx/ec2";
import * as iam from "./iam";

// IAM roles for the node groups.
const role = iam.createRole("auto-mode-upgrade");

const config = new pulumi.Config();
const clusterName = config.require("clusterName");

const eksVpc = new awsx.ec2.Vpc("auto-mode-upgrade", {
    enableDnsHostnames: true,
    cidrBlock: "10.0.0.0/16",
    subnetSpecs: [
        {type: SubnetType.Public, tags: {[`kubernetes.io/cluster/${clusterName}`]: "shared", "kubernetes.io/role/elb": "1"}},
        {type: SubnetType.Private, tags: {[`kubernetes.io/cluster/${clusterName}`]: "shared", "kubernetes.io/role/internal-elb": "1"}},
    ],
    subnetStrategy: "Auto"
});

const cluster = new eks.Cluster("auto-mode-upgrade", {
    name: clusterName,
    skipDefaultNodeGroup: true,
    skipDefaultSecurityGroups: true,
    vpcId: eksVpc.vpcId,
    authenticationMode: eks.AuthenticationMode.Api,
    publicSubnetIds: eksVpc.publicSubnetIds,
    privateSubnetIds: eksVpc.privateSubnetIds,
});

const mng = new eks.ManagedNodeGroup("auto-mode-upgrade", {
    cluster: cluster,
    instanceTypes: ["t3.medium"],
    operatingSystem: "Bottlerocket",
    scalingConfig: {
        minSize: 2,
        desiredSize: 2,
        maxSize: 4,
    },
    nodeRole: role,
});

export const kubeconfig = cluster.kubeconfig;

const appName = "nginx";
const ns = new k8s.core.v1.Namespace(appName, {
    metadata: { name: appName },
}, { provider: cluster.provider });

const deployment = new k8s.apps.v1.Deployment(appName, {
    metadata: {
        namespace: ns.metadata.name
    },
    spec: {
        selector: { matchLabels: { app: appName } },
        replicas: 3,
        template: {
            metadata: { labels: { app: appName } },
            spec: {
                containers: [{
                    name: appName,
                    image: appName,
                    ports: [{ containerPort: 80 }],
                }],
            },
        },
    },
}, { provider: cluster.provider, dependsOn: [mng] });

const service = new k8s.core.v1.Service(appName, {
    metadata: {
        name: appName,
        namespace: ns.metadata.name
    },
    spec: {
        selector: { app: appName },
        ports: [{ port: 80, targetPort: 80 }],
    },
}, { provider: cluster.provider, dependsOn: [deployment] });
