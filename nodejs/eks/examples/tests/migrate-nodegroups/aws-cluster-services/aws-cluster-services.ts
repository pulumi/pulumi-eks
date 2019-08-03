import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as fluentd from "./fluentd-cloudwatch";
import * as k2i from "./kube2iam";

// Policies implements a map of policy name keys, to ARN values
export type Policies = { [name: string]: pulumi.Input<aws.ARN> };

// Creates a new IAM Role, and attaches the specified policies.
export function newRoleWithPolicies(
    name: string,
    args: aws.iam.RoleArgs,
    policies: Policies,
): pulumi.Output<aws.iam.Role> {
    const role = new aws.iam.Role(name, args);
    for (const policy of Object.keys(policies)) {
        // Create RolePolicyAttachment without returning it.
        const rpa = new aws.iam.RolePolicyAttachment(
            name,
            {
                policyArn: policies[policy],
                role: role,
            },
        );
    }
    return pulumi.output(role);
}

// Helper function to create a new IAM Policy.
export function createPolicy(
    name: string,
    args: aws.iam.PolicyArgs,
): aws.iam.Policy {
    const policyArgs: aws.iam.PolicyArgs = args;
    return new aws.iam.Policy(name, policyArgs);
}

// Add the specified policies to the existing IAM Principal
export function addPoliciesToExistingRole(
    name: string,
    role: pulumi.Output<aws.iam.Role>,
    policies: Policies,
) {
    for (const policy of Object.keys(policies)) {
        // Create RolePolicyAttachment without returning it.
        const rpa = new aws.iam.RolePolicyAttachment(
            name,
            {
                policyArn: policies[policy],
                role: role,
            },
        );
    }
}

// Creates an IAM PolicyDocument to allow the User ARN to assume roles.
export function assumeUserRolePolicy(user: aws.ARN): aws.iam.PolicyDocument {
    return {
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Principal: { AWS: [user] },
                Action: "sts:AssumeRole",
            },
        ],
    };
}

// Creates an IAM PolicyDocument to allow the Service ARN to assume roles.
export function assumeServiceRolePolicy(service: aws.ARN): aws.iam.PolicyDocument {
    return {
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Principal: { Service: [service] },
                Action: "sts:AssumeRole",
            },
        ],
    };
}

interface ClusterServicesArgs {
    clusterName: pulumi.Input<string>;
    region: pulumi.Input<string>;
    instanceRoleArn: pulumi.Output<string>;
    namespace: pulumi.Input<string>;
    provider: k8s.Provider;
}
export function create(
    args: ClusterServicesArgs,
): fluentd.FluentdCloudWatch  {
    // Get the IAM role name of the Kubernetes Node / Worker instance profile.
    const instanceRoleName = args.instanceRoleArn.apply(s => s.split("/")).apply(s => s[1]);

    // -- Setup IAM for kube2iam --

    // Create a new IAM Policy for kube2iam to allow k8s Nodes/Workers to assume an
    // IAM role.
    const kube2iamPolicy = createPolicy(
        "kubeIamPolicyKube2Iam",
        {
            description:
            "Allows Kubernetes Workers to assume any role specified by a Pod's annotation.",
            policy: JSON.stringify(
                {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Effect: "Allow",
                            Action: "sts:AssumeRole",
                            Resource: "*",
                        },
                    ],
                },
            ),
        },
    );

    // Attach the kube2iam policy to the node/instance AWS Role for the
    // Kubernetes Nodes / Workers.
    const instanceRole = pulumi.output(aws.iam.Role.get("existingInstanceRole", instanceRoleName));
    addPoliciesToExistingRole(
        "kube2IamPolicy",
        instanceRole,
        {
            "kube2IamPolicy": kube2iamPolicy.arn,
        },
    );

    // -- Deploy kube2iam --

    // Create the kube2iam k8s resource stack.
    const kube2IamArnPrefix = pulumi.concat(args.instanceRoleArn.apply(s => s.split("/")).apply(s => s[0]), "/");

    const kube2Iam = new k2i.Kube2Iam("kube2iam", {
        provider: args.provider,
        namespace: args.namespace,
        primaryContainerArgs: pulumi.all([
            "--app-port=8181",
            pulumi.concat("--base-role-arn=", kube2IamArnPrefix),
            "--iptables=true",
            "--host-ip=$(HOST_IP)",
            "--host-interface=eni+",
            "--verbose",
        ]),
        ports: [
            {
                containerPort: 8181,
                hostPort: 8181,
                protocol: "TCP",
                name: "http",
            },
        ],
    });

    if (Object.keys(kube2Iam).length === 0) {
        throw new Error("The kube2iam object is empty and cannot be created. Check for missing parameters.");
    }

    // -- Setup IAM for fluentd-cloudwatch --

    // Create a new IAM Policy for fluentd-cloudwatch to manage CloudWatch Logs.
    const fluentdCloudWatchPolicy = createPolicy(
        "kubeIamPolicyFluentdCloudWatch",
        {
            description:
            "Allows k8s fluentd-cloudwatch to store k8s cluster and Pod logs in CloudWatch Logs.",
            policy: JSON.stringify(
                {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Effect: "Allow",
                            Action: [
                                "logs:CreateLogGroup",
                                "logs:CreateLogStream",
                                "logs:DescribeLogGroups",
                                "logs:DescribeLogStreams",
                                "logs:PutLogEvents",
                            ],
                            Resource: [
                                "arn:aws:logs:*:*:*",
                            ],
                        },
                    ],
                },
            ),
        },
    );

    // Create a new IAM Role for fluentd-cloudwatch.
    const fluentdCloudWatchRole = newRoleWithPolicies(
        "kubeIamRoleFluentdCloudWatch",
        {
            description:
            "Allows k8s fluentd-cloudwatch to store k8s cluster and Pod logs in CloudWatch Logs.",
            assumeRolePolicy: args.instanceRoleArn.apply(assumeUserRolePolicy),
        },
        {
            "fluentdCloudWatchPolicy": fluentdCloudWatchPolicy.arn,
        },
    );

    const fluentdCloudWatchRoleArn = fluentdCloudWatchRole.apply(r => r.arn);

    // -- Deploy fluentd-cloudwatch --

    // Create the fluentd-cloudwatch k8s resource stack
    const fluentdCloudWatch = new fluentd.FluentdCloudWatch("fluentd-cloudwatch", {
        clusterName: args.clusterName,
        region: args.region,
        iamRoleArn: fluentdCloudWatchRoleArn,
        namespace: args.namespace,
        provider: args.provider,
    },
        { dependsOn: kube2Iam },
    );

    if (Object.keys(fluentdCloudWatch).length === 0) {
        throw new Error("The fluentdCloudWatch object is empty and cannot be created. Check for missing parameters.");
    }

    return fluentdCloudWatch;
}
