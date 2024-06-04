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

/**
 * Identical IAM for all NodeGroups: all NodeGroups share the same `instanceRole`.
 */

// Create example IAM roles and profiles to show to use them with NodeGroups.
// Note, all roles for the instance profiles are required to at least have
// the following EKS Managed Policies attached to successfully auth and join the
// cluster:
//   - "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
//   - "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
//   - "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
const role0 = iam.createRole("example-role0");
const instanceProfile0 = new aws.iam.InstanceProfile("example-instanceProfile0", {role: role0});

const cluster = new eks.Cluster(`${projectName}-cluster`, {
    vpcId: vpc.vpcId,
    publicSubnetIds: vpc.publicSubnetIds,
    desiredCapacity: 1,
    minSize: 1,
    maxSize: 2,
    instanceRole: role0,
    authenticationMode: "API",
    accessEntries: {
        [`${projectName}-role`]: {
            principalArn: iamRole.arn,
            kubernetesGroups: ["test-group"],
            username: "test-role",
        }
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
export const iamRoleArn = iamRole.arn;
