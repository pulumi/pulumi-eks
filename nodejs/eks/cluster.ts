// Copyright 2016-2022, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import * as http from "http";
import * as https from "https";
import * as HttpsProxyAgent from "https-proxy-agent";
import * as process from "process";
import * as url from "url";

import {
    createAccessEntries,
    createAwsAuthData,
    supportsConfigMap,
    supportsAccessEntries,
    validateAuthenticationMode,
} from "./authenticationMode";
import { getIssuerCAThumbprint } from "./cert-thumprint";
import { assertCompatibleAWSCLIExists } from "./dependencies";
import {
    computeWorkerSubnets,
    createNodeGroupV2,
    NodeGroupBaseOptions,
    NodeGroupV2Data,
} from "./nodegroup";
import { createNodeGroupSecurityGroup } from "./securitygroup";
import { ServiceRole } from "./servicerole";
import { createStorageClass, EBSVolumeType, StorageClass } from "./storageclass";
import { InputTags, UserStorageClasses } from "./utils";
import { VpcCniAddon, VpcCniAddonOptions } from "./cni-addon";
import { stringifyAddonConfiguration } from "./addon";
import { getRegionFromArn } from "./utilities";

/**
 * RoleMapping describes a mapping from an AWS IAM role to a Kubernetes user and groups.
 */
export interface RoleMapping {
    /**
     * The ARN of the IAM role to add.
     */
    roleArn: pulumi.Input<aws.ARN>;

    /**
     * The user name within Kubernetes to map to the IAM role. By default, the user name is the ARN of the IAM role.
     */
    username: pulumi.Input<string>;

    /**
     * A list of groups within Kubernetes to which the role is mapped.
     */
    groups: pulumi.Input<pulumi.Input<string>[]>;
}

/**
 * UserMapping describes a mapping from an AWS IAM user to a Kubernetes user and groups.
 */
export interface UserMapping {
    /**
     * The ARN of the IAM user to add.
     */
    userArn: pulumi.Input<aws.ARN>;

    /**
     * The user name within Kubernetes to map to the IAM user. By default, the user name is the ARN of the IAM user.
     */
    username: pulumi.Input<string>;

    /**
     * A list of groups within Kubernetes to which the user is mapped to.
     */
    groups: pulumi.Input<pulumi.Input<string>[]>;
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
export interface KubeconfigOptions {
    /**
     * Role ARN to assume instead of the default AWS credential provider chain.
     *
     * The role is passed to kubeconfig as an authentication exec argument.
     */
    roleArn?: pulumi.Input<aws.ARN>;
    /**
     * AWS credential profile name to always use instead of the
     * default AWS credential provider chain.
     *
     * The profile is passed to kubeconfig as an authentication environment
     * setting.
     */
    profileName?: pulumi.Input<string>;
}

/**
 * CoreData defines the core set of data associated with an EKS cluster, including the network in which it runs.
 */
export interface CoreData {
    cluster: aws.eks.Cluster;
    vpcId: pulumi.Output<string>;
    subnetIds: pulumi.Output<string[]>;
    endpoint: pulumi.Output<string>;
    clusterSecurityGroup?: aws.ec2.SecurityGroup;
    provider: k8s.Provider;
    instanceRoles: pulumi.Output<aws.iam.Role[]>;
    nodeGroupOptions: ClusterNodeGroupOptions;
    awsProvider?: pulumi.ProviderResource;
    publicSubnetIds?: pulumi.Output<string[]>;
    privateSubnetIds?: pulumi.Output<string[]>;
    eksNodeAccess?: k8s.core.v1.ConfigMap;
    storageClasses?: UserStorageClasses;
    kubeconfig?: pulumi.Output<any>;
    vpcCni?: VpcCniAddon;
    tags?: InputTags;
    nodeSecurityGroupTags?: InputTags;
    fargateProfile: pulumi.Output<aws.eks.FargateProfile | undefined>;
    oidcProvider?: aws.iam.OpenIdConnectProvider;
    encryptionConfig?: pulumi.Output<aws.types.output.eks.ClusterEncryptionConfig>;
    clusterIamRole: pulumi.Output<aws.iam.Role>;
    accessEntries?: pulumi.Output<AccessEntry[]>;
}

function createOrGetInstanceProfile(
    name: string,
    parent: pulumi.ComponentResource,
    instanceRoleName?: pulumi.Input<aws.iam.Role>,
    instanceProfileName?: pulumi.Input<string>,
    provider?: pulumi.ProviderResource,
): aws.iam.InstanceProfile {
    let instanceProfile: aws.iam.InstanceProfile;
    if (instanceProfileName) {
        instanceProfile = aws.iam.InstanceProfile.get(
            `${name}-instanceProfile`,
            instanceProfileName,
            undefined,
            { parent, provider },
        );
    } else {
        instanceProfile = new aws.iam.InstanceProfile(
            `${name}-instanceProfile`,
            {
                role: instanceRoleName,
            },
            { parent, provider },
        );
    }

    return instanceProfile;
}

// ExecEnvVar sets the environment variables using an exec-based auth plugin.
interface ExecEnvVar {
    /**
     * Name of the auth exec environment variable.
     */
    name: pulumi.Input<string>;

    /**
     * Value of the auth exec environment variable.
     */
    value: pulumi.Input<string>;
}

/** @internal */
export function generateKubeconfig(
    clusterName: pulumi.Input<string>,
    clusterEndpoint: pulumi.Input<string>,
    region: pulumi.Input<string>,
    includeProfile: boolean,
    certData?: pulumi.Input<string>,
    opts?: KubeconfigOptions,
) {
    let args = [
        "region",
        region,
        "eks",
        "get-token",
        "--cluster-name",
        clusterName,
        "--output",
        "json",
    ];
    const env: ExecEnvVar[] = [
        {
            name: "KUBERNETES_EXEC_INFO",
            value: `{"apiVersion": "client.authentication.k8s.io/v1beta1"}`,
        },
    ];

    if (opts?.roleArn) {
        args = [...args, "--role", opts.roleArn];
    }

    if (includeProfile && opts?.profileName) {
        // Use --profile instead of AWS_PROFILE because the latter can be
        // overridden by ambient credentials:
        // https://docs.aws.amazon.com/cli/latest/topic/config-vars.html#id1
        args = [...args, "--profile", opts.profileName];
    }

    return pulumi.all([args, env]).apply(([tokenArgs, envvars]) => {
        return {
            apiVersion: "v1",
            clusters: [
                {
                    cluster: {
                        server: clusterEndpoint,
                        "certificate-authority-data": certData,
                    },
                    name: "kubernetes",
                },
            ],
            contexts: [
                {
                    context: {
                        cluster: "kubernetes",
                        user: "aws",
                    },
                    name: "aws",
                },
            ],
            "current-context": "aws",
            kind: "Config",
            users: [
                {
                    name: "aws",
                    user: {
                        exec: {
                            apiVersion: "client.authentication.k8s.io/v1beta1",
                            command: "aws",
                            args: tokenArgs,
                            env: envvars,
                        },
                    },
                },
            ],
        };
    });
}

export interface ClusterCreationRoleProviderOptions {
    region?: pulumi.Input<aws.Region>;
    profile?: pulumi.Input<string>;
}

/**
 * ClusterCreationRoleProvider is a component that wraps creating a role provider that can be passed to
 * `new eks.Cluster("test", { creationRoleProvider: ... })`. This can be used to provide a
 * specific role to use for the creation of the EKS cluster different from the role being used
 * to run the Pulumi deployment.
 */
export class ClusterCreationRoleProvider
    extends pulumi.ComponentResource
    implements CreationRoleProvider
{
    public readonly role: aws.iam.Role;
    public readonly provider: pulumi.ProviderResource;

    /**
     * Creates a role provider that can be passed to `new eks.Cluster("test", { creationRoleProvider: ... })`.
     * This can be used to provide a specific role to use for the creation of the EKS cluster different from
     * the role being used to run the Pulumi deployment.
     *
     * @param name The _unique_ name of this component.
     * @param args The arguments for this component.
     * @param opts A bag of options that control this component's behavior.
     */
    constructor(
        name: string,
        args: ClusterCreationRoleProviderOptions,
        opts?: pulumi.ComponentResourceOptions,
    ) {
        super("eks:index:ClusterCreationRoleProvider", name, args, opts);

        const result = getRoleProvider(name, args?.region, args?.profile, this, opts?.provider);
        this.role = result.role;
        this.provider = result.provider;
        this.registerOutputs(undefined);
    }
}

/**
 * getRoleProvider creates a role provider that can be passed to `new eks.Cluster("test", {
 * creationRoleProvider: ... })`.  This can be used to provide a specific role to use for the
 * creation of the EKS cluster different from the role being used to run the Pulumi deployment.
 */
function getRoleProvider(
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
    const rolePolicy = new aws.iam.RolePolicy(
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

/**
 * Create the core components and settings required for the EKS cluster.
 */
export function createCore(
    name: string,
    rawArgs: ClusterOptions,
    parent: pulumi.ComponentResource,
    provider?: pulumi.ProviderResource,
): CoreData {
    // Check to ensure that a compatible version of aws CLI is installed, as we'll need it in order
    // to retrieve a token to login to the EKS cluster later.
    assertCompatibleAWSCLIExists();

    const args = validateAuthenticationMode(rawArgs);

    if (args.instanceRole && args.instanceRoles) {
        throw new Error(
            "instanceRole and instanceRoles are mutually exclusive, and cannot both be set.",
        );
    }

    if (args.subnetIds && (args.publicSubnetIds || args.privateSubnetIds)) {
        throw new Error(
            "subnetIds, and the use of publicSubnetIds and/or privateSubnetIds are mutually exclusive. Choose a single approach.",
        );
    }

    if (
        args.nodeGroupOptions &&
        (args.nodeSubnetIds ||
            args.nodeAssociatePublicIpAddress ||
            args.instanceType ||
            args.instanceProfileName ||
            args.nodePublicKey ||
            args.nodeRootVolumeSize ||
            args.nodeUserData ||
            args.minSize ||
            args.maxSize ||
            args.desiredCapacity ||
            args.nodeAmiId ||
            args.gpu)
    ) {
        throw new Error(
            "Setting nodeGroupOptions, and any set of singular node group option(s) on the cluster, is mutually exclusive. Choose a single approach.",
        );
    }

    // Configure the node group options.
    const nodeGroupOptions: ClusterNodeGroupOptions = args.nodeGroupOptions || {
        nodeSubnetIds: args.nodeSubnetIds,
        nodeAssociatePublicIpAddress: args.nodeAssociatePublicIpAddress,
        instanceType: args.instanceType,
        nodePublicKey: args.nodePublicKey,
        nodeRootVolumeEncrypted: args.nodeRootVolumeEncrypted,
        nodeRootVolumeSize: args.nodeRootVolumeSize,
        nodeUserData: args.nodeUserData,
        minSize: args.minSize,
        maxSize: args.maxSize,
        desiredCapacity: args.desiredCapacity,
        amiId: args.nodeAmiId,
        gpu: args.gpu,
        version: args.version,
    };

    const { partition, dnsSuffix } = aws.getPartitionOutput({}, { parent });

    // Configure default networking architecture.
    let vpcId: pulumi.Input<string> = args.vpcId!;
    let clusterSubnetIds: pulumi.Input<pulumi.Input<string>[]> = [];

    // If no VPC is set, use the default VPC's subnets.
    if (!args.vpcId) {
        const invokeOpts = { parent, async: true };
        const vpc = aws.ec2.getVpc({ default: true }, invokeOpts);
        vpcId = vpc.then((v) => v.id);
        clusterSubnetIds = vpc
            .then((v) =>
                aws.ec2.getSubnets({ filters: [{ name: "vpc-id", values: [v.id] }] }, invokeOpts),
            )
            .then((subnets) => subnets.ids);
    }

    // Form the subnetIds to use on the cluster from either:
    //  - subnetIds
    //  - A combination of privateSubnetIds and/or publicSubnetIds.
    if (args.subnetIds !== undefined) {
        clusterSubnetIds = args.subnetIds;
    } else if (args.publicSubnetIds !== undefined || args.privateSubnetIds !== undefined) {
        clusterSubnetIds = pulumi
            .all([args.publicSubnetIds || [], args.privateSubnetIds || []])
            .apply(([publicIds, privateIds]) => {
                return [...publicIds, ...privateIds];
            });
    }

    // Create the EKS service role
    let eksRole: pulumi.Output<aws.iam.Role>;
    if (args.serviceRole) {
        eksRole = pulumi.output(args.serviceRole);
    } else {
        eksRole = new ServiceRole(
            `${name}-eksRole`,
            {
                service: "eks.amazonaws.com",
                description: "Allows EKS to manage clusters on your behalf.",
                managedPolicyArns: [
                    {
                        id: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
                        arn: pulumi.interpolate`arn:${partition}:iam::aws:policy/AmazonEKSClusterPolicy`,
                    },
                ],
                tags: args.tags,
            },
            { parent, provider },
        ).role;
    }

    // Create the EKS cluster security group
    let eksClusterSecurityGroup: aws.ec2.SecurityGroup | undefined;
    if (args.clusterSecurityGroup) {
        eksClusterSecurityGroup = args.clusterSecurityGroup;
    } else if (!args.skipDefaultSecurityGroups) {
        eksClusterSecurityGroup = new aws.ec2.SecurityGroup(
            `${name}-eksClusterSecurityGroup`,
            {
                vpcId: vpcId,
                revokeRulesOnDelete: true,
                tags: pulumi.all([args.tags, args.clusterSecurityGroupTags]).apply(
                    ([tags, clusterSecurityGroupTags]) =>
                        <aws.Tags>{
                            Name: `${name}-eksClusterSecurityGroup`,
                            ...clusterSecurityGroupTags,
                            ...tags,
                        },
                ),
            },
            { parent, provider },
        );

        const eksClusterInternetEgressRule = new aws.ec2.SecurityGroupRule(
            `${name}-eksClusterInternetEgressRule`,
            {
                description: "Allow internet access.",
                type: "egress",
                fromPort: 0,
                toPort: 0,
                protocol: "-1", // all
                cidrBlocks: ["0.0.0.0/0"],
                securityGroupId: eksClusterSecurityGroup.id,
            },
            { parent, provider },
        );
    }

    // Create the cluster encryption provider for using envelope encryption on
    // Kubernetes secrets.
    let encryptionProvider:
        | pulumi.Output<aws.types.output.eks.ClusterEncryptionConfigProvider>
        | undefined;
    let encryptionConfig: pulumi.Output<aws.types.output.eks.ClusterEncryptionConfig> | undefined;
    if (args.encryptionConfigKeyArn) {
        encryptionProvider = pulumi.output(args.encryptionConfigKeyArn).apply(
            (keyArn) =>
                <aws.types.output.eks.ClusterEncryptionConfigProvider>{
                    keyArn,
                },
        );
        encryptionConfig = encryptionProvider.apply(
            (ep) =>
                <aws.types.output.eks.ClusterEncryptionConfig>{
                    provider: ep,
                    resources: ["secrets"], // Only valid values are: "secrets"
                },
        );
    }

    let kubernetesNetworkConfig:
        | pulumi.Output<aws.types.input.eks.ClusterKubernetesNetworkConfig>
        | undefined;
    if (args.kubernetesServiceIpAddressRange || args.ipFamily) {
        kubernetesNetworkConfig = pulumi
            .all([args.kubernetesServiceIpAddressRange, args.ipFamily])
            .apply(([serviceIpv4Cidr, ipFamily = "ipv4"]) => ({
                serviceIpv4Cidr: ipFamily === "ipv4" ? serviceIpv4Cidr : undefined, // only applicable for IPv4 IP family
                ipFamily: ipFamily,
            }));
    }

    // Create the EKS cluster
    const eksCluster = new aws.eks.Cluster(
        `${name}-eksCluster`,
        {
            name: args.name,
            roleArn: eksRole.apply((r) => r.arn),
            vpcConfig: {
                securityGroupIds: eksClusterSecurityGroup
                    ? [eksClusterSecurityGroup.id]
                    : undefined,
                subnetIds: clusterSubnetIds,
                endpointPrivateAccess: args.endpointPrivateAccess,
                endpointPublicAccess: args.endpointPublicAccess,
                publicAccessCidrs: args.publicAccessCidrs
                    ? pulumi
                          .all([args.publicAccessCidrs, args.endpointPublicAccess ?? true])
                          .apply(([cidrs, publicAccess]) => {
                              if (!publicAccess && cidrs) {
                                  throw new pulumi.ResourceError(
                                      "`publicAccessCidrs` can only be set when `endpointPublicAccess` is true",
                                      eksCluster,
                                  );
                              }
                              return cidrs;
                          })
                    : undefined,
            },
            version: args.version,
            enabledClusterLogTypes: args.enabledClusterLogTypes,
            defaultAddonsToRemoves: args.defaultAddonsToRemove,
            tags: pulumi.all([args.tags, args.clusterTags]).apply(
                ([tags, clusterTags]) =>
                    <aws.Tags>{
                        Name: `${name}-eksCluster`,
                        ...clusterTags,
                        ...tags,
                    },
            ),
            encryptionConfig,
            kubernetesNetworkConfig,
            accessConfig: args.authenticationMode
                ? {
                      authenticationMode: args.authenticationMode,
                      // Explicitely grants the principal creating the cluster admin access to the cluster.
                      // This is the default behavior of EKS when no accessConfig is provided.
                      // It is required for this component because it deploys charts to the cluster.
                      bootstrapClusterCreatorAdminPermissions: true,
                  }
                : undefined,
        },
        {
            parent,
            provider: args.creationRoleProvider ? args.creationRoleProvider.provider : provider,
            // ignore changes to the bootstrapClusterCreatorAdminPermissions field because it has bi-modal default behavior
            // in upstream and would cause replacements for users upgrading from older versions of the EKS provider (<=2.7.3).
            // See https://github.com/pulumi/pulumi-aws/issues/3997#issuecomment-2223201333 for more details.
            ignoreChanges: ["accessConfig.bootstrapClusterCreatorAdminPermissions"],
        },
    );

    if (args.kubeProxyAddonOptions?.enabled ?? true) {
        const kubeProxyVersion: pulumi.Output<string> = args.kubeProxyAddonOptions?.version
            ? pulumi.output(args.kubeProxyAddonOptions?.version)
            : aws.eks
                  .getAddonVersionOutput(
                      {
                          addonName: "kube-proxy",
                          kubernetesVersion: eksCluster.version,
                          mostRecent: true, // whether to return the default version or the most recent version for the specified kubernetes version
                      },
                      { parent, provider },
                  )
                  .apply((addonVersion) => addonVersion.version);

        const kubeProxyAddon = new aws.eks.Addon(
            `${name}-kube-proxy`,
            {
                clusterName: eksCluster.name,
                addonName: "kube-proxy",
                preserve: true,
                tags: args.tags,
                resolveConflictsOnCreate:
                    args.kubeProxyAddonOptions?.resolveConflictsOnCreate ?? "OVERWRITE",
                resolveConflictsOnUpdate:
                    args.kubeProxyAddonOptions?.resolveConflictsOnUpdate ?? "OVERWRITE",
                addonVersion: kubeProxyVersion,
                configurationValues: stringifyAddonConfiguration(
                    args.kubeProxyAddonOptions?.configurationValues,
                ),
            },
            { parent, provider },
        );
    }

    // Instead of using the kubeconfig directly, we also add a wait of up to 5 minutes or until we
    // can reach the API server for the Output that provides access to the kubeconfig string so that
    // there is time for the cluster API server to become completely available.  Ideally we
    // would rely on the EKS API only returning once this was available, but we have seen frequent
    // cases where it is not yet available immediately after provisioning - possibly due to DNS
    // propagation delay or other non-deterministic factors.
    const endpoint = eksCluster.endpoint.apply(async (clusterEndpoint) => {
        if (!pulumi.runtime.isDryRun() && args.endpointPublicAccess) {
            // For up to 300 seconds, try to contact the API cluster healthz
            // endpoint, and verify that it is reachable.
            const healthz = `${clusterEndpoint}/healthz`;
            const agent = createHttpAgent(args.proxy);
            const maxRetries = 60;
            const reqTimeoutMilliseconds = 1000; // HTTPS request timeout
            const timeoutMilliseconds = 5000; // Retry timeout
            for (let i = 0; i < maxRetries; i++) {
                try {
                    await new Promise<void>((resolve, reject) => {
                        const options = {
                            ...url.parse(healthz),
                            rejectUnauthorized: false, // EKS API server uses self-signed cert
                            agent: agent,
                            timeout: reqTimeoutMilliseconds,
                        };
                        const req = https.request(options, (res) => {
                            res.statusCode === 200 ? resolve(undefined) : reject(); // Verify healthz returns 200
                        });
                        req.on("timeout", reject);
                        req.on("error", reject);
                        req.end();
                    });
                    pulumi.log.info(`Cluster is ready`, eksCluster, undefined, true);
                    break;
                } catch (e) {
                    const retrySecondsLeft = ((maxRetries - i) * timeoutMilliseconds) / 1000;
                    pulumi.log.info(
                        `Waiting up to (${retrySecondsLeft}) more seconds for cluster readiness...`,
                        eksCluster,
                        undefined,
                        true,
                    );
                }
                await new Promise((resolve) => setTimeout(resolve, timeoutMilliseconds));
            }
        }
        return clusterEndpoint;
    });

    // Compute the required kubeconfig. Note that we do not export this value: we want the exported config to
    // depend on the autoscaling group we'll create later so that nothing attempts to use the EKS cluster before
    // its worker nodes have come up.
    const genKubeconfig = (useProfileName: boolean) => {
        const region = eksCluster.arn.apply(getRegionFromArn);
        const kubeconfig = pulumi
            .all([
                eksCluster.name,
                endpoint,
                eksCluster.certificateAuthority,
                args.providerCredentialOpts,
                region,
            ])
            .apply(
                ([
                    clusterName,
                    clusterEndpoint,
                    clusterCertificateAuthority,
                    providerCredentialOpts,
                    region,
                ]) => {
                    let config = {};

                    if (args.creationRoleProvider) {
                        config = args.creationRoleProvider.role.arn.apply((arn) => {
                            const opts: KubeconfigOptions = { roleArn: arn };
                            return generateKubeconfig(
                                clusterName,
                                clusterEndpoint,
                                region,
                                useProfileName,
                                clusterCertificateAuthority?.data,
                                opts,
                            );
                        });
                    } else if (providerCredentialOpts) {
                        config = generateKubeconfig(
                            clusterName,
                            clusterEndpoint,
                            region,
                            useProfileName,
                            clusterCertificateAuthority?.data,
                            providerCredentialOpts,
                        );
                    } else {
                        config = generateKubeconfig(
                            clusterName,
                            clusterEndpoint,
                            region,
                            useProfileName,
                            clusterCertificateAuthority?.data,
                        );
                    }
                    return config;
                },
            );

        return kubeconfig;
    };

    // We need 2 forms of kubeconfig, one with the profile name and one without. The one with the profile name
    // is required to interact with the cluster by this provider. The one without is used by the user to interact
    // with the cluster and enable multi-user access.
    const kubeconfig = genKubeconfig(true);
    const kubeconfigWithoutProfile = genKubeconfig(false);

    const k8sProvider = new k8s.Provider(
        `${name}-eks-k8s`,
        {
            kubeconfig: kubeconfig.apply(JSON.stringify),
            enableConfigMapMutable: args.enableConfigMapMutable,
        },
        { parent: parent },
    );

    const skipDefaultNodeGroup = args.skipDefaultNodeGroup || args.fargate;

    let instanceRoles: pulumi.Output<aws.iam.Role[]>;
    let defaultInstanceRole: pulumi.Output<aws.iam.Role> | undefined;
    // Create role mappings of the instance roles specified for aws-auth.
    if (args.instanceRoles) {
        instanceRoles = pulumi.output(args.instanceRoles);
    } else if (args.instanceRole) {
        // Create an instance profile if using a default node group
        if (!skipDefaultNodeGroup) {
            nodeGroupOptions.instanceProfile = createOrGetInstanceProfile(
                name,
                parent,
                args.instanceRole,
                args.instanceProfileName,
            );
        }
        instanceRoles = pulumi.output([args.instanceRole]);
        defaultInstanceRole = pulumi.output(args.instanceRole);
    } else if (!args.skipDefaultNodeGroup) {
        const instanceRole = new ServiceRole(
            `${name}-instanceRole`,
            {
                service: pulumi.interpolate`ec2.${dnsSuffix}`,
                managedPolicyArns: [
                    {
                        id: "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
                        arn: pulumi.interpolate`arn:${partition}:iam::aws:policy/AmazonEKSWorkerNodePolicy`,
                    },
                    {
                        id: "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
                        arn: pulumi.interpolate`arn:${partition}:iam::aws:policy/AmazonEKS_CNI_Policy`,
                    },
                    {
                        id: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
                        arn: pulumi.interpolate`arn:${partition}:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly`,
                    },
                ],
                tags: args.tags,
            },
            { parent, provider },
        ).role;

        defaultInstanceRole = instanceRole;
        instanceRoles = pulumi.output([instanceRole]);

        // Create a new policy for the role, if specified.
        if (args.customInstanceRolePolicy) {
            pulumi.log.warn(
                "Option `customInstanceRolePolicy` has been deprecated. Please use `instanceRole` or `instanceRoles`. The role provided to either option should already include all required policies.",
                eksCluster,
            );
            const customRolePolicy = new aws.iam.RolePolicy(
                `${name}-EKSWorkerCustomPolicy`,
                {
                    role: instanceRole,
                    policy: args.customInstanceRolePolicy,
                },
                { parent, provider },
            );
        }

        nodeGroupOptions.instanceProfile = createOrGetInstanceProfile(
            name,
            parent,
            instanceRole,
            args.instanceProfileName,
        );
    } else {
        instanceRoles = pulumi.output([]);
    }

    let eksNodeAccess: k8s.core.v1.ConfigMap | undefined = undefined;
    if (supportsConfigMap(args.authenticationMode)) {
        // Create the aws-auth ConfigMap if the authentication mode supports it. This maps instance roles, regular IAM roles, and IAM users to
        // Kubernetes RBAC users and groups.
        const nodeAccessData = createAwsAuthData(
            instanceRoles,
            args.roleMappings,
            args.userMappings,
        );
        eksNodeAccess = new k8s.core.v1.ConfigMap(
            `${name}-nodeAccess`,
            {
                apiVersion: "v1",
                immutable: false,
                metadata: {
                    name: `aws-auth`,
                    namespace: "kube-system",
                    annotations: {
                        "pulumi.com/patchForce": "true",
                    },
                },
                data: nodeAccessData,
            },
            { parent, provider: k8sProvider },
        );
    }

    const createdAccessEntries: AccessEntry[] = [];
    // Create the access entries if the authentication mode supports it.
    let accessEntries: aws.eks.AccessEntry[] | undefined = undefined;
    if (supportsAccessEntries(args.authenticationMode)) {
        // This additionally maps the defaultInstanceRole to a EC2_LINUX access entry which allows the nodes to register & communicate with the EKS control plane.
        if (defaultInstanceRole) {
            const defaultNodeGroupAccessEntry = {
                principalArn: defaultInstanceRole.arn,
                type: AccessEntryType.EC2_LINUX,
            };
            accessEntries = createAccessEntries(
                name,
                eksCluster.name,
                {
                    defaultNodeGroupInstanceRole: defaultNodeGroupAccessEntry,
                },
                { parent, provider, dependsOn: [eksCluster] },
            );

            createdAccessEntries.push(defaultNodeGroupAccessEntry);
        }

        accessEntries = (accessEntries || []).concat(
            createAccessEntries(name, eksCluster.name, args.accessEntries || {}, {
                parent,
                provider,
                dependsOn: [eksCluster],
            }),
        );
        createdAccessEntries.push(...Object.values(args.accessEntries || {}));
    }

    const authDependencies = [
        ...(accessEntries ? accessEntries : []),
        ...(eksNodeAccess ? [eksNodeAccess] : []),
    ];

    // Add any requested StorageClasses.
    const storageClasses = args.storageClasses || {};
    const userStorageClasses = {} as UserStorageClasses;
    if (typeof storageClasses === "string") {
        const storageClass = { type: storageClasses, default: true };
        userStorageClasses[storageClasses] = pulumi.output(
            createStorageClass(`${name.toLowerCase()}-${storageClasses}`, storageClass, {
                parent,
                provider: k8sProvider,
                dependsOn: authDependencies,
            }),
        );
    } else {
        for (const key of Object.keys(storageClasses)) {
            userStorageClasses[key] = pulumi.output(
                createStorageClass(`${name.toLowerCase()}-${key}`, storageClasses[key], {
                    parent,
                    provider: k8sProvider,
                    dependsOn: authDependencies,
                }),
            );
        }
    }

    // Create the VPC CNI addon
    const vpcCni = args.useDefaultVpcCni
        ? undefined
        : new VpcCniAddon(
              `${name}-vpc-cni`,
              {
                  ...args.vpcCniOptions,
                  clusterName: eksCluster.name,
                  clusterVersion: eksCluster.version,
                  tags: args.tags,
              },
              {
                  parent,
                  dependsOn: authDependencies,
                  providers: {
                      ...(provider ? { aws: provider } : {}),
                      kubernetes: k8sProvider,
                  },
              },
          );

    const fargateProfile: pulumi.Output<aws.eks.FargateProfile | undefined> = pulumi
        .output(args.fargate)
        .apply((argsFargate) => {
            let result: aws.eks.FargateProfile | undefined;
            if (argsFargate) {
                const fargate = argsFargate !== true ? argsFargate : {};
                const podExecutionRoleArn =
                    fargate.podExecutionRoleArn ||
                    new ServiceRole(
                        `${name}-podExecutionRole`,
                        {
                            service: "eks-fargate-pods.amazonaws.com",
                            managedPolicyArns: [
                                {
                                    id: "arn:aws:iam::aws:policy/AmazonEKSFargatePodExecutionRolePolicy",
                                    arn: pulumi.interpolate`arn:${partition}:iam::aws:policy/AmazonEKSFargatePodExecutionRolePolicy`,
                                },
                            ],
                            tags: args.tags,
                        },
                        { parent, provider },
                    ).role.apply((r) => r.arn);
                const selectors = fargate.selectors || [
                    // For `fargate: true`, default to including the `default` namespaces and
                    // `kube-system` namespaces so that all pods by default run in Fargate.
                    { namespace: "default" },
                    { namespace: "kube-system" },
                ];

                const reservedAwsPrefix = "eks";
                let fargateProfileName = name;
                const profileNameRegex = new RegExp("^" + reservedAwsPrefix + "-", "i"); // starts with (^) 'eks-', (i)gnore casing
                if (fargateProfileName === reservedAwsPrefix || profileNameRegex.test(name)) {
                    fargateProfileName = fargateProfileName.replace("-", "_");
                    fargateProfileName = `${fargateProfileName}fargateProfile`;
                } else {
                    // default, and to maintain backwards compat for existing cluster fargate profiles.
                    fargateProfileName = `${fargateProfileName}-fargateProfile`;
                }

                result = new aws.eks.FargateProfile(
                    fargateProfileName,
                    {
                        clusterName: eksCluster.name,
                        podExecutionRoleArn: podExecutionRoleArn,
                        selectors: selectors,
                        subnetIds: pulumi.output(clusterSubnetIds).apply((subnets) => {
                            if (fargate.subnetIds?.length && fargate.subnetIds.length > 0) {
                                return computeWorkerSubnets(parent, fargate.subnetIds);
                            } else {
                                return computeWorkerSubnets(parent, subnets);
                            }
                        }),
                    },
                    { parent, dependsOn: eksNodeAccess ? [eksNodeAccess] : undefined, provider },
                );
            }
            return result;
        });

    const corednsExplicitlyEnabled =
        args.corednsAddonOptions?.enabled === true || args.corednsAddonOptions?.configurationValues;
    // We can only enable the coredns addon if we have a node group to place it on
    // This means we are either using the default node group or the cluster is a fargate cluster
    // Also, if the user explicitly enables it then do what they want
    pulumi.output(args.fargate).apply((fargate) => {
        if (
            corednsExplicitlyEnabled ||
            ((fargate || !args.skipDefaultNodeGroup) && (args.corednsAddonOptions?.enabled ?? true))
        ) {
            const corednsVersion: pulumi.Output<string> = args.corednsAddonOptions?.version
                ? pulumi.output(args.corednsAddonOptions.version)
                : aws.eks
                      .getAddonVersionOutput(
                          {
                              addonName: "coredns",
                              kubernetesVersion: eksCluster.version,
                              mostRecent: true, // whether to return the default version or the most recent version for the specified kubernetes version
                          },
                          { parent, provider },
                      )
                      .apply((addonVersion) => addonVersion.version);

            const configurationValues = pulumi
                .all([args.fargate, args.corednsAddonOptions?.configurationValues])
                .apply(([fargate, configurationValues]) => {
                    if (fargate) {
                        return {
                            computeType: "Fargate",
                            ...configurationValues,
                        };
                    } else {
                        return configurationValues;
                    }
                });

            const corednsAddon = new aws.eks.Addon(
                `${name}-coredns`,
                {
                    clusterName: eksCluster.name,
                    addonName: "coredns",
                    tags: args.tags,
                    preserve: true,
                    addonVersion: corednsVersion,
                    resolveConflictsOnCreate:
                        args.corednsAddonOptions?.resolveConflictsOnCreate ?? "OVERWRITE",
                    resolveConflictsOnUpdate:
                        args.corednsAddonOptions?.resolveConflictsOnUpdate ?? "OVERWRITE",
                    configurationValues: stringifyAddonConfiguration(configurationValues),
                },
                {
                    parent,
                    provider,
                    dependsOn: fargateProfile.apply((profile) => {
                        // The coredns addon needs a dependency on the fargate profile because
                        // if there's no profile at the time of deployment, the pods of the
                        // addon will be assigned to the default-scheduler and not the
                        // fargate scheduler.
                        if (profile) {
                            return [profile];
                        } else {
                            return [];
                        }
                    }),
                },
            );
        }
    });

    // Setup OIDC provider to leverage IAM roles for k8s service accounts.
    let oidcProvider: aws.iam.OpenIdConnectProvider | undefined;
    if (args.createOidcProvider) {
        // Retrieve the OIDC provider URL's intermediate root CA fingerprint.
        const awsRegionName = pulumi.output(aws.getRegion({}, { parent, async: true })).name;
        const eksOidcProviderUrl = pulumi.interpolate`https://oidc.eks.${awsRegionName}.${dnsSuffix}`;
        const agent = createHttpAgent(args.proxy);
        const fingerprint = getIssuerCAThumbprint(eksOidcProviderUrl, agent);

        // Create the OIDC provider for the cluster.
        oidcProvider = new aws.iam.OpenIdConnectProvider(
            `${name}-oidcProvider`,
            {
                clientIdLists: ["sts.amazonaws.com"],
                url: eksCluster.identities[0].oidcs[0].issuer,
                thumbprintLists: [fingerprint],
            },
            { parent, provider },
        );
    }

    return {
        vpcId: pulumi.output(vpcId),
        subnetIds: args.subnetIds ? pulumi.output(args.subnetIds) : pulumi.output(clusterSubnetIds),
        publicSubnetIds: args.publicSubnetIds ? pulumi.output(args.publicSubnetIds) : undefined,
        privateSubnetIds: args.privateSubnetIds ? pulumi.output(args.privateSubnetIds) : undefined,
        clusterSecurityGroup: eksClusterSecurityGroup,
        cluster: eksCluster,
        endpoint: endpoint,
        nodeGroupOptions: nodeGroupOptions,
        kubeconfig: kubeconfigWithoutProfile,
        provider: k8sProvider,
        awsProvider: provider,
        vpcCni: vpcCni,
        instanceRoles: instanceRoles,
        eksNodeAccess: eksNodeAccess,
        tags: args.tags,
        nodeSecurityGroupTags: args.nodeSecurityGroupTags,
        storageClasses: userStorageClasses,
        fargateProfile: fargateProfile,
        oidcProvider: oidcProvider,
        encryptionConfig: encryptionConfig,
        clusterIamRole: eksRole,
        accessEntries: createdAccessEntries ? pulumi.output(createdAccessEntries) : undefined,
    };
}

/**
 * Create an HTTP Agent for use with HTTP(S) requests.
 * Using a proxy is supported.
 */
function createHttpAgent(proxy?: string): http.Agent {
    if (!proxy) {
        // Attempt to default to the proxy env vars.
        //
        // Note: Envars used are a convention that were based on:
        // - curl: https://curl.haxx.se/docs/manual.html
        // - wget: https://www.gnu.org/software/wget/manual/html_node/Proxies.html
        proxy =
            process.env.HTTPS_PROXY ||
            process.env.https_proxy ||
            process.env.HTTP_PROXY ||
            process.env.http_proxy;
    }
    if (proxy) {
        /**
         * Create an HTTP(s) proxy agent with the given options.
         *
         * The agent connects to the proxy and issues a HTTP CONNECT
         * method to the proxy, which connects to the dest.
         *
         * Note: CONNECT is not cacheable.
         *
         * See for more details:
         *  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods/CONNECT
         *  - https://www.npmjs.com/package/https-proxy-agent
         */
        return HttpsProxyAgent({
            ...url.parse(proxy),
            rejectUnauthorized: false, // allow proxy configured with self-signed cert
        });
    }
    return new https.Agent({
        // Cached sessions can result in the certificate not being
        // available since its already been "accepted." Disable caching.
        maxCachedSessions: 0,
    });
}

/* tslint:disable-next-line */ // Generating the enum object for ResolveConflictsOnCreate like codegen does
export const ResolveConflictsOnCreate = {
    /**
     * If the self-managed version of the add-on is installed on your cluster, Amazon EKS doesn't change the value. Creation of the add-on might fail.
     */
    None: "NONE",
    /**
     * If the self-managed version of the add-on is installed on your cluster and the Amazon EKS default value is different than the existing value, Amazon EKS changes the value to the Amazon EKS default value.
     */
    Overwrite: "OVERWRITE",
} as const;

/**
 * How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on. Valid values are `NONE` and `OVERWRITE`. For more details see the [CreateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html) API Docs.
 */
export type ResolveConflictsOnCreate =
    (typeof ResolveConflictsOnCreate)[keyof typeof ResolveConflictsOnCreate];

/* tslint:disable-next-line */ // Generating the enum object for ResolveConflictsOnUpdate like codegen does
export const ResolveConflictsOnUpdate = {
    /**
     * Amazon EKS doesn't change the value. The update might fail.
     */
    None: "NONE",
    /**
     * Amazon EKS overwrites the changed value back to the Amazon EKS default value.
     */
    Overwrite: "OVERWRITE",
    /**
     * Amazon EKS preserves the value. If you choose this option, we recommend that you test any field and value changes on a non-production cluster before updating the add-on on your production cluster.
     */
    Preserve: "PRESERVE",
} as const;

/**
 * How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from the Amazon EKS default value. Valid values are `NONE`, `OVERWRITE`, and `PRESERVE`. For more details see the [UpdateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateAddon.html) API Docs.
 */
export type ResolveConflictsOnUpdate =
    (typeof ResolveConflictsOnUpdate)[keyof typeof ResolveConflictsOnUpdate];

export interface CoreDnsAddonOptions {
    /**
     * Whether or not to create the Addon in the cluster.
     *
     * The managed addon can only be enabled if the cluster is a Fargate cluster or if the cluster
     * uses the default node group, otherwise the self-managed addon is used.
     */
    enabled?: boolean;
    /**
     * How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on. Valid values are `NONE` and `OVERWRITE`. For more details see the [CreateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html) API Docs.
     */
    resolveConflictsOnCreate?: ResolveConflictsOnCreate;
    /**
     * How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from the Amazon EKS default value. Valid values are `NONE`, `OVERWRITE`, and `PRESERVE`. For more details see the [UpdateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateAddon.html) API Docs.
     */
    resolveConflictsOnUpdate?: ResolveConflictsOnUpdate;
    /**
     * The version of the EKS add-on. The version must match one of the versions returned by [describe-addon-versions](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-versions.html).
     */
    version?: pulumi.Input<string>;
    /**
     * Custom configuration values for the coredns addon. This object must match the schema derived from [describe-addon-configuration](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-configuration.html).
     */
    configurationValues?: pulumi.Input<object>;
}

export interface KubeProxyAddonOptionsArgs {
    /**
     * Whether or not to create the `kube-proxy` Addon in the cluster
     */
    enabled?: boolean;
    /**
     * How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on. Valid values are `NONE` and `OVERWRITE`. For more details see the [CreateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html) API Docs.
     */
    resolveConflictsOnCreate?: ResolveConflictsOnCreate;
    /**
     * How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from the Amazon EKS default value. Valid values are `NONE`, `OVERWRITE`, and `PRESERVE`. For more details see the [UpdateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateAddon.html) API Docs.
     */
    resolveConflictsOnUpdate?: ResolveConflictsOnUpdate;
    /**
     * The version of the EKS add-on. The version must match one of the versions returned by [describe-addon-versions](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-versions.html).
     */
    version?: pulumi.Input<string>;
    /**
     * Custom configuration values for the kube-proxy addon. This object must match the schema derived from [describe-addon-configuration](https://docs.aws.amazon.com/cli/latest/reference/eks/describe-addon-configuration.html).
     */
    configurationValues?: pulumi.Input<object>;
}

/**
 * ClusterOptions describes the configuration options accepted by an EKSCluster component.
 */
export interface ClusterOptions {
    /**
     * The VPC in which to create the cluster and its worker nodes. If unset, the cluster will be created in the
     * default VPC.
     */
    vpcId?: pulumi.Input<string>;

    /**
     * The set of all subnets, public and private, to use for the worker node
     * groups on the EKS cluster. These subnets are automatically tagged by EKS
     * for Kubernetes purposes.
     *
     * If `vpcId` is not set, the cluster will use the AWS account's default VPC subnets.
     *
     * If the list of subnets includes both public and private subnets, the worker
     * nodes will only be attached to the private subnets, and the public
     * subnets will be used for internet-facing load balancers.
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.
     *
     * Note: The use of `subnetIds`, along with `publicSubnetIds`
     * and/or `privateSubnetIds` is mutually exclusive. The use of
     * `publicSubnetIds` and `privateSubnetIds` is encouraged.
     */
    subnetIds?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * The set of public subnets to use for the worker node groups on the EKS cluster.
     * These subnets are automatically tagged by EKS for Kubernetes purposes.
     *
     * If `vpcId` is not set, the cluster will use the AWS account's default VPC subnets.
     *
     * Worker network architecture options:
     *  - Private-only: Only set `privateSubnetIds`.
     *    - Default workers to run in a private subnet. In this setting, Kubernetes
     *    cannot create public, internet-facing load balancers for your pods.
     *  - Public-only: Only set `publicSubnetIds`.
     *    - Default workers to run in a public subnet.
     *  - Mixed (recommended): Set both `privateSubnetIds` and `publicSubnetIds`.
     *    - Default all worker nodes to run in private subnets, and use the public subnets
     *  for internet-facing load balancers.
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.
     *
     * Note: The use of `subnetIds`, along with `publicSubnetIds`
     * and/or `privateSubnetIds` is mutually exclusive. The use of
     * `publicSubnetIds` and `privateSubnetIds` is encouraged.
     */
    publicSubnetIds?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * The set of private subnets to use for the worker node groups on the EKS cluster.
     * These subnets are automatically tagged by EKS for Kubernetes purposes.
     *
     * If `vpcId` is not set, the cluster will use the AWS account's default VPC subnets.
     *
     * Worker network architecture options:
     *  - Private-only: Only set `privateSubnetIds`.
     *    - Default workers to run in a private subnet. In this setting, Kubernetes
     *    cannot create public, internet-facing load balancers for your pods.
     *  - Public-only: Only set `publicSubnetIds`.
     *    - Default workers to run in a public subnet.
     *  - Mixed (recommended): Set both `privateSubnetIds` and `publicSubnetIds`.
     *    - Default all worker nodes to run in private subnets, and use the public subnets
     *  for internet-facing load balancers.
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html.
     *
     * Note: The use of `subnetIds`, along with `publicSubnetIds`
     * and/or `privateSubnetIds` is mutually exclusive. The use of
     * `publicSubnetIds` and `privateSubnetIds` is encouraged.
     *
     * Also consider setting `nodeAssociatePublicIpAddress: false` for
     * fully private workers.
     */
    privateSubnetIds?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * The common configuration settings for NodeGroups.
     */
    nodeGroupOptions?: ClusterNodeGroupOptions;

    /**
     * Whether or not to auto-assign the EKS worker nodes public IP addresses.
     * If this toggle is set to true, the EKS workers will be
     * auto-assigned public IPs. If false, they will not be auto-assigned
     * public IPs.
     */
    nodeAssociatePublicIpAddress?: boolean;

    /**
     * Optional mappings from AWS IAM roles to Kubernetes users and groups.
     * Only supported with authentication mode `CONFIG_MAP` or `API_AND_CONFIG_MAP`.
     */
    roleMappings?: pulumi.Input<pulumi.Input<RoleMapping>[]>;

    /**
     * Optional mappings from AWS IAM users to Kubernetes users and groups.
     * Only supported with authentication mode `CONFIG_MAP` or `API_AND_CONFIG_MAP`.
     */
    userMappings?: pulumi.Input<pulumi.Input<UserMapping>[]>;

    /**
     * The configuration of the Amazon VPC CNI plugin for this instance. Defaults are described in the documentation
     * for the VpcCniOptions type.
     */
    vpcCniOptions?: Omit<VpcCniAddonOptions, "clusterName">;

    /**
     * Use the default VPC CNI instead of creating a custom one. Should not be used in conjunction with `vpcCniOptions`.
     */
    useDefaultVpcCni?: boolean;

    /**
     * The instance type to use for the cluster's nodes. Defaults to "t3.medium".
     */
    instanceType?: pulumi.Input<aws.ec2.InstanceType | string>;

    /**
     * This enables the simple case of only registering a *single* IAM
     * instance role with the cluster, that is required to be shared by
     * *all* node groups in their instance profiles.
     *
     * Note: options `instanceRole` and `instanceRoles` are mutually exclusive.
     */
    instanceRole?: pulumi.Input<aws.iam.Role>;

    /**
     * The default IAM InstanceProfile to use on the Worker NodeGroups, if one is not already set in the NodeGroup.
     */
    instanceProfileName?: pulumi.Input<string>;

    /**
     * IAM Service Role for EKS to use to manage the cluster.
     */
    serviceRole?: pulumi.Input<aws.iam.Role>;

    /**
     * The IAM Role Provider used to create & authenticate against the EKS cluster. This role is given `[system:masters]`
     * permission in K8S, See: https://docs.aws.amazon.com/eks/latest/userguide/add-user-role.html
     */
    creationRoleProvider?: CreationRoleProvider;

    /**
     * This enables the advanced case of registering *many* IAM instance roles
     * with the cluster for per node group IAM, instead of the simpler, shared case of `instanceRole`.
     * Only supported with authentication mode `CONFIG_MAP` or `API_AND_CONFIG_MAP`.
     *
     * Note: options `instanceRole` and `instanceRoles` are mutually exclusive.
     */
    instanceRoles?: pulumi.Input<pulumi.Input<aws.iam.Role>[]>;

    /**
     * Attach a custom role policy to worker node instance role
     *
     * @deprecated This option has been replaced with the use of
     * `instanceRole` or `instanceRoles`. The role provided to either option
     * should already include all required policies.
     */
    customInstanceRolePolicy?: pulumi.Input<string>;

    /**
     * The AMI ID to use for the worker nodes.
     *
     * Defaults to the latest recommended EKS Optimized Linux AMI from the
     * AWS Systems Manager Parameter Store.
     *
     * Note: `nodeAmiId` and `gpu` are mutually exclusive.
     *
     * See for more details:
     * - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
     */
    nodeAmiId?: pulumi.Input<string>;

    /**
     * Use the latest recommended EKS Optimized Linux AMI with GPU support for
     * the worker nodes from the AWS Systems Manager Parameter Store.
     *
     * Defaults to false.
     *
     * Note: `gpu` and `nodeAmiId` are mutually exclusive.
     *
     * See for more details:
     * - https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
     * - https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
     */
    gpu?: pulumi.Input<boolean>;

    /**
     * Public key material for SSH access to worker nodes. See allowed formats at:
     * https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
     * If not provided, no SSH access is enabled on VMs.
     */
    nodePublicKey?: pulumi.Input<string>;

    /**
     * The subnets to use for worker nodes. Defaults to the value of subnetIds.
     */
    nodeSubnetIds?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * The security group to use for the cluster API endpoint.  If not provided, a new security group will be created
     * with full internet egress and ingress from node groups.
     *
     * Note: The security group resource should not contain any inline ingress or egress rules.
     */
    clusterSecurityGroup?: aws.ec2.SecurityGroup;

    /**
     * The tags to apply to the cluster security group.
     */
    clusterSecurityGroupTags?: InputTags;

    /**
     * Encrypt the root block device of the nodes in the node group.
     */
    nodeRootVolumeEncrypted?: pulumi.Input<boolean>;

    /**
     * The tags to apply to the default `nodeSecurityGroup` created by the cluster.
     *
     * Note: The `nodeSecurityGroupTags` option and the node group option
     * `nodeSecurityGroup` are mutually exclusive.
     */
    nodeSecurityGroupTags?: InputTags;

    /**
     * The size in GiB of a cluster node's root volume. Defaults to 20.
     */
    nodeRootVolumeSize?: pulumi.Input<number>;

    /**
     * Extra code to run on node startup. This code will run after the AWS EKS bootstrapping code and before the node
     * signals its readiness to the managing CloudFormation stack. This code must be a typical user data script:
     * critically it must begin with an interpreter directive (i.e. a `#!`).
     */
    nodeUserData?: pulumi.Input<string>;

    /**
     * The number of worker nodes that should be running in the cluster. Defaults to 2.
     */
    desiredCapacity?: pulumi.Input<number>;

    /**
     * The minimum number of worker nodes running in the cluster. Defaults to 1.
     */
    minSize?: pulumi.Input<number>;

    /**
     * The maximum number of worker nodes running in the cluster. Defaults to 2.
     */
    maxSize?: pulumi.Input<number>;

    /**
     * An optional set of StorageClasses to enable for the cluster. If this is a single volume type rather than a map,
     * a single StorageClass will be created for that volume type.
     *
     * Note: As of Kubernetes v1.11+ on EKS, a default `gp2` storage class will
     * always be created automatically for the cluster by the EKS service. See
     * https://docs.aws.amazon.com/eks/latest/userguide/storage-classes.html
     */
    storageClasses?: { [name: string]: StorageClass } | EBSVolumeType;

    /**
     * If this toggle is set to true, the EKS cluster will be created without node group attached.
     * Defaults to false, unless `fargate` input is provided.
     */
    skipDefaultNodeGroup?: boolean;

    /**
     * If this toggle is set to true, the EKS cluster will be created without the default node and cluster security groups.
     * Defaults to false.
     */
    skipDefaultSecurityGroups?: boolean;

    /**
     * Whether or not to deploy the Kubernetes dashboard to the cluster. If the dashboard is deployed, it can be
     * accessed as follows:
     *
     * 1. Retrieve an authentication token for the dashboard by running the following and copying the value of `token`
     *   from the output of the last command:
     *
     *     $ kubectl -n kube-system get secret | grep eks-admin | awk '{print $1}'
     *     $ kubectl -n kube-system describe secret <output from previous command>
     *
     * 2. Start the kubectl proxy:
     *
     *     $ kubectl proxy
     *
     * 3. Open `http://localhost:8001/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/` in a
     *    web browser.
     * 4. Choose `Token` authentication, paste the token retrieved earlier into the `Token` field, and sign in.
     *
     * Defaults to `false`.
     *
     * @deprecated This option has been deprecated due to a lack of
     * support for it on EKS, and the general community recommendation to avoid
     * using it for security concerns. If you'd like alternatives to deploy the
     * dashboard, consider writing it in Pulumi, or using the Helm chart.
     */
    deployDashboard?: boolean;

    /**
     * Key-value mapping of tags that are automatically applied to all AWS
     * resources directly under management with this cluster, which support tagging.
     */
    tags?: InputTags;

    /**
     * Desired Kubernetes master / control plane version. If you do not specify a value, the latest available version is used.
     */
    version?: pulumi.Input<string>;

    /**
     * Enable EKS control plane logging. This sends logs to cloudwatch.
     * Possible list of values are: ["api", "audit", "authenticator", "controllerManager", "scheduler"].
     * By default it is off.
     */
    enabledClusterLogTypes?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * List of addons to remove upon creation. Any addon listed will be "adopted" and then removed.
     * This allows for the creation of a baremetal cluster where no addon is deployed and direct management of addons via Pulumi Kubernetes resources.
     * Valid entries are kube-proxy, coredns and vpc-cni. Only works on first creation of a cluster.
     */
    defaultAddonsToRemove?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * Options for managing the `coredns` addon.
     */
    corednsAddonOptions?: CoreDnsAddonOptions;

    /**
     * Options for managing the `kube-proxy` addon.
     */
    kubeProxyAddonOptions?: KubeProxyAddonOptionsArgs;

    /**
     * Indicates whether or not the Amazon EKS public API server endpoint is enabled. Default is `true`.
     */
    endpointPublicAccess?: pulumi.Input<boolean>;

    /**
     * Indicates whether or not the Amazon EKS private API server endpoint is enabled.  The default is `false`.
     */
    endpointPrivateAccess?: pulumi.Input<boolean>;

    /**
     * Indicates which CIDR blocks can access the Amazon EKS public API server endpoint.
     */
    publicAccessCidrs?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * Add support for launching pods in Fargate.  Defaults to launching pods in the `default`
     * namespace.  If specified, the default node group is skipped as though `skipDefaultNodeGroup:
     * true` had been passed.
     */
    fargate?: pulumi.Input<boolean | FargateProfile>;

    /**
     * The tags to apply to the EKS cluster.
     */
    clusterTags?: InputTags;

    /**
     * Indicates whether an IAM OIDC Provider is created for the EKS cluster.
     *
     * The OIDC provider is used in the cluster in combination with k8s
     * Service Account annotations to provide IAM roles at the k8s Pod level.
     *
     * See for more details:
     * - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
     * - https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
     * - https://aws.amazon.com/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/
     * - https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/aws/eks/#enabling-iam-roles-for-service-accounts
     */
    createOidcProvider?: pulumi.Input<boolean>;

    /**
     * The cluster's physical resource name.
     *
     * If not specified, the default is to use auto-naming for the cluster's
     * name, resulting in a physical name with the format `${name}-eksCluster-0123abcd`.
     *
     * See for more details:
     * https://www.pulumi.com/docs/intro/concepts/programming-model/#autonaming
     */
    name?: pulumi.Input<string>;

    /**
     * The HTTP(S) proxy to use within a proxied environment.
     *
     * The proxy is used during cluster creation, and OIDC configuration.
     *
     * This is an alternative option to setting the proxy environment variables:
     * HTTP(S)_PROXY and/or http(s)_proxy.
     *
     * This option is required iff the proxy environment variables are not set.
     *
     * Format:      <protocol>://<host>:<port>
     * Auth Format: <protocol>://<username>:<password>@<host>:<port>
     *
     * Ex:
     *   - "http://proxy.example.com:3128"
     *   - "https://proxy.example.com"
     *   - "http://username:password@proxy.example.com:3128"
     */
    proxy?: string;

    /**
     * The AWS provider credential options to scope the cluster's kubeconfig
     * authentication when using a non-default credential chain.
     *
     * This is required for certain auth scenarios. For example:
     * - Creating and using a new AWS provider instance, or
     * - Setting the AWS_PROFILE environment variable, or
     * - Using a named profile configured on the AWS provider via:
     * `pulumi config set aws:profile <profileName>`
     *
     * See for more details:
     * - https://www.pulumi.com/registry/packages/aws/api-docs/provider/
     * - https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/
     * - https://www.pulumi.com/docs/intro/cloud-providers/aws/#configuration
     * - https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
     */
    providerCredentialOpts?: pulumi.Input<KubeconfigOptions>;

    /**
     * Sets the 'enableConfigMapMutable' option on the cluster kubernetes provider.
     * Applies updates to the aws-auth ConfigMap in place over a replace operation if set to true.
     * https://www.pulumi.com/registry/packages/kubernetes/api-docs/provider/#enableconfigmapmutable_nodejs
     */
    enableConfigMapMutable?: pulumi.Input<boolean>;

    /**
     * KMS Key ARN to use with the encryption configuration for the cluster.
     *
     * Only available on Kubernetes 1.13+ clusters created after March 6, 2020.
     * See for more details:
     * - https://aws.amazon.com/about-aws/whats-new/2020/03/amazon-eks-adds-envelope-encryption-for-secrets-with-aws-kms/
     */
    encryptionConfigKeyArn?: pulumi.Input<string>;

    /**
     * The CIDR block to assign Kubernetes service IP addresses from. If you don't specify a block, Kubernetes assigns
     * addresses from either the 10.100.0.0/16 or 172.20.0.0/16 CIDR blocks. We recommend that you specify a block that
     * does not overlap with resources in other networks that are peered or connected to your VPC. You can only specify
     * a custom CIDR block when you create a cluster, changing this value will force a new cluster to be created.
     *
     * The block must meet the following requirements:
     * - Within one of the following private IP address blocks: 10.0.0.0/8, 172.16.0.0.0/12, or 192.168.0.0/16.
     * - Doesn't overlap with any CIDR block assigned to the VPC that you selected for VPC.
     * - Between /24 and /12.
     */
    kubernetesServiceIpAddressRange?: pulumi.Input<string>;

    /**
     * The IP family used to assign Kubernetes pod and service addresses. Valid values are ipv4 (default) and ipv6.
     * You can only specify an IP family when you create a cluster, changing this value will force
     * a new cluster to be created.
     */
    ipFamily?: pulumi.Input<string>;

    /**
     * The authentication mode of the cluster. Valid values are `CONFIG_MAP`, `API` or `API_AND_CONFIG_MAP`
     * See for more details:\nhttps://docs.aws.amazon.com/eks/latest/userguide/grant-k8s-access.html#set-cam
     */
    authenticationMode?: AuthenticationMode;

    /**
     * Access entries to add to the EKS cluster. They can be used to allow IAM principals to access the cluster.
     * Access entries are only supported with authentication mode `API` or `API_AND_CONFIG_MAP`.
     *
     * See for more details:\nhttps://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
     */
    accessEntries?: { [key: string]: AccessEntry };
}

/**
 * FargateProfile defines how Kubernetes pods are executed in Fargate. See
 * aws.eks.FargateProfileArgs for reference.
 */
export interface FargateProfile {
    /**
     * Specify a custom role to use for executing pods in Fargate. Defaults to creating a new role
     * with the `arn:[partition]:iam::aws:policy/AmazonEKSFargatePodExecutionRolePolicy` policy attached.
     */
    podExecutionRoleArn?: pulumi.Input<string>;
    /**
     * Specify the subnets in which to execute Fargate tasks for pods.  Defaults to the private
     * subnets associated with the cluster.
     */
    subnetIds?: pulumi.Input<pulumi.Input<string>[]>;
    /**
     * Specify the namespace and label selectors to use for launching pods into Fargate.
     */
    selectors?: pulumi.Input<pulumi.Input<aws.types.input.eks.FargateProfileSelector>[]>;
}

/**
 * ClusterNodeGroupOptions describes the configuration options accepted by a cluster
 * to create its own node groups. It's a subset of NodeGroupOptions.
 */
export interface ClusterNodeGroupOptions extends NodeGroupBaseOptions {}

export interface AccessEntry {
    /**
     * The IAM Principal ARN which requires Authentication access to the EKS cluster.
     */
    principalArn: pulumi.Input<string>;

    /**
     * Defaults to the principalArn if the principal is a user, else defaults to assume-role/session-name.
     */
    username?: pulumi.Input<string>;

    /**
     * A list of groups within Kubernetes to which the IAM principal is mapped to.
     */
    kubernetesGroups?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * The access policies to associate to the access entry.
     */
    accessPolicies?: { [key: string]: pulumi.Input<AccessPolicyAssociation> };

    /**
     * The tags to apply to the AccessEntry.
     */
    tags?: InputTags;

    /**
     * The type of the new access entry. Valid values are STANDARD, FARGATE_LINUX, EC2_LINUX, and EC2_WINDOWS.
     *
     * Defaults to STANDARD which provides the standard workflow. EC2_LINUX and EC2_WINDOWS types disallow users
     * to input a kubernetesGroup, and prevent associating access policies..
     */
    type?: pulumi.Input<AccessEntryType>;
}

export interface AccessPolicyAssociation {
    /**
     * The ARN of the access policy to associate with the principal
     */
    policyArn: pulumi.Input<string>;

    /**
     * The scope of the access policy association. This controls whether the access policy is scoped to the cluster or to a particular namespace.
     */
    accessScope: aws.types.input.eks.AccessPolicyAssociationAccessScope;
}

/* tslint:disable-next-line */ // Generating the enum object for AuthenticationMode like codegen does
export const AuthenticationMode = {
    /**
     * Only Access Entries will be used for authenticating to the Kubernetes API.
     */
    API: "API",
    /**
     * Only aws-auth ConfigMap will be used for authenticating to the Kubernetes API.
     *
     * @deprecated The aws-auth ConfigMap is deprecated. The recommended method to manage access to Kubernetes APIs is Access Entries with the AuthenticationMode API.
     * For more information and instructions how to upgrade, see https://docs.aws.amazon.com/eks/latest/userguide/migrating-access-entries.html.
     */
    CONFIG_MAP: "CONFIG_MAP",
    /**
     * Both aws-auth ConfigMap and Access Entries can be used for authenticating to the Kubernetes API.
     *
     * @deprecated The aws-auth ConfigMap is deprecated. The recommended method to manage access to Kubernetes APIs is Access Entries with the AuthenticationMode API.
     * For more information and instructions how to upgrade, see https://docs.aws.amazon.com/eks/latest/userguide/migrating-access-entries.html.
     */
    API_AND_CONFIG_MAP: "API_AND_CONFIG_MAP",
} as const;

/**
 * The authentication mode of the cluster. Valid values are `CONFIG_MAP`, `API` or `API_AND_CONFIG_MAP`
 * See for more details:\nhttps://docs.aws.amazon.com/eks/latest/userguide/grant-k8s-access.html#set-cam
 */
export type AuthenticationMode = (typeof AuthenticationMode)[keyof typeof AuthenticationMode];

/* tslint:disable-next-line */ // Generating the enum object for AccessEntryType like codegen does
export const AccessEntryType = {
    /**
     * Standard Access Entry Workflow. Allows users to input a username and kubernetesGroup, and to associate access policies.
     */
    STANDARD: "STANDARD",
    /**
     * For IAM roles used with AWS Fargate profiles.
     */
    FARGATE_LINUX: "FARGATE_LINUX",
    /**
     * For IAM roles associated with self-managed Linux node groups. Allows the nodes to join the cluster.
     */
    EC2_LINUX: "EC2_LINUX",
    /**
     * For IAM roles associated with self-managed Windows node groups. Allows the nodes to join the cluster.
     */
    EC2_WINDOWS: "EC2_WINDOWS",
} as const;

/**
 * The authentication mode of the cluster. Valid values are `CONFIG_MAP`, `API` or `API_AND_CONFIG_MAP`
 * See for more details:\nhttps://docs.aws.amazon.com/eks/latest/userguide/grant-k8s-access.html#set-cam
 */
export type AccessEntryType = (typeof AccessEntryType)[keyof typeof AccessEntryType];

/**
 * Cluster is a component that wraps the AWS and Kubernetes resources necessary to run an EKS cluster, its worker
 * nodes, its optional StorageClasses, and an optional deployment of the Kubernetes Dashboard.
 */
export class Cluster extends pulumi.ComponentResource {
    /**
     * A kubeconfig that can be used to connect to the EKS cluster.
     */
    public readonly kubeconfig: pulumi.Output<any>;

    /**
     * A kubeconfig that can be used to connect to the EKS cluster as a JSON string.
     */
    public readonly kubeconfigJson: pulumi.Output<string>;

    /**
     * The AWS resource provider.
     */
    public readonly awsProvider: pulumi.ProviderResource;

    /**
     * A Kubernetes resource provider that can be used to deploy into this cluster. For example, the code below will
     * create a new Pod in the EKS cluster.
     *
     *     let eks = new Cluster("eks");
     *     let pod = new kubernetes.core.v1.Pod("pod", { ... }, { provider: eks.provider });
     *
     */
    public readonly provider: k8s.Provider;

    /**
     * The security group for the EKS cluster.
     */
    public readonly clusterSecurityGroup: aws.ec2.SecurityGroup | undefined;

    /**
     * The service roles used by the EKS cluster.
     */
    public readonly instanceRoles: pulumi.Output<aws.iam.Role[]>;

    /**
     * The security group for the cluster's nodes.
     */
    public readonly nodeSecurityGroup: aws.ec2.SecurityGroup | undefined;

    /**
     * The ingress rule that gives node group access to cluster API server
     */
    public readonly eksClusterIngressRule: aws.ec2.SecurityGroupRule | undefined;

    /**
     * The default Node Group configuration, or undefined if `skipDefaultNodeGroup` was specified.
     */
    public readonly defaultNodeGroup: NodeGroupV2Data | undefined;

    /**
     * The EKS cluster.
     */
    public readonly eksCluster: aws.eks.Cluster;

    /**
     * The EKS cluster and its dependencies.
     */
    public readonly core: CoreData;

    /**
     * Create a new EKS cluster with worker nodes, optional storage classes, and deploy the Kubernetes Dashboard if
     * requested.
     *
     * @param name The _unique_ name of this component.
     * @param args The arguments for this cluster.
     * @param opts A bag of options that control this component's behavior.
     */
    constructor(name: string, args?: ClusterOptions, opts?: pulumi.ComponentResourceOptions) {
        const type = "eks:index:Cluster";

        if (opts?.urn) {
            const props = {
                kubeconfig: undefined,
                eksCluster: undefined,
            };
            super(type, name, props, opts);
            return;
        }

        super(type, name, args, opts);

        const cluster = createCluster(name, this, args, opts);
        this.kubeconfig = cluster.kubeconfig;
        this.kubeconfigJson = cluster.kubeconfigJson;
        this.clusterSecurityGroup = cluster.clusterSecurityGroup;
        this.instanceRoles = cluster.instanceRoles;
        this.nodeSecurityGroup = cluster.nodeSecurityGroup;
        this.eksClusterIngressRule = cluster.eksClusterIngressRule;
        this.defaultNodeGroup = cluster.defaultNodeGroup;
        this.eksCluster = cluster.eksCluster;
        this.core = cluster.core;

        this.registerOutputs({
            kubeconfig: this.kubeconfig,
            eksCluster: this.eksCluster,
        });
    }

    /**
     * Generate a kubeconfig for cluster authentication that does not use the
     * default AWS credential provider chain, and instead is scoped to
     * the supported options in `KubeconfigOptions`.
     *
     * The kubeconfig generated is automatically stringified for ease of use
     * with the pulumi/kubernetes provider.
     *
     * See for more details:
     * - https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
     * - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html
     * - https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html
     */
    getKubeconfig(args: KubeconfigOptions): pulumi.Output<string> {
        const region = this.eksCluster.arn.apply(getRegionFromArn);
        const kc = generateKubeconfig(
            this.eksCluster.name,
            this.eksCluster.endpoint,
            region,
            true,
            this.eksCluster.certificateAuthority?.data,
            args,
        );
        return pulumi.output(kc).apply(JSON.stringify);
    }
}

/** @internal */
export interface ClusterResult {
    kubeconfig: pulumi.Output<any>;
    kubeconfigJson: pulumi.Output<string>;
    awsProvider?: pulumi.ProviderResource;
    clusterSecurityGroup?: aws.ec2.SecurityGroup;
    instanceRoles: pulumi.Output<aws.iam.Role[]>;
    nodeSecurityGroup?: aws.ec2.SecurityGroup;
    eksClusterIngressRule?: aws.ec2.SecurityGroupRule;
    defaultNodeGroup: NodeGroupV2Data | undefined;
    eksCluster: aws.eks.Cluster;
    core: CoreData;
    clusterSecurityGroupId: pulumi.Output<string>;
    nodeSecurityGroupId: pulumi.Output<string>;
    clusterIngressRuleId: pulumi.Output<string>;
    defaultNodeGroupAsgName: pulumi.Output<string>;
    fargateProfileId: pulumi.Output<string>;
    fargateProfileStatus: pulumi.Output<string>;
    oidcProviderArn: pulumi.Output<string>;
    oidcProviderUrl: pulumi.Output<string>;
    oidcIssuer: pulumi.Output<string>;
}

/** @internal */
export function createCluster(
    name: string,
    self: pulumi.ComponentResource,
    args?: ClusterOptions,
    opts?: pulumi.ComponentResourceOptions,
): ClusterResult {
    args = args || {};

    // Check that AWS provider credential options are set for the kubeconfig
    // to use with the given auth method.
    if (opts?.provider && !args.providerCredentialOpts) {
        throw new Error(
            "It looks like you're using an explicit AWS provider. Please specify this provider in providerCredentialOpts.",
        );
    }
    if (process.env.AWS_PROFILE && !args.providerCredentialOpts) {
        args.providerCredentialOpts = {
            profileName: process.env.AWS_PROFILE,
        };
    }
    const awsConfig = new pulumi.Config("aws");
    const awsProfile = awsConfig.get("profile");
    if (awsProfile && !args.providerCredentialOpts) {
        args.providerCredentialOpts = {
            profileName: awsProfile,
        };
    }

    // Create the core resources required by the cluster.
    const core = createCore(name, args, self, opts?.provider);

    let nodeSecurityGroup: aws.ec2.SecurityGroup | undefined;
    let eksClusterIngressRule: aws.ec2.SecurityGroupRule | undefined;
    if (!args.skipDefaultSecurityGroups) {
        if (!core.clusterSecurityGroup) {
            throw new pulumi.ResourceError(
                "clusterSecurityGroup is required when creating the default node group.",
                self,
            );
        }

        // Create default node group security group and cluster ingress rule.
        [nodeSecurityGroup, eksClusterIngressRule] = createNodeGroupSecurityGroup(
            name,
            {
                vpcId: core.vpcId,
                clusterSecurityGroupId: core.clusterSecurityGroup.id,
                eksCluster: core.cluster,
                tags: pulumi.all([args.tags, args.nodeSecurityGroupTags]).apply(
                    ([tags, nodeSecurityGroupTags]) =>
                        <aws.Tags>{
                            ...nodeSecurityGroupTags,
                            ...tags,
                        },
                ),
            },
            self,
        );
        core.nodeGroupOptions.nodeSecurityGroup = nodeSecurityGroup;
        core.nodeGroupOptions.clusterIngressRule = eksClusterIngressRule;
    }

    const skipDefaultNodeGroup = args.skipDefaultNodeGroup || args.fargate;

    // Create the default worker node group and grant the workers access to the API server.
    let defaultNodeGroup: NodeGroupV2Data | undefined = undefined;
    if (!skipDefaultNodeGroup) {
        defaultNodeGroup = createNodeGroupV2(
            name,
            {
                cluster: core,
                ...core.nodeGroupOptions,
            },
            self,
        );
    }

    const kubeconfigJson = pulumi.jsonStringify(core.kubeconfig);

    const oidcIssuerUrl = core.cluster.identities.apply((identities) => {
        // this is nowadays guaranteed to be present, but we still check for it to be safe
        // this was not set for cluster version 1.14 and below. Those versions are not available anymore
        // since 2020-12-08 and clusters were force upgraded
        if (
            identities &&
            identities.length > 0 &&
            identities[0].oidcs &&
            identities[0].oidcs.length > 0
        ) {
            return identities[0].oidcs[0].issuer;
        }
        return "";
    });

    return {
        core,
        clusterSecurityGroup: core.clusterSecurityGroup,
        eksCluster: core.cluster,
        instanceRoles: core.instanceRoles,
        awsProvider: core.awsProvider,
        nodeSecurityGroup,
        eksClusterIngressRule,
        defaultNodeGroup,
        kubeconfig: pulumi.output(core.kubeconfig),
        kubeconfigJson,
        // If the cluster is created without default security groups, we're returning the EKS created security group
        // see: https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html#security-group-default-rules
        clusterSecurityGroupId:
            core.clusterSecurityGroup?.id ?? core.cluster.vpcConfig.clusterSecurityGroupId,
        nodeSecurityGroupId: nodeSecurityGroup?.id ?? core.cluster.vpcConfig.clusterSecurityGroupId,

        clusterIngressRuleId: eksClusterIngressRule?.securityGroupRuleId ?? pulumi.output(""),
        defaultNodeGroupAsgName: defaultNodeGroup?.autoScalingGroup.name ?? pulumi.output(""),
        fargateProfileId: core.fargateProfile.apply(
            (fargateProfile) => fargateProfile?.id ?? pulumi.output(""),
        ),
        fargateProfileStatus: core.fargateProfile.apply(
            (fargateProfile) => fargateProfile?.status ?? pulumi.output(""),
        ),
        oidcProviderArn: core.oidcProvider?.arn ?? pulumi.output(""),
        oidcProviderUrl: oidcIssuerUrl,
        // The issuer is the issuer URL without the protocol part
        oidcIssuer: oidcIssuerUrl.apply((url) => url.replace("https://", "")),
    };
}

/**
 * This is a variant of `Cluster` that is used for the MLC `Cluster`. We don't just use `Cluster`,
 * because not all of its output properties are typed as `Output<T>`, which prevents it from being
 * able to be correctly "rehydrated" from a resource reference. So we use this copy instead rather
 * than modifying the public surface area of the existing `Cluster` class, which is still being
 * used directly by users using the Node.js SDK. Once we move Node.js over to the generated MLC SDK,
 * we can clean all this up. Internally, this leverages the same `createCluster` helper method that
 * `Cluster` uses.
 *
 * @internal
 */
export class ClusterInternal extends pulumi.ComponentResource {
    public readonly clusterSecurityGroup!: pulumi.Output<aws.ec2.SecurityGroup | undefined>;
    public readonly core!: pulumi.Output<pulumi.Unwrap<CoreData>>;
    public readonly defaultNodeGroup!: pulumi.Output<pulumi.Unwrap<NodeGroupV2Data> | undefined>;
    public readonly eksCluster!: pulumi.Output<aws.eks.Cluster>;
    public readonly eksClusterIngressRule!: pulumi.Output<aws.ec2.SecurityGroupRule | undefined>;
    public readonly instanceRoles!: pulumi.Output<aws.iam.Role[]>;
    public readonly kubeconfig!: pulumi.Output<any>;
    public readonly kubeconfigJson!: pulumi.Output<string>;
    public readonly nodeSecurityGroup!: pulumi.Output<aws.ec2.SecurityGroup | undefined>;

    public readonly clusterSecurityGroupId: pulumi.Output<string>;
    public readonly nodeSecurityGroupId: pulumi.Output<string>;
    public readonly clusterIngressRuleId: pulumi.Output<string>;
    public readonly defaultNodeGroupAsgName: pulumi.Output<string>;
    public readonly fargateProfileId: pulumi.Output<string>;
    public readonly fargateProfileStatus: pulumi.Output<string>;
    public readonly oidcProviderArn: pulumi.Output<string>;
    public readonly oidcProviderUrl: pulumi.Output<string>;
    public readonly oidcIssuer: pulumi.Output<string>;

    constructor(name: string, args?: ClusterOptions, opts?: pulumi.ComponentResourceOptions) {
        const type = "eks:index:Cluster";

        if (opts?.urn) {
            const props = {
                clusterSecurityGroup: undefined,
                core: undefined,
                defaultNodeGroup: undefined,
                eksCluster: undefined,
                eksClusterIngressRule: undefined,
                instanceRoles: undefined,
                kubeconfig: undefined,
                kubeconfigJson: undefined,
                nodeSecurityGroup: undefined,
                clusterSecurityGroupId: undefined,
                nodeSecurityGroupId: undefined,
                clusterIngressRuleId: undefined,
                defaultNodeGroupAsgName: undefined,
                fargateProfileId: undefined,
                fargateProfileStatus: undefined,
                oidcProviderArn: undefined,
                oidcProviderUrl: undefined,
                oidcIssuer: undefined,
            };
            super(type, name, props, opts);
            return;
        }

        super(type, name, args, opts);

        if (args?.creationRoleProvider?.provider) {
            throw new Error(
                "The `creationRoleProvider.provider` option is not supported in non-nodejs Pulumi programs. Please use the `providerCredentialOpts` option instead.",
            );
        }

        const cluster = createCluster(name, this, args, opts);
        this.kubeconfig = cluster.kubeconfig;
        this.kubeconfigJson = cluster.kubeconfigJson;
        this.clusterSecurityGroup = pulumi.output(cluster.clusterSecurityGroup);
        this.instanceRoles = cluster.instanceRoles;
        this.nodeSecurityGroup = pulumi.output(cluster.nodeSecurityGroup);
        this.eksClusterIngressRule = pulumi.output(cluster.eksClusterIngressRule);
        this.defaultNodeGroup = pulumi.output(cluster.defaultNodeGroup);
        this.eksCluster = pulumi.output(cluster.eksCluster);
        this.core = pulumi.output(cluster.core);
        this.clusterSecurityGroupId = pulumi.output(cluster.clusterSecurityGroupId);
        this.nodeSecurityGroupId = pulumi.output(cluster.nodeSecurityGroupId);
        this.clusterIngressRuleId = pulumi.output(cluster.clusterIngressRuleId);
        this.defaultNodeGroupAsgName = pulumi.output(cluster.defaultNodeGroupAsgName);
        this.fargateProfileId = pulumi.output(cluster.fargateProfileId);
        this.fargateProfileStatus = pulumi.output(cluster.fargateProfileStatus);
        this.oidcProviderArn = pulumi.output(cluster.oidcProviderArn);
        this.oidcProviderUrl = pulumi.output(cluster.oidcProviderUrl);
        this.oidcIssuer = pulumi.output(cluster.oidcIssuer);

        this.registerOutputs({
            clusterSecurityGroup: this.clusterSecurityGroup,
            core: this.core,
            defaultNodeGroup: this.defaultNodeGroup,
            eksCluster: this.eksCluster,
            eksClusterIngressRule: this.eksClusterIngressRule,
            instanceRoles: this.instanceRoles,
            kubeconfig: this.kubeconfig,
            kubeconfigJson: this.kubeconfigJson,
            nodeSecurityGroup: this.nodeSecurityGroup,
            clusterSecurityGroupId: this.clusterSecurityGroupId,
            nodeSecurityGroupId: this.nodeSecurityGroupId,
            clusterIngressRuleId: this.clusterIngressRuleId,
            defaultNodeGroupAsgName: this.defaultNodeGroupAsgName,
            fargateProfileId: this.fargateProfileId,
            fargateProfileStatus: this.fargateProfileStatus,
            oidcProviderArn: this.oidcProviderArn,
            oidcProviderUrl: this.oidcProviderUrl,
            oidcIssuer: this.oidcIssuer,
        });
    }

    getKubeconfig(args: KubeconfigOptions): pulumi.Output<string> {
        const region = this.eksCluster.arn.apply(getRegionFromArn);
        const kc = generateKubeconfig(
            this.eksCluster.name,
            this.eksCluster.endpoint,
            region,
            true,
            this.eksCluster.certificateAuthority?.data,
            args,
        );
        return pulumi.output(kc).apply(JSON.stringify);
    }
}
