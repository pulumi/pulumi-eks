import * as aws from '@pulumi/aws';
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

const projectName = pulumi.getProject();

// Creates a role and attaches the EKS worker node IAM managed policies.
export function createRole(name: string): aws.iam.Role {
    const managedPolicyArns: string[] = [
        "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
        "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
        "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    ];

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

// Create an EKS cluster without specifying instanceRoles with the role used by
// the managed node group below.
const cluster = new eks.Cluster(`${projectName}`, {
    skipDefaultNodeGroup: true,
    deployDashboard: false,
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

// Create a managed node group using a cluster as input.
eks.createManagedNodeGroup(`${projectName}-managed-ng`, {
    cluster: cluster,
    nodeRole: createRole("role0"),
});
