import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as aws from "@pulumi/aws";
import * as random from "@pulumi/random";

const eksVpc = new awsx.ec2.Vpc("eks-vpc", {
    enableDnsHostnames: true,
    cidrBlock: "10.0.0.0/16",
    numberOfAvailabilityZones: 2,
    subnetStrategy: "Auto",
});

const nodeRole = new aws.iam.Role("eks-node-role", {
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

const randomId = new random.RandomId("random-id", {
    byteLength: 8,
});

new eks.Cluster("eks-cluster-unknown-compute-config", {
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

new eks.Cluster("eks-cluster-unknown-ip-family", {
    vpcId: eksVpc.vpcId,
    authenticationMode: eks.AuthenticationMode.Api,
    publicSubnetIds: eksVpc.publicSubnetIds,
    privateSubnetIds: eksVpc.privateSubnetIds,
    ipFamily: randomId.dec.apply(_ => "ipv4"),
    autoMode: {
        enabled: true,
    }
});

new eks.Cluster("auto-mode", {
    vpcId: eksVpc.vpcId,
    authenticationMode: eks.AuthenticationMode.Api,
    publicSubnetIds: eksVpc.publicSubnetIds,
    privateSubnetIds: eksVpc.privateSubnetIds,
    autoMode: {
        enabled: true,
    }
});

new eks.Cluster("regular-cluster", {
    vpcId: eksVpc.vpcId,
    authenticationMode: eks.AuthenticationMode.Api,
    publicSubnetIds: eksVpc.publicSubnetIds,
    privateSubnetIds: eksVpc.privateSubnetIds,
});
