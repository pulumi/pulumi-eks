import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { config } from "./config";
import * as echoserver from "./echoserver";
import * as iam from "./iam";
import * as nginx from "./nginx";
import * as utils from "./utils";

const projectName = pulumi.getProject();

// Allocate a new VPC with custom settings, and a public & private subnet per AZ.
const vpc = new awsx.ec2.Vpc(`${projectName}`, {
    cidrBlock: "172.16.0.0/16",
    tags: { "Name": `${projectName}` },
});

// Export VPC ID and Subnets.
export const vpcId = vpc.id;

// Create IAM Role and matching InstanceProfile to use with the nodegroups.
const roles = iam.createRoles(projectName, 1);
const instanceProfiles = iam.createInstanceProfiles(projectName, roles);

// Create an EKS cluster.
const myCluster = new eks.Cluster(`${projectName}`, {
    vpcId: vpcId,
    publicSubnetIds: vpc.publicSubnetIds,
    privateSubnetIds: vpc.privateSubnetIds,
    nodeAssociatePublicIpAddress: false,
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    instanceRoles: roles,
    enabledClusterLogTypes: ["api", "audit", "authenticator",
        "controllerManager", "scheduler"],
});
export const kubeconfig = myCluster.kubeconfig;
export const clusterName = myCluster.core.cluster.name;

// Create a Standard node group of t2.medium workers.
const ngStandard = utils.createNodeGroup(`${projectName}-ng-standard`, {
    instanceType: "t2.medium",
    desiredCapacity: 3,
    cluster: myCluster,
    instanceProfile: instanceProfiles[0],
});

// Create a 2xlarge node group of t3.2xlarge workers with taints on the nodes
// dedicated for the NGINX Ingress Controller.
if (config.createNodeGroup2xlarge) {
    const ng2xlarge = utils.createNodeGroup(`${projectName}-ng-2xlarge`, {
        instanceType: "t3.2xlarge",
        desiredCapacity: config.desiredCapacity2xlarge,
        cluster: myCluster,
        instanceProfile: instanceProfiles[0],
        taints: {"nginx": { value: "true", effect: "NoSchedule"}},
    });
}

// Create a 4xlarge node group of c5.4xlarge workers. This new node group will
// be used to migrate NGINX away from the 2xlarge node group.
if (config.createNodeGroup4xlarge) {
    const ng4xlarge = utils.createNodeGroup(`${projectName}-ng-4xlarge`, {
        instanceType: "c5.4xlarge",
        desiredCapacity: config.desiredCapacity4xlarge,
        cluster: myCluster,
        instanceProfile: instanceProfiles[0],
        taints: {"nginx": { value: "true", effect: "NoSchedule"}},
    });
}

// Create a Namespace for NGINX Ingress Controller and the echoserver workload.
const namespace = new k8s.core.v1.Namespace("apps", undefined, { provider: myCluster.provider });
export const namespaceName = namespace.metadata.name;

// Deploy the NGINX Ingress Controller on the specified node group.
const image: string = "quay.io/kubernetes-ingress-controller/nginx-ingress-controller:0.25.0";
const ingressClass: string = "my-nginx-class";
export let nginxServiceUrl = pulumi.output("");
if (config.deployWorkload) {
    const nginxService = nginx.create("nginx-ing-cntlr", {
        image: image,
        replicas: 3,
        namespace: namespaceName,
        ingressClass: ingressClass,
        provider: myCluster.provider,
        nodeSelectorTermValues: config.nginxNodeSelectorTermValues,
    });
    nginxServiceUrl = nginxService.status.loadBalancer.ingress[0].hostname;

    // Deploy the echoserver Workload on the Standard node group.
    const echoserverDeployment = echoserver.create("echoserver", {
        replicas: 3,
        namespace: namespaceName,
        ingressClass: ingressClass,
        provider: myCluster.provider,
    });
}
