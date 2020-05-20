import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";
import * as iam from "./iam";
import * as secgroup from "./securitygroup";

const projectName = pulumi.getProject();

// Create an EKS cluster with non-default configuration
const role = iam.createRole(`${projectName}-role`);
const instanceProfile = new aws.iam.InstanceProfile(`${projectName}-instanceProfile`, {role: role});
const vpc = new awsx.ec2.Vpc(`${projectName}`, {
    cidrBlock: "172.16.0.0/16",
    tags: { "Name": `${projectName}` },
});

const testCluster = new eks.Cluster(`${projectName}`, {
    vpcId: vpc.id,
    publicSubnetIds: vpc.publicSubnetIds,
    skipDefaultNodeGroup: true,
    instanceRole: role,
});

// Create an external nodeSecurityGroup for the NodeGroup and set up its rules.
const secgroupName = `${projectName}-extNodeSecurityGroup`;
const nodeSecurityGroup = secgroup.createNodeGroupSecurityGroup(secgroupName, {
    vpcId: vpc.id,
    clusterSecurityGroup: testCluster.clusterSecurityGroup,
    eksCluster: testCluster.core.cluster,
}, testCluster);
const eksClusterIngressRule = new aws.ec2.SecurityGroupRule(`${secgroupName}-eksClusterIngressRule`, {
    description: "Allow pods to communicate with the cluster API Server",
    type: "ingress",
    fromPort: 443,
    toPort: 443,
    protocol: "tcp",
    securityGroupId: testCluster.clusterSecurityGroup.id,
    sourceSecurityGroupId: nodeSecurityGroup.id,
}, { parent: testCluster });

// Create a node group.
const ng = new eks.NodeGroup(`${projectName}-ng`, {
    cluster: testCluster,
    nodeSecurityGroup: nodeSecurityGroup,
    clusterIngressRule: eksClusterIngressRule,
    instanceProfile: instanceProfile,
}, {
    providers: { kubernetes: testCluster.provider},
});

// Export the cluster kubeconfig.
export const kubeconfig = testCluster.kubeconfig;
