import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import { SubnetType } from "@pulumi/awsx/ec2";

const config = new pulumi.Config();
const clusterName = config.require("clusterName");

const eksVpc = new awsx.ec2.Vpc("eks-auto-mode", {
    enableDnsHostnames: true,
    cidrBlock: "10.0.0.0/16",
    subnetSpecs: [
        // Necessary tags for EKS Auto Mode to identify the subnets for the load balancers.
        // See: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.1/deploy/subnet_discovery/
        {type: SubnetType.Public, tags: {[`kubernetes.io/cluster/${clusterName}`]: "shared", "kubernetes.io/role/elb": "1"}},
        {type: SubnetType.Private, tags: {[`kubernetes.io/cluster/${clusterName}`]: "shared", "kubernetes.io/role/internal-elb": "1"}},
    ],
    subnetStrategy: "Auto"
});

const cluster = new eks.Cluster("eks-auto-mode", {
    name: clusterName,
    // EKS Auto Mode requires Access Entries, use either the `Api` or `ApiAndConfigMap` authentication mode.
    authenticationMode: eks.AuthenticationMode.Api,
    vpcId: eksVpc.vpcId,
    publicSubnetIds: eksVpc.publicSubnetIds,
    privateSubnetIds: eksVpc.privateSubnetIds,

    // Enables compute, storage and load balancing for the cluster.
    autoMode: {
        enabled: true,
    }
});

const appName = "nginx";
const ns = new k8s.core.v1.Namespace(appName, {
    metadata: { name: appName },
}, { provider: cluster.provider });

const configMap = new k8s.core.v1.ConfigMap(appName, {
    metadata: {
        namespace: ns.metadata.name,
    },
    data: {
        "index.html": "<html><body><h1>Hello, Pulumi!</h1></body></html>",
    },
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
                    volumeMounts: [{ name: "nginx-index", mountPath: "/usr/share/nginx/html" }],
                }],
                volumes: [{
                    name: "nginx-index",
                    configMap: { name: configMap.metadata.name },
                }],
            },
        },
    },
}, { provider: cluster.provider });

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

const ingressClass = new k8s.networking.v1.IngressClass("alb", {
    metadata: {
        namespace: ns.metadata.name,
        labels: {
            "app.kubernetes.io/name": "LoadBalancerController",
        },
        name: "alb",
    },
    spec: {
        controller: "eks.amazonaws.com/alb",
    }
}, { provider: cluster.provider });

const ingress = new k8s.networking.v1.Ingress(appName, {
    metadata: {
        namespace: ns.metadata.name,
        // Annotations for EKS Auto Mode to identify the Ingress as internet-facing and target-type as IP.
        annotations: {
            "alb.ingress.kubernetes.io/scheme": "internet-facing",
            "alb.ingress.kubernetes.io/target-type": "ip",
        }
    },
    spec: {
        ingressClassName: ingressClass.metadata.name,
        rules: [{
            http: {
                paths: [{
                    path: "/",
                    pathType: "Prefix",
                    backend: {
                        service: {
                            name: service.metadata.name,
                            port: {
                                number: 80,
                            },
                        },
                    },
                }],
            },
        }],
    }
}, { provider: cluster.provider });

export const defaultNodeGroup = cluster.defaultNodeGroupAsgName;
export const nodeRoleName = cluster.autoModeNodeRoleName;
export const url = ingress.status.loadBalancer.ingress[0].hostname.apply(h => `http://${h}:80`);
