import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import { SubnetType } from "@pulumi/awsx/ec2";

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

const nodeRole = new aws.iam.Role("eksNodeRole", {
    assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
        statements: [{
            actions: ["sts:AssumeRole"],
            effect: "Allow",
            principals: [{
                identifiers: ["ec2.amazonaws.com"],
                type: "Service",
            }],
        }],
    }).json,
    managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonEKSWorkerNodeMinimalPolicy",
        "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly"
    ],
});

const cluster = new eks.Cluster("auto-mode-upgrade", {
    name: clusterName,
    skipDefaultNodeGroup: true,
    skipDefaultSecurityGroups: true,
    vpcId: eksVpc.vpcId,
    authenticationMode: eks.AuthenticationMode.Api,
    publicSubnetIds: eksVpc.publicSubnetIds,
    privateSubnetIds: eksVpc.privateSubnetIds,
    bootstrapSelfManagedAddons: true,
    autoMode: {
        enabled: true,
        // An upstream bug currently prevents setting a node role for existing clusters: https://github.com/pulumi/pulumi-aws/issues/4885
        // This also prevents using the default node pools, so we must create a custom node pool.
        createNodeRole: false,
        computeConfig: {
            nodePools: []
        }
    },
    accessEntries: {
        nodeRole: {
            principalArn: nodeRole.arn,
            type: "EC2",
            accessPolicies: {
                autoNode: {
                    policyArn: "arn:aws:eks::aws:cluster-access-policy/AmazonEKSAutoNodePolicy",
                    accessScope: {
                        type: "cluster",
                    },
                }
            }
        }
    }
});

export const nodeRoleName = cluster.autoModeNodeRoleName;
export const kubeconfig = cluster.kubeconfig;

const nodeClass = new k8s.apiextensions.CustomResource("node-class", {
    apiVersion: "eks.amazonaws.com/v1",
    kind: "NodeClass",
    metadata: {
        name: "private-compute",
    },
    spec: {
        subnetSelectorTerms: [{
            tags: {
                [`kubernetes.io/cluster/${clusterName}`]: "shared",
                "kubernetes.io/role/internal-elb": "1"
            }
        }],
        securityGroupSelectorTerms: [{
            id: cluster.eksCluster.vpcConfig.clusterSecurityGroupId,
        }],
        role: nodeRole.name,
    },
}, { provider: cluster.provider, retainOnDelete: true });

const nodePool = new k8s.apiextensions.CustomResource("node-pool", {
    apiVersion: "karpenter.sh/v1",
    kind: "NodePool",
    metadata: {
        name: "default",
    },
    spec: {
        template: {
            spec: {
                nodeClassRef: {
                    group: "eks.amazonaws.com",
                    kind: "NodeClass",
                    name: nodeClass.metadata.name,
                },
                requirements: [
                    {
                        key: "eks.amazonaws.com/instance-category",
                        operator: "In",
                        values: ["c", "m", "r"],
                    },
                    {
                        key: "eks.amazonaws.com/instance-cpu",
                        operator: "In",
                        values: ["4", "8", "16", "32"],
                    },
                    {
                        key: "topology.kubernetes.io/zone",
                        operator: "In",
                        values: ["us-west-2a", "us-west-2b"],
                    },
                    {
                        key: "kubernetes.io/arch",
                        operator: "In",
                        values: ["arm64", "amd64"],
                    },
                ],
            },
        },
        limits: {
            cpu: "50",
            memory: "100Gi",
        },
    },
}, { provider: cluster.provider, retainOnDelete: true });

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
