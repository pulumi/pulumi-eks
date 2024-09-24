import * as pulumi from '@pulumi/pulumi';
import * as awsInputs from "@pulumi/aws/types/input";
import * as aws from '@pulumi/aws';
import { Cluster } from './cluster';
import { ManagedNodeGroup } from './managedNodeGroup';
import { ComponentResource, ProviderResource, ResourceTransformArgs, ResourceTransformResult } from '@pulumi/pulumi';
import { OperatingSystem } from './types/enums';
import { NodeadmOptionsArgs } from './types/input';

/**
 * ManagedNodeGroupOptions describes the configuration options accepted by an
 * AWS Managed NodeGroup.
 *
 * See for more details:
 * https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
 */
export type ManagedNodeGroupOptions = Omit<
    aws.eks.NodeGroupArgs,
    "clusterName" | "nodeRoleArn" | "subnetIds" | "scalingConfig"
> & {
    /**
     * The target EKS cluster.
     */
    cluster: Cluster

    /**
     * Make clusterName optional, since the cluster is required and it contains it.
     */
    clusterName?: pulumi.Output<string>;

    /**
     * Extra args to pass to the Kubelet.  Corresponds to the options passed in the `--kubeletExtraArgs` flag to
     * `/etc/eks/bootstrap.sh`.  For example, '--port=10251 --address=0.0.0.0'. To escape characters in the extra args
     * value, wrap the value in quotes. For example, `kubeletExtraArgs = '--allowed-unsafe-sysctls "net.core.somaxconn"'`.
     *
     * Note that this field conflicts with `launchTemplate`.
     */
    kubeletExtraArgs?: string;

    /**
     * Additional args to pass directly to `/etc/eks/bootstrap.sh`.  For details on available options, see:
     * https://github.com/awslabs/amazon-eks-ami/blob/master/files/bootstrap.sh.  Note that the `--apiserver-endpoint`,
     * `--b64-cluster-ca` and `--kubelet-extra-args` flags are included automatically based on other configuration
     * parameters.
     *
     * Note that this field conflicts with `launchTemplate`.
     */
    bootstrapExtraArgs?: string;

    /**
     * Enables the ability to use EC2 Instance Metadata Service v2, which provides a more secure way to access instance
     * metadata. For more information, see: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html.
     * Defaults to `false`.
     *
     * Note that this field conflicts with `launchTemplate`. If you are providing a custom `launchTemplate`, you should
     * enable this feature within the `launchTemplateMetadataOptions` of the supplied `launchTemplate`.
     */
    enableIMDSv2?: boolean;

    /**
     * Make nodeGroupName optional, since the NodeGroup resource name can be
     * used as a default.
     */
    nodeGroupName?: pulumi.Input<string>;

    /**
     * Make nodeRoleArn optional, since users may prefer to provide the
     * nodegroup role directly using nodeRole.
     *
     * Note, nodeRoleArn and nodeRole are mutually exclusive, and a single option
     * must be used.
     */
    nodeRoleArn?: pulumi.Input<string>;

    /**
     * Make nodeRole optional, since users may prefer to provide the
     * nodeRoleArn.
     *
     * Note, nodeRole and nodeRoleArn are mutually exclusive, and a single
     * option must be used.
     */
    nodeRole?: pulumi.Input<aws.iam.Role>;

    /**
     * Make subnetIds optional, since the cluster is required and it contains it.
     *
     * Default subnetIds is chosen from the following list, in order, if
     * subnetIds arg is not set:
     *   - core.subnetIds
     *   - core.privateIds
     *   - core.publicSublicSubnetIds
     *
     * This default logic is based on the existing subnet IDs logic of this
     * package: https://git.io/JeM11
     */
    subnetIds?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * Make scalingConfig optional, since defaults can be computed.
     *
     * Default scaling amounts of the node group autoscaling group are:
     *   - desiredSize: 2
     *   - minSize: 1
     *   - maxSize: 2
     */
    scalingConfig?: pulumi.Input<awsInputs.eks.NodeGroupScalingConfig>;

    /**
     * Whether to ignore changes to the desired size of the AutoScalingGroup. This is useful when using Cluster Autoscaler.
     *
     * See EKS best practices for more details: https://aws.github.io/aws-eks-best-practices/cluster-autoscaling/
     */
    ignoreScalingChanges?: boolean;

    /**
     * The type of OS to use for the node group. Will be used to determine the right EKS optimized AMI to use based on the
     * instance types and gpu configuration. Valid values are `AL2`, `AL2023` and `Bottlerocket`.
     *
     * Defaults to `AL2`.
     */
    operatingSystem?: pulumi.Input<OperatingSystem>;

    /**
     * The configuration settings for Bottlerocket OS.
     * The settings will get merged with the base settings the provider uses to configure Bottlerocket.
     * This includes:
     *   - settings.kubernetes.api-server
     *   - settings.kubernetes.cluster-certificate
     *   - settings.kubernetes.cluster-name
     *   - settings.kubernetes.cluster-dns-ip
     *
     * For an overview of the available settings, see https://bottlerocket.dev/en/os/1.20.x/api/settings/.
     */
    bottlerocketSettings?: pulumi.Input<object>;

    /**
     * User specified code to run on node startup. This is expected to handle the full AWS EKS node bootstrapping.
     * If omitted, the provider will configure the user data.
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html#launch-template-user-data
     */
    userData?: pulumi.Input<string>;

    /**
     * Use the latest recommended EKS Optimized AMI with GPU support for the worker nodes.
     * Defaults to false.
     *
     * Note: `gpu` and `amiId` are mutually exclusive.
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-amis.html.
     */
    gpu?: pulumi.Input<boolean>;

    /**
     * The AMI ID to use for the worker nodes.
     * Defaults to the latest recommended EKS Optimized AMI from the AWS Systems Manager Parameter Store.
     *
     * Note: `amiId` is mutually exclusive with `gpu` and `amiType`.
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
     */
    amiId?: pulumi.Input<string>;

    /**
     * Extra nodeadm configuration sections to be added to the nodeadm user data.
     * This can be shell scripts, nodeadm NodeConfig or any other user data compatible script.
     * When configuring additional nodeadm NodeConfig sections, they'll be merged with the base settings the provider sets.
     * You can overwrite base settings or provide additional settings this way.
     *
     * The base settings are:
     *   - cluster.name
     *   - cluster.apiServerEndpoint
     *   - cluster.certificateAuthority
     *   - cluster.cidr
     *
     * Note: This is only applicable when using AL2023.
     * See for more details:
     * - [Amazon EKS AMI - Nodeadm](https://awslabs.github.io/amazon-eks-ami/nodeadm/).
     * - [Amazon EKS AMI - Nodeadm Configuration](https://awslabs.github.io/amazon-eks-ami/nodeadm/doc/api/).
     */
    nodeadmExtraOptions?: pulumi.Input<pulumi.Input<NodeadmOptionsArgs>[]>;
}

/**
 * Create an AWS managed node group.
 *
 * See for more details:
 * https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
 */
export function createManagedNodeGroup(name: string, args: ManagedNodeGroupOptions, parent?: ComponentResource, provider?: ProviderResource): ManagedNodeGroup {
    const cluster = parent ? parent : args.cluster.eksCluster.urn
    return new ManagedNodeGroup(name, args, {
        provider,
        transforms: [
            (targs: ResourceTransformArgs): ResourceTransformResult => {
                return {
                    props: targs.props,
                    opts: { ...targs.opts, aliases: [{ parent: cluster }] },
                }
            }
        ],

    });
}


/**
 * InputTags represents an Input map type that can leverage dynamic string k/v
 * for use on types that expect a k/v type with possible computed runtime values,
 * such as special CloudFormation Tags. See
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html.
 */
export type InputTags = pulumi.Input<{ [key: string]: pulumi.Input<string> }>;

/**
 * NodeGroupSecurityGroupOptions describes the configuration options accepted
 * by a security group for use with a NodeGroup.
 */
export interface NodeGroupSecurityGroupOptions {
    /**
     * The VPC in which to create the worker node group.
     */
    vpcId: pulumi.Input<string>;

    /**
     * The security group associated with the EKS cluster.
     */
    clusterSecurityGroup: pulumi.Input<aws.ec2.SecurityGroup>;

    /*
     * Key-value mapping of tags to apply to this security group.
     */
    tags?: InputTags;

    /**
     * The EKS cluster associated with the worker node group.
     */
    eksCluster: pulumi.Input<aws.eks.Cluster>;
}

/**
 * createNodeGroupSecurityGroup creates a security group for node groups with the
 * default ingress & egress rules required to connect and work with the EKS
 * cluster security group.
 */
export function createNodeGroupSecurityGroup(
    name: string,
    args: NodeGroupSecurityGroupOptions,
    parent: pulumi.ComponentResource,
    provider?: pulumi.ProviderResource,
): [aws.ec2.SecurityGroup, aws.ec2.SecurityGroupRule] {
    const eksCluster = pulumi.output(args.eksCluster);
    const clusterSecurityGroup = pulumi.output(args.clusterSecurityGroup);

    const nodeSecurityGroup = new aws.ec2.SecurityGroup(
        `${name}-nodeSecurityGroup`,
        {
            vpcId: args.vpcId,
            revokeRulesOnDelete: true,
            tags: pulumi.all([args.tags, eksCluster.name]).apply(
                ([tags, clusterName]) =>
                    <aws.Tags>{
                        Name: `${name}-nodeSecurityGroup`,
                        [`kubernetes.io/cluster/${clusterName}`]: "owned",
                        ...tags,
                    },
            ),
        },
        { parent, provider },
    );

    new aws.ec2.SecurityGroupRule(
        `${name}-eksNodeIngressRule`,
        {
            description: "Allow nodes to communicate with each other",
            type: "ingress",
            fromPort: 0,
            toPort: 0,
            protocol: "-1", // all
            securityGroupId: nodeSecurityGroup.id,
            self: true,
        },
        { parent, provider },
    );

    new aws.ec2.SecurityGroupRule(
        `${name}-eksNodeClusterIngressRule`,
        {
            description:
                "Allow worker Kubelets and pods to receive communication from the cluster control plane",
            type: "ingress",
            fromPort: 1025,
            toPort: 65535,
            protocol: "tcp",
            securityGroupId: nodeSecurityGroup.id,
            sourceSecurityGroupId: clusterSecurityGroup.id,
        },
        { parent, provider },
    );

    new aws.ec2.SecurityGroupRule(
        `${name}-eksExtApiServerClusterIngressRule`,
        {
            description:
                "Allow pods running extension API servers on port 443 to receive communication from cluster control plane",
            type: "ingress",
            fromPort: 443,
            toPort: 443,
            protocol: "tcp",
            securityGroupId: nodeSecurityGroup.id,
            sourceSecurityGroupId: clusterSecurityGroup.id,
        },
        { parent, provider },
    );

    const nodeInternetEgressRule = new aws.ec2.SecurityGroupRule(
        `${name}-eksNodeInternetEgressRule`,
        {
            description: "Allow internet access.",
            type: "egress",
            fromPort: 0,
            toPort: 0,
            protocol: "-1", // all
            cidrBlocks: ["0.0.0.0/0"],
            securityGroupId: nodeSecurityGroup.id,
        },
        { parent, provider },
    );

    const eksClusterIngressRule = new aws.ec2.SecurityGroupRule(
        `${name}-eksClusterIngressRule`,
        {
            description: "Allow pods to communicate with the cluster API Server",
            type: "ingress",
            fromPort: 443,
            toPort: 443,
            protocol: "tcp",
            securityGroupId: clusterSecurityGroup.id,
            sourceSecurityGroupId: nodeSecurityGroup.id,
        },
        { parent, provider },
    );

    return [nodeSecurityGroup, eksClusterIngressRule];
}
