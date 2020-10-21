import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

const projectName = pulumi.getProject();

const managedPolicyArns: string[] = [
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
];

// Creates a role and attches the EKS worker node IAM managed policies
export function createRole(name: string): aws.iam.Role {
    const role = new aws.iam.Role(name, {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: "ec2.amazonaws.com",
        }),
    });

    let counter = 0;
    for (const policy of managedPolicyArns) {
        // Create RolePolicyAttachment without returning it.
        const rpa = new aws.iam.RolePolicyAttachment(`${name}-policy-${counter++}`,
            { policyArn: policy, role: role },
        );
    }

    return role;
}

// Create an EKS cluster.
const ngRole = createRole("example-role");
const ngInstanceProfile = new aws.iam.InstanceProfile("example-instanceProfile", {role: ngRole});
const cluster = new eks.Cluster(`${projectName}`, {
    skipDefaultNodeGroup: true,
    instanceRoles: [ngRole],
});

// Export the cluster kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Create a custom security group and its rules.
const customSecurityGroup = new aws.ec2.SecurityGroup(`mySecurityGroup`, {
    vpcId: cluster.core.vpcId,
    revokeRulesOnDelete: true,
});

const nodeIngressRule = new aws.ec2.SecurityGroupRule("nodeIngressRule", {
    description: "Allow all ingress into the worker nodes from the security group",
    type: "ingress",
    fromPort: 0,
    toPort: 65535,
    protocol: "tcp",
    securityGroupId: cluster.nodeSecurityGroup.id,
    sourceSecurityGroupId: customSecurityGroup.id,
});

const publicInternetHttpIngressRule = new aws.ec2.SecurityGroupRule("internetHttpEgressRule", {
    description: "Allow ingress from internet clients over HTTP",
    type: "ingress",
    fromPort: 80,
    toPort: 80,
    protocol: "tcp",
    cidrBlocks: [ "0.0.0.0/0" ],
    securityGroupId: customSecurityGroup.id,
});

const publicInternetEgressRule = new aws.ec2.SecurityGroupRule("nodeIternetEgressRule", {
    description: "Allow egress to internet",
    type: "egress",
    fromPort: 0,
    toPort: 0,
    protocol: "-1",  // all
    cidrBlocks: [ "0.0.0.0/0" ],
    securityGroupId: customSecurityGroup.id,
});

// Create a node group that attaches extra security groups.
cluster.createNodeGroup("example-ng", {
    instanceProfile: ngInstanceProfile,
    extraNodeSecurityGroups: [customSecurityGroup],
});
