import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as aws from "@pulumi/aws";

const projectName = pulumi.getProject();

// Create a VPC with public subnets only
const vpc = new awsx.ec2.Vpc(`${projectName}-vpc`, {
    tags: {"Name": `${projectName}-2`},
    subnetSpecs: [
        { type: "Public" }
    ],
    natGateways: {
        strategy: "None",
    }
});

const iamRole = new aws.iam.Role(`${projectName}-role`, {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "ec2.amazonaws.com",
            },
        }],
    })
});

const cluster = new eks.Cluster(`${projectName}-cluster`, {
    vpcId: vpc.vpcId,
    publicSubnetIds: vpc.publicSubnetIds,
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    authenticationMode: "API",
    accessEntries: {
        [`${projectName}-role`]: {
            principalArn: iamRole.arn,
            kubernetesGroups: ["test-group"],
            username: "test-role",
        }
    }
});

// Export the clusters' kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// export the IAM Role ARN
export const iamRoleArn = iamRole.arn;
