import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as aws from "@pulumi/aws";

const eksVpc = new awsx.ec2.Vpc("auto-mode-custom-role", {
    enableDnsHostnames: true,
    cidrBlock: "10.0.0.0/16",
    numberOfAvailabilityZones: 2,
    subnetStrategy: "Auto",
});

const nodeRole = new aws.iam.Role("auto-mode-custom-role", {
    assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
        version: "2012-10-17",
        statements: [{
            effect: "Allow",
            principals: [{
                type: "Service",
                identifiers: ["ec2.amazonaws.com"]
            }],
            actions: ["sts:AssumeRole", "sts:TagSession"]
        }]
    }).json
});

const attachments = [
    new aws.iam.RolePolicyAttachment("eks-node-role-policy-worker-node-minimal", {
        role: nodeRole,
        policyArn: "arn:aws:iam::aws:policy/AmazonEKSWorkerNodeMinimalPolicy",
    }),
    new aws.iam.RolePolicyAttachment("eks-node-role-policy-ecr-pull", {
        role: nodeRole,
        policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly",
    }),
];

const cluster = new eks.Cluster("auto-mode-custom-role", {
    vpcId: eksVpc.vpcId,
    authenticationMode: eks.AuthenticationMode.Api,
    publicSubnetIds: eksVpc.publicSubnetIds,
    privateSubnetIds: eksVpc.privateSubnetIds,
    autoMode: {
        enabled: true,
        createNodeRole: false,
        computeConfig: {
            nodeRoleArn: nodeRole.arn,
        }
    }
}, { dependsOn: [...attachments] });

export const kubeconfig = cluster.kubeconfig;
