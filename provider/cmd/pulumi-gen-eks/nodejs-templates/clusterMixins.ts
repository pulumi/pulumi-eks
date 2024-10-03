import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { NodeGroup } from './nodeGroup';
import { Cluster, ClusterArgs } from './cluster';
import { Provider } from '@pulumi/kubernetes';
import { ClusterNodeGroupOptionsArgs, KubeconfigOptionsArgs, RoleMappingArgs } from './types/input';
import { ResourceTransformArgs, ResourceTransformResult } from '@pulumi/pulumi';

declare module "./cluster" {
    interface Cluster {
        /**
         * A Kubernetes resource provider that can be used to deploy into this cluster. For example, the code below will
         * create a new Pod in the EKS cluster.
         *
         *     let eks = new Cluster("eks");
         *     let pod = new kubernetes.core.v1.Pod("pod", { ... }, { provider: eks.provider });
         *
         */
        provider: Provider;

        /**
         * Create a self-managed node group using CloudFormation and an ASG.
         *
         * See for more details:
         * https://docs.aws.amazon.com/eks/latest/userguide/worker.html
         */
        createNodeGroup(name: string, args: ClusterNodeGroupOptionsArgs): NodeGroup;
    }
}

/**
 * KubeconfigOptions represents the AWS credentials to scope a given kubeconfig
 * when using a non-default credential chain.
 *
 * The options can be used independently, or additively.
 *
 * A scoped kubeconfig is necessary for certain auth scenarios. For example:
 *   1. Assume a role on the default account caller,
 *   2. Use an AWS creds profile instead of the default account caller,
 *   3. Use an AWS creds creds profile instead of the default account caller,
 *      and then assume a given role on the profile. This scenario is also
 *      possible by only using a profile, iff the profile includes a role to
 *      assume in its settings.
 *
 * See for more details:
 * - https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
 * - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html
 * - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html
 */
export interface KubeconfigOptions extends KubeconfigOptionsArgs {}

/**
 * RoleMapping describes a mapping from an AWS IAM role to a Kubernetes user and groups.
 */
export interface RoleMapping extends RoleMappingArgs {}

/**
 * ClusterOptions describes the configuration options accepted by an EKSCluster component.
 */
export interface ClusterOptions extends ClusterArgs {}

Object.defineProperty(Cluster.prototype, '_provider', { writable: true, enumerable: false });

Object.defineProperty(Cluster.prototype, 'provider', {
    enumerable: true,
    get(): Provider {
        if (!this._provider) {
            this._provider = new Provider(`${this.__name}-provider`, {
                kubeconfig: this.kubeconfigJson,
            }, { parent: this, aliases: [{ name: this.__name }]});
        }
        return this._provider;
    }
})

Cluster.prototype.createNodeGroup = function(name: string, args: ClusterNodeGroupOptionsArgs, awsProvider?: pulumi.ProviderResource): NodeGroup {
    const { nodeSecurityGroup, clusterIngressRule } = pulumi.all([this.nodeSecurityGroup, this.eksClusterIngressRule])
        .apply(([nodeSecurityGroup, clusterIngressRule]) => {
            if (!nodeSecurityGroup || !clusterIngressRule) {
                throw new pulumi.ResourceError(
                    "The nodeSecurityGroup and eksClusterIngressRule are required when using `createNodeGroup`. Please create the cluster without specifying `skipDefaultNodeGroups`.",
                    this,
                );
            }

            return { nodeSecurityGroup, clusterIngressRule };
        });

    return new NodeGroup(
        name,
        {
            ...args,
            cluster: this.core,
            nodeSecurityGroup,
            clusterIngressRule,
        },
        {
            // parent: this,
            aliases: [{ parent: this }],
            transforms: [
                (args: ResourceTransformArgs): ResourceTransformResult => {
                    return {
                        props: args.props,
                        opts: { ...args.opts, aliases: [{ parent: this }] },
                    }
                }
            ],
            providers: {
                ...(awsProvider ? { aws: awsProvider } : undefined),
                kubernetes: this.provider,
            },
        },
    );
}

/**
 * CreationRoleProvider is a component containing the AWS Role and Provider necessary to override the `[system:master]`
 * entity ARN. This is an optional argument used in `ClusterOptions`. Read more: https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html
 */
export interface CreationRoleProvider {
    role: aws.iam.Role;
    provider: pulumi.ProviderResource;
}

/**
 * getRoleProvider creates a role provider that can be passed to `new eks.Cluster("test", {
 * creationRoleProvider: ... })`.  This can be used to provide a specific role to use for the
 * creation of the EKS cluster different from the role being used to run the Pulumi deployment.
 */
export function getRoleProvider(
    name: string,
    region?: pulumi.Input<aws.Region>,
    profile?: pulumi.Input<string>,
    parent?: pulumi.ComponentResource,
    provider?: pulumi.ProviderResource,
): CreationRoleProvider {
    const partition = aws.getPartitionOutput({}, { parent }).partition;
    const accountId = pulumi.output(aws.getCallerIdentity({}, { parent })).accountId;
    const iamRole = new aws.iam.Role(
        `${name}-eksClusterCreatorRole`,
        {
            assumeRolePolicy: pulumi.interpolate`{
            "Version": "2012-10-17",
            "Statement": [
                {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:${partition}:iam::${accountId}:root"
                },
                "Action": "sts:AssumeRole"
                }
            ]
        }`,
            description: `Admin access to eks-${name}`,
        },
        { parent, provider },
    );

    // `eks:*` is needed to create/read/update/delete the EKS cluster, `iam:PassRole` is needed to pass the EKS service role to the cluster
    // https://docs.aws.amazon.com/eks/latest/userguide/service_IAM_role.html
    new aws.iam.RolePolicy(
        `${name}-eksClusterCreatorPolicy`,
        {
            role: iamRole,
            policy: {
                Version: "2012-10-17",
                Statement: [
                    {
                        Effect: "Allow",
                        Action: "eks:*",
                        Resource: "*",
                    },
                    {
                        Effect: "Allow",
                        Action: "iam:PassRole",
                        Resource: "*",
                    },
                ],
            },
        },
        { parent: iamRole, provider },
    );

    const creatorProvider = new aws.Provider(
        `${name}-eksClusterCreatorEntity`,
        {
            region: region,
            profile: profile,
            assumeRole: {
                roleArn: iamRole.arn.apply(async (arn) => {
                    // wait 30 seconds to assume the IAM Role https://github.com/pulumi/pulumi-aws/issues/673
                    if (!pulumi.runtime.isDryRun()) {
                        await new Promise((resolve) => setTimeout(resolve, 30 * 1000));
                    }
                    return arn;
                }),
            },
        },
        { parent: iamRole, provider },
    );

    return {
        role: iamRole,
        provider: creatorProvider,
    };
}

