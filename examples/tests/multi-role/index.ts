import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as aws from "@pulumi/aws";
import * as iam from "./iam";

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

const accessIamRole = new aws.iam.Role(`${projectName}-role`, {
    assumeRolePolicy: {
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                AWS: aws.getCallerIdentityOutput().arn,
            },
        }],
    },
});

/**
 * Identical IAM for all NodeGroups: all NodeGroups share the same `instanceRole`.
 */
const role0 = iam.createRole("example-role0");
const instanceProfile0 = new aws.iam.InstanceProfile("example-instanceProfile0", {role: role0});

const cluster = new eks.Cluster(`${projectName}-cluster`, {
    vpcId: vpc.vpcId,
    publicSubnetIds: vpc.publicSubnetIds,
    skipDefaultNodeGroup: true,
    authenticationMode: eks.AuthenticationMode.API,
    instanceRole: role0,
    storageClasses: {
        "mygp2": {
            type: "gp2",
            default: true,
            encrypted: true,
        },
    },
    accessEntries: {
        // Grant the IAM role admin access to the cluster
        [`${projectName}-role`]: {
            principalArn: accessIamRole.arn,
            accessPolicies: {
                admin: {
                    policyArn: "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy",
                    accessScope: {
                        type: "cluster",
                    },
                }
            }
        }
    },
    providerCredentialOpts: {
        // Use the IAM role as the provider's credentials source
        roleArn: accessIamRole.arn,
    }
});

cluster.createNodeGroup("example-ng-simple-ondemand", {
    instanceType: "t3.medium",
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    labels: {"ondemand": "true"},
    instanceProfile: instanceProfile0,
});

// Export the clusters' kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// export the IAM Role ARN
export const iamRoleArn = accessIamRole.arn;
