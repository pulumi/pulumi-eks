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

const clusterConfigMap = new eks.Cluster(`${projectName}-cluster`, {
    vpcId: vpc.vpcId,
    publicSubnetIds: vpc.publicSubnetIds,
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    authenticationMode: "CONFIG_MAP",
    roleMappings: [
        {
            roleArn: iamRole.arn,
            groups: ["test-group"],
            username: "test-role",
        }
    ],
});

const clusterBoth = new eks.Cluster(`${projectName}-cluster-both`, {
    vpcId: vpc.vpcId,
    publicSubnetIds: vpc.publicSubnetIds,
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    authenticationMode: "API_AND_CONFIG_MAP",
    roleMappings: [
        {
            roleArn: iamRole.arn,
            groups: ["test-group"],
            username: "test-role",
        }
    ],
    accessEntries: {
        [`${projectName}-role`]: {
            principalArn: iamRole.arn,
            kubernetesGroups: ["test-group"],
            accessPolicies: {
                "view": {
                    accessScope: {
                        type: "namespace",
                        namespaces: ["default"],
                    },
                    policyArn: "arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy",
                }
            }
        }
    }
});

const clusterApi = new eks.Cluster(`${projectName}-cluster-api`, {
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
            accessPolicies: {
                "view": {
                    accessScope: {
                        type: "namespace",
                        namespaces: ["default"],
                    },
                    policyArn: "arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy",
                }
            }
        }
    }
});

// Export the clusters' kubeconfig.
export const kubeconfigConfigMap = clusterConfigMap.kubeconfig;
export const kubeconfigBoth = clusterBoth.kubeconfig;
export const kubeconfigApi = clusterApi.kubeconfig;

// export the IAM Role ARN
export const iamRoleArn = iamRole.arn;