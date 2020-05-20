// Copyright 2016-2019, Pulumi Corporation.
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

import * as childProcess from "child_process";
import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as HttpsProxyAgent from "https-proxy-agent";
import * as jsyaml from "js-yaml";
import * as process from "process";
import * as tmp from "tmp";
import * as url from "url";
import * as which from "which";

import { getIssuerCAThumbprint } from "./cert-thumprint";
import { VpcCni, VpcCniOptions } from "./cni";
import { createDashboard } from "./dashboard";
import { computeWorkerSubnets, createNodeGroup, NodeGroup, NodeGroupBaseOptions, NodeGroupData } from "./nodegroup";
import { createNodeGroupSecurityGroup } from "./securitygroup";
import { ServiceRole } from "./servicerole";
import { createStorageClass, EBSVolumeType, StorageClass } from "./storageclass";
import { InputTags, UserStorageClasses } from "./utils";

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
    clusterSecurityGroup: aws.ec2.SecurityGroup;
    provider: k8s.Provider;
    instanceRoles: pulumi.Output<aws.iam.Role[]>;
    nodeGroupOptions: ClusterNodeGroupOptions;
    awsProvider?: pulumi.ProviderResource;
    publicSubnetIds?: pulumi.Output<string[]>;
    privateSubnetIds?: pulumi.Output<string[]>;
    eksNodeAccess?: k8s.core.v1.ConfigMap;
    storageClasses?: UserStorageClasses;
    kubeconfig?: pulumi.Output<any>;
    vpcCni?: VpcCni;
    tags?: InputTags;
    nodeSecurityGroupTags?: InputTags;
    fargateProfile?: aws.eks.FargateProfile;
    oidcProvider?: aws.iam.OpenIdConnectProvider;
    encryptionConfig?: pulumi.Output<aws.types.output.eks.ClusterEncryptionConfig>;
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
        instanceProfile = aws.iam.InstanceProfile.get(`${name}-instanceProfile`,
            instanceProfileName, undefined, { parent, provider });
    } else {
        instanceProfile = new aws.iam.InstanceProfile(`${name}-instanceProfile`, {
            role: instanceRoleName,
        }, { parent, provider });
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
function generateKubeconfig(
    clusterName: pulumi.Input<string>,
    clusterEndpoint: pulumi.Input<string>,
    certData: pulumi.Input<string>,
    opts?: KubeconfigOptions) {
    let args = ["eks", "get-token", "--cluster-name", clusterName];
    let env: ExecEnvVar[] | undefined;

    if (opts?.roleArn) {
        args = [...args, "--role", opts.roleArn];
    }
    if (opts?.profileName) {
        env = [{
            "name": "AWS_PROFILE",
            "value": opts.profileName,
        }];
    }

    return {
        apiVersion: "v1",
        clusters: [{
            cluster: {
                server: clusterEndpoint,
                "certificate-authority-data": certData,
            },
            name: "kubernetes",
        }],
        contexts: [{
            context: {
                cluster: "kubernetes",
                user: "aws",
            },
            name: "aws",
        }],
        "current-context": "aws",
        kind: "Config",
        users: [{
            name: "aws",
            user: {
                exec: {
                    apiVersion: "client.authentication.k8s.io/v1alpha1",
                    command: "aws",
                    args: args,
                    env: env,
                },
            },
        }],
    };
}

/**
 * getRoleProvider creates a role provider that can be passed to `new eks.Cluster("test", {
 * creationRoleProvider: ... })`.  This can be used to provide a specific role to use for the
 * creation of the EKS cluster different from the role being used to run the Pulumi deployment.
 */
export function getRoleProvider(
    name: string,
    region?: aws.Region,
    profile?: string,
    parent?: pulumi.ComponentResource,
    provider?: pulumi.ProviderResource,
): CreationRoleProvider {
    const iamRole = new aws.iam.Role(`${name}-eksClusterCreatorRole`, {
        assumeRolePolicy: aws.getCallerIdentity({ parent, async: true }).then(id => `{
            "Version": "2012-10-17",
            "Statement": [
                {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::${id.accountId}:root"
                },
                "Action": "sts:AssumeRole"
                }
            ]
            }`,
        ),
        description: `Admin access to eks-${name}`,
    }, {parent, provider});

    // `eks:*` is needed to create/read/update/delete the EKS cluster, `iam:PassRole` is needed to pass the EKS service role to the cluster
    // https://docs.aws.amazon.com/eks/latest/userguide/service_IAM_role.html
    const rolePolicy = new aws.iam.RolePolicy(`${name}-eksClusterCreatorPolicy`, {
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

    const creatorProvider = new aws.Provider(`${name}-eksClusterCreatorEntity`, {
        region: region,
        profile: profile,
        assumeRole: {
            roleArn: iamRole.arn.apply(async (arn) => {
                // wait 30 seconds to assume the IAM Role https://github.com/pulumi/pulumi-aws/issues/673
                if (!pulumi.runtime.isDryRun()) {
                    await new Promise(resolve => setTimeout(resolve, 30 * 1000));
                }
                return arn;
            }),
        },
    }, { parent: iamRole, provider });

    return {
        role: iamRole,
        provider: creatorProvider,
    };
}

/**
 * Create the core components and settings required for the EKS cluster.
 */
export function createCore(name: string, args: ClusterOptions, parent: pulumi.ComponentResource, provider?: pulumi.ProviderResource): CoreData {
    // Check to ensure that aws CLI is installed, as we'll need it in order to deploy k8s resources
    // to the EKS cluster.
    try {
        which.sync("aws");
    } catch (err) {
        throw new Error("Could not find aws CLI for EKS. See https://github.com/pulumi/pulumi-eks for installation instructions.");
    }

    if (args.instanceRole && args.instanceRoles) {
        throw new Error("instanceRole and instanceRoles are mutually exclusive, and cannot both be set.");
    }

    if (args.subnetIds && (args.publicSubnetIds || args.privateSubnetIds)) {
        throw new Error("subnetIds, and the use of publicSubnetIds and/or privateSubnetIds are mutually exclusive. Choose a single approach.");
    }

    if (args.nodeGroupOptions && (
        args.nodeAssociatePublicIpAddress ||
        args.instanceType ||
        args.nodePublicKey ||
        args.nodeRootVolumeSize ||
        args.nodeUserData ||
        args.minSize ||
        args.maxSize ||
        args.desiredCapacity ||
        args.nodeAmiId ||
        args.gpu)) {
        throw new Error("Setting nodeGroupOptions, and any set of singular node group option(s) on the cluster, is mutually exclusive. Choose a single approach.");
    }

    // Configure the node group options.
    const nodeGroupOptions: ClusterNodeGroupOptions = args.nodeGroupOptions || {
        nodeSubnetIds: args.nodeSubnetIds,
        nodeAssociatePublicIpAddress: args.nodeAssociatePublicIpAddress,
        instanceType: args.instanceType,
        nodePublicKey: args.nodePublicKey,
        nodeRootVolumeSize: args.nodeRootVolumeSize,
        nodeUserData: args.nodeUserData,
        minSize: args.minSize,
        maxSize: args.maxSize,
        desiredCapacity: args.desiredCapacity,
        amiId: args.nodeAmiId,
        gpu: args.gpu,
        version: args.version,
    };

    // Configure default networking architecture.
    let vpcId: pulumi.Input<string> = args.vpcId!;
    let clusterSubnetIds: pulumi.Input<pulumi.Input<string>[]> = [];

    // If no VPC is set, use the default VPC's subnets.
    if (!args.vpcId) {
        const invokeOpts = { parent, async: true };
        const vpc = aws.ec2.getVpc({ default: true }, invokeOpts);
        vpcId = vpc.then(v => v.id);
        clusterSubnetIds = vpc.then(v => aws.ec2.getSubnetIds({ vpcId: v.id }, invokeOpts)).then(subnets => subnets.ids);
    }

    // Form the subnetIds to use on the cluster from either:
    //  - subnetIds
    //  - A combination of privateSubnetIds and/or publicSubnetIds.
    if (args.subnetIds !== undefined) {
        clusterSubnetIds = args.subnetIds;
    } else if (args.publicSubnetIds !== undefined || args.privateSubnetIds !== undefined) {
        clusterSubnetIds = pulumi.all([
            args.publicSubnetIds || [],
            args.privateSubnetIds || [],
        ]).apply(([publicIds, privateIds]) => {
            return [...publicIds, ...privateIds];
        });
    }

    // Create the EKS service role
    let eksRole: pulumi.Output<aws.iam.Role>;
    if (args.serviceRole) {
        eksRole = pulumi.output(args.serviceRole);
    } else {
        eksRole = (new ServiceRole(`${name}-eksRole`, {
            service: "eks.amazonaws.com",
            description: "Allows EKS to manage clusters on your behalf.",
            managedPolicyArns: [
                "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
                "arn:aws:iam::aws:policy/AmazonEKSServicePolicy",
            ],
        }, { parent, provider })).role;
    }

    // Create the EKS cluster security group
    let eksClusterSecurityGroup: aws.ec2.SecurityGroup;
    if (args.clusterSecurityGroup) {
        eksClusterSecurityGroup = args.clusterSecurityGroup;
    } else {
        eksClusterSecurityGroup = new aws.ec2.SecurityGroup(`${name}-eksClusterSecurityGroup`, {
            vpcId: vpcId,
            revokeRulesOnDelete: true,
            tags: pulumi.all([
                args.tags,
                args.clusterSecurityGroupTags,
            ]).apply(([tags, clusterSecurityGroupTags]) => (<aws.Tags>{
                "Name": `${name}-eksClusterSecurityGroup`,
                ...clusterSecurityGroupTags,
                ...tags,
            })),
        }, { parent, provider });

        const eksClusterInternetEgressRule = new aws.ec2.SecurityGroupRule(`${name}-eksClusterInternetEgressRule`, {
            description: "Allow internet access.",
            type: "egress",
            fromPort: 0,
            toPort: 0,
            protocol: "-1",  // all
            cidrBlocks: ["0.0.0.0/0"],
            securityGroupId: eksClusterSecurityGroup.id,
        }, { parent, provider });
    }

    // Create the cluster encryption provider for using envelope encryption on
    // Kubernetes secrets.
    let encryptionProvider: pulumi.Output<aws.types.output.eks.ClusterEncryptionConfigProvider> | undefined;
    let encryptionConfig: pulumi.Output<aws.types.output.eks.ClusterEncryptionConfig> | undefined;
    if (args.encryptionConfigKeyArn) {
        encryptionProvider = pulumi.output(args.encryptionConfigKeyArn).apply(
            keyArn => <aws.types.output.eks.ClusterEncryptionConfigProvider>({keyArn}),
        );
        encryptionConfig = encryptionProvider.apply(ep => (<aws.types.output.eks.ClusterEncryptionConfig>{
            provider: ep,
            resources: ["secrets"],     // Only valid values are: "secrets"
        }));
    }

    // Create the EKS cluster
    const eksCluster = new aws.eks.Cluster(`${name}-eksCluster`, {
        name: args.name,
        roleArn: eksRole.apply(r => r.arn),
        vpcConfig: {
            securityGroupIds: [eksClusterSecurityGroup.id],
            subnetIds: clusterSubnetIds,
            endpointPrivateAccess: args.endpointPrivateAccess,
            endpointPublicAccess: args.endpointPublicAccess,
            publicAccessCidrs: args.publicAccessCidrs,
        },
        version: args.version,
        enabledClusterLogTypes: args.enabledClusterLogTypes,
        tags: pulumi.all([
            args.tags,
            args.clusterTags,
        ]).apply(([tags, clusterTags]) => (<aws.Tags>{
            "Name": `${name}-eksCluster`,
            ...clusterTags,
            ...tags,
        })),
        encryptionConfig,
    }, {
        parent,
        provider: args.creationRoleProvider ? args.creationRoleProvider.provider : provider,
    });

    // Instead of using the kubeconfig directly, we also add a wait of up to 5 minutes or until we
    // can reach the API server for the Output that provides access to the kubeconfig string so that
    // there is time for the cluster API server to become completely available.  Ideally we
    // would rely on the EKS API only returning once this was available, but we have seen frequent
    // cases where it is not yet available immediately after provisioning - possibly due to DNS
    // propagation delay or other non-deterministic factors.
    const endpoint = eksCluster.endpoint.apply(async (clusterEndpoint) => {
        if (!pulumi.runtime.isDryRun()) {
            // For up to 300 seconds, try to contact the API cluster healthz
            // endpoint, and verify that it is reachable.
            const healthz = `${clusterEndpoint}/healthz`;
            const agent = createHttpAgent(args.proxy);
            for (let i = 0; i < 60; i++) {
                try {
                    await new Promise((resolve, reject) => {
                        const options = {
                            ...url.parse(healthz),
                            rejectUnauthorized: false, // EKS API server uses self-signed cert
                            agent: agent,
                        };
                        const req = https
                            .request(options, res => {
                                res.statusCode === 200 ? resolve() : reject(); // Verify healthz returns 200
                            });
                        req.on("error", reject);
                        req.end();
                    });
                    break;
                } catch (e) {
                    pulumi.log.info(`Waiting for cluster endpoint (${i + 1})`, eksCluster, undefined, true);
                }
                await new Promise(resolve => setTimeout(resolve, 5 * 1000));
            }
        }
        return clusterEndpoint;
    });

    // Compute the required kubeconfig. Note that we do not export this value: we want the exported config to
    // depend on the autoscaling group we'll create later so that nothing attempts to use the EKS cluster before
    // its worker nodes have come up.
    const kubeconfig = pulumi.all([eksCluster.name, endpoint, eksCluster.certificateAuthority])
        .apply(([clusterName, clusterEndpoint, clusterCertificateAuthority]) => {
            let config = {};

            if (args.creationRoleProvider) {
                config = args.creationRoleProvider.role.arn.apply(arn => {
                    const opts: KubeconfigOptions = {roleArn: arn};
                    return generateKubeconfig(clusterName, clusterEndpoint, clusterCertificateAuthority.data, opts);
                });
            } else if (args.providerCredentialOpts) {
                config = generateKubeconfig(clusterName, clusterEndpoint, clusterCertificateAuthority.data, args.providerCredentialOpts);
            } else {
                config = generateKubeconfig(clusterName, clusterEndpoint, clusterCertificateAuthority.data);
            }

            return config;
        });

    const k8sProvider = new k8s.Provider(`${name}-eks-k8s`, {
        kubeconfig: kubeconfig.apply(JSON.stringify),
    }, { parent });

    // Add any requested StorageClasses.
    const storageClasses = args.storageClasses || {};
    const userStorageClasses = {} as UserStorageClasses;
    if (typeof storageClasses === "string") {
        const storageClass = { type: storageClasses, default: true };
        userStorageClasses[storageClasses] = pulumi.output(
            createStorageClass(`${name.toLowerCase()}-${storageClasses}`, storageClass, { parent, provider: k8sProvider }));
    } else {
        for (const key of Object.keys(storageClasses)) {
            userStorageClasses[key] = pulumi.output(createStorageClass(`${name.toLowerCase()}-${key}`, storageClasses[key], { parent, provider: k8sProvider }));
        }
    }

    const skipDefaultNodeGroup = args.skipDefaultNodeGroup || args.fargate;

    // Create the VPC CNI management resource.
    const vpcCni = new VpcCni(`${name}-vpc-cni`, kubeconfig, args.vpcCniOptions, { parent });

    let instanceRoleMappings: pulumi.Output<RoleMapping[]>;
    let instanceRoles: pulumi.Output<aws.iam.Role[]>;
    // Create role mappings of the instance roles specified for aws-auth.
    if (args.instanceRoles) {
        instanceRoleMappings = pulumi.output(args.instanceRoles).apply(roles =>
            roles.map(role => createInstanceRoleMapping(role.arn)),
        );
        instanceRoles = pulumi.output(args.instanceRoles);
    } else if (args.instanceRole) {
        // Create an instance profile if using a default node group
        if (!skipDefaultNodeGroup) {
            nodeGroupOptions.instanceProfile = createOrGetInstanceProfile(name, parent, args.instanceRole, args.instanceProfileName);
        }
        instanceRoleMappings = pulumi.output(args.instanceRole).apply(instanceRole =>
            [createInstanceRoleMapping(instanceRole.arn)],
        );
        instanceRoles = pulumi.output([args.instanceRole]);
    } else {
        const instanceRole = (new ServiceRole(`${name}-instanceRole`, {
            service: "ec2.amazonaws.com",
            managedPolicyArns: [
                "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
                "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
                "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
            ],
        }, { parent, provider })).role;

        instanceRoles = pulumi.output([instanceRole]);

        // Create a new policy for the role, if specified.
        if (args.customInstanceRolePolicy) {
            pulumi.log.warn("Option `customInstanceRolePolicy` has been deprecated. Please use `instanceRole` or `instanceRoles`. The role provided to either option should already include all required policies.", eksCluster);
            const customRolePolicy = new aws.iam.RolePolicy(`${name}-EKSWorkerCustomPolicy`, {
                role: instanceRole,
                policy: args.customInstanceRolePolicy,
            }, {parent, provider});
        }

        // Create an instance profile if using a default node group
        if (!skipDefaultNodeGroup) {
            nodeGroupOptions.instanceProfile = createOrGetInstanceProfile(name, parent, instanceRole, args.instanceProfileName);
        }
        instanceRoleMappings = pulumi.output(instanceRole).apply(role =>
            [createInstanceRoleMapping(role.arn)],
        );
    }

    const roleMappings = pulumi.all([pulumi.output(args.roleMappings || []), instanceRoleMappings])
        .apply(([mappings, instanceMappings]) => {
            let mappingYaml = "";
            try {
                mappingYaml = jsyaml.safeDump([...mappings, ...instanceMappings].map(m => ({
                    rolearn: m.roleArn,
                    username: m.username,
                    groups: m.groups,
                })));
            } catch (e) {
                throw new Error(`The IAM role mappings provided could not be properly serialized to YAML for the aws-auth ConfigMap`);
            }
            return mappingYaml;
        });
    const nodeAccessData: any = {
        mapRoles: roleMappings,
    };
    if (args.userMappings) {
        nodeAccessData.mapUsers = pulumi.output(args.userMappings).apply(mappings => {
            let mappingYaml = "";
            try {
                mappingYaml = jsyaml.safeDump(mappings.map(m => ({
                    userarn: m.userArn,
                    username: m.username,
                    groups: m.groups,
                })));
            } catch (e) {
                throw new Error(`The IAM user mappings provided could not be properly serialized to YAML for the aws-auth ConfigMap`);
            }
            return mappingYaml;
        });
    }
    const eksNodeAccess = new k8s.core.v1.ConfigMap(`${name}-nodeAccess`, {
        apiVersion: "v1",
        metadata: {
            name: `aws-auth`,
            namespace: "kube-system",
        },
        data: nodeAccessData,
    }, { parent, provider: k8sProvider });

    let fargateProfile: aws.eks.FargateProfile | undefined;
    if (args.fargate) {
        const fargate = args.fargate !== true ? args.fargate : {};
        const podExecutionRoleArn = fargate.podExecutionRoleArn || (new ServiceRole(`${name}-podExecutionRole`, {
            service: "eks-fargate-pods.amazonaws.com",
            managedPolicyArns: [
                "arn:aws:iam::aws:policy/AmazonEKSFargatePodExecutionRolePolicy",
            ],
        }, { parent, provider })).role.apply(r => r.arn);
        const selectors = fargate.selectors || [
            // For `fargate: true`, default to including the `default` namespaces and
            // `kube-system` namespaces so that all pods by default run in Fargate.
            { namespace: "default" },
            { namespace: "kube-system" },
        ];
        fargateProfile = new aws.eks.FargateProfile(`${name}-fargateProfile`, {
            clusterName: eksCluster.name,
            podExecutionRoleArn: podExecutionRoleArn,
            selectors: selectors,
            subnetIds: pulumi.output(clusterSubnetIds).apply(subnets => computeWorkerSubnets(parent, subnets)),
        }, { parent, dependsOn: [eksNodeAccess], provider});

        // Once the FargateProfile has been created, try to patch CoreDNS if needed.  See
        // https://docs.aws.amazon.com/eks/latest/userguide/fargate-getting-started.html#fargate-gs-coredns.
        pulumi.all([fargateProfile.id, selectors, kubeconfig]).apply(([_, sels, kconfig]) => {
            // Only patch CoreDNS if there is a selector in the FargateProfile which causes
            // `kube-system` pods to launch in Fargate.
            if (sels.findIndex(s => s.namespace === "kube-system") !== -1) {
                // Only do the imperative patching during deployments, not previews.
                if (!pulumi.runtime.isDryRun()) {
                    // Write the kubeconfig to a tmp file and use it to patch the `coredns`
                    // deployment that AWS deployed already as part of cluster creation.
                    const tmpKubeconfig = tmp.fileSync();
                    fs.writeFileSync(tmpKubeconfig.fd, JSON.stringify(kconfig));
                    const patch = [{
                        op: "replace",
                        path: "/spec/template/metadata/annotations/eks.amazonaws.com~1compute-type",
                        value: "fargate",
                    }];
                    const cmd = `kubectl patch deployment coredns -n kube-system --type json -p='${JSON.stringify(patch)}'`;
                    childProcess.execSync(cmd, {
                        env: { ...process.env, "KUBECONFIG": tmpKubeconfig.name },
                    });
                }
            }
        });
    }

    // Setup OIDC provider to leverage IAM roles for k8s service accounts.
    let oidcProvider: aws.iam.OpenIdConnectProvider | undefined;
    if (args.createOidcProvider) {
        // Retrieve the OIDC provider URL's intermediate root CA fingerprint.
        const awsRegionName = pulumi.output(aws.getRegion({}, {parent, async: true })).name;
        const eksOidcProviderUrl = pulumi.interpolate `https://oidc.eks.${awsRegionName}.amazonaws.com`;
        const agent = createHttpAgent(args.proxy);
        const fingerprint = getIssuerCAThumbprint(eksOidcProviderUrl, agent);

        // Create the OIDC provider for the cluster.
        oidcProvider = new aws.iam.OpenIdConnectProvider(`${name}-oidcProvider`, {
            clientIdLists: ["sts.amazonaws.com"],
            url: eksCluster.identities[0].oidcs[0].issuer,
            thumbprintLists: [fingerprint],
        }, { parent, provider });
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
        kubeconfig: kubeconfig,
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
    };
}

/**
 * Enable access to the EKS cluster for worker nodes, by creating an
 * instance role mapping to the k8s username and groups of aws-auth.
 */
function createInstanceRoleMapping(arn: pulumi.Input<string>): RoleMapping {
    return {
        roleArn: arn,
        username: "system:node:{{EC2PrivateDNSName}}",
        groups: ["system:bootstrappers", "system:nodes"],
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
        proxy = process.env.HTTPS_PROXY || process.env.https_proxy ||
            process.env.HTTP_PROXY || process.env.http_proxy;
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
     * Also consider setting `nodeAssociatePublicIpAddress: true` for
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
     */
    roleMappings?: pulumi.Input<pulumi.Input<RoleMapping>[]>;

    /**
     * Optional mappings from AWS IAM users to Kubernetes users and groups.
     */
    userMappings?: pulumi.Input<pulumi.Input<UserMapping>[]>;

    /**
     * The configuration of the Amazon VPC CNI plugin for this instance. Defaults are described in the documentation
     * for the VpcCniOptions type.
     */
    vpcCniOptions?: VpcCniOptions;

    /**
     * The instance type to use for the cluster's nodes. Defaults to "t2.medium".
     */
    instanceType?: pulumi.Input<aws.ec2.InstanceType>;

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
     */
    clusterSecurityGroup?: aws.ec2.SecurityGroup;

    /**
     * The tags to apply to the cluster security group.
     */
    clusterSecurityGroupTags?: InputTags;

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
     * Defaults to `true`.
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
    fargate?: boolean | FargateProfile;

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
     * - https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/aws/#Provider
     * - https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/
     * - https://www.pulumi.com/docs/intro/cloud-providers/aws/#configuration
     * - https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
     */
    providerCredentialOpts?: KubeconfigOptions;

    /**
     * KMS Key ARN to use with the encryption configuration for the cluster.
     *
     * Only available on Kubernetes 1.13+ clusters created after March 6, 2020.
     * See for more details:
     * - https://aws.amazon.com/about-aws/whats-new/2020/03/amazon-eks-adds-envelope-encryption-for-secrets-with-aws-kms/
     */
    encryptionConfigKeyArn?: pulumi.Input<string>;
}

/**
 * FargateProfile defines how Kubernetes pods are executed in Fargate. See
 * aws.eks.FargateProfileArgs for reference.
 */
export interface FargateProfile {
    /**
     * Specify a custom role to use for executing pods in Fargate. Defaults to creating a new role
     * with the `arn:aws:iam::aws:policy/AmazonEKSFargatePodExecutionRolePolicy` policy attached.
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
export interface ClusterNodeGroupOptions extends NodeGroupBaseOptions { }

/**
 * Cluster is a component that wraps the AWS and Kubernetes resources necessary to run an EKS cluster, its worker
 * nodes, its optional StorageClasses, and an optional deployment of the Kubernetes Dashboard.
 */
export class Cluster extends pulumi.ComponentResource {
    /**
     * A kubeconfig that can be used to connect to the EKS cluster. This must be serialized as a string before passing
     * to the Kubernetes provider.
     */
    public readonly kubeconfig: pulumi.Output<any>;

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
    public readonly clusterSecurityGroup: aws.ec2.SecurityGroup;

    /**
     * The service roles used by the EKS cluster.
     */
    public readonly instanceRoles: pulumi.Output<aws.iam.Role[]>;

    /**
     * The security group for the cluster's nodes.
     */
    public readonly nodeSecurityGroup: aws.ec2.SecurityGroup;

    /**
     * The ingress rule that gives node group access to cluster API server
     */
    public readonly eksClusterIngressRule: aws.ec2.SecurityGroupRule;

    /**
     * The default Node Group configuration, or undefined if `skipDefaultNodeGroup` was specified.
     */
    public readonly defaultNodeGroup: NodeGroupData | undefined;

    /**
     * The EKS cluster.
     */
    public readonly eksCluster: aws.eks.Cluster;

    /**
     * The EKS cluster and it's dependencies.
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
        super("eks:index:Cluster", name, args, opts);

        args = args || {};

        // Check that AWS provider credential options are set for the kubeconfig
        // to use with the given auth method.
        if (opts?.provider && !args.providerCredentialOpts) {
            throw new Error("providerCredentialOpts and an AWS provider instance must be set together");
        }
        if (process.env.AWS_PROFILE && !args.providerCredentialOpts) {
            throw new Error("providerCredentialOpts and AWS_PROFILE must be set together");
        }
        const awsConfig = new pulumi.Config("aws");
        const awsProfile = awsConfig.get("profile");
        if (awsProfile && !args.providerCredentialOpts) {
            throw new Error("providerCredentialOpts and AWS config setting aws:profile must be set together");
        }

        // Create the core resources required by the cluster.
        const core = createCore(name, args, this, opts?.provider);
        this.core = core;
        this.clusterSecurityGroup = core.clusterSecurityGroup;
        this.eksCluster = core.cluster;
        this.instanceRoles = core.instanceRoles;

        // Create default node group security group and cluster ingress rule.
        [this.nodeSecurityGroup, this.eksClusterIngressRule] = createNodeGroupSecurityGroup(name, {
            vpcId: core.vpcId,
            clusterSecurityGroup: core.clusterSecurityGroup,
            eksCluster: core.cluster,
            tags: pulumi.all([
                args.tags,
                args.nodeSecurityGroupTags,
            ]).apply(([tags, nodeSecurityGroupTags]) => (<aws.Tags>{
                ...nodeSecurityGroupTags,
                ...tags,
            })),
        }, this);
        core.nodeGroupOptions.nodeSecurityGroup = this.nodeSecurityGroup;
        core.nodeGroupOptions.clusterIngressRule = this.eksClusterIngressRule;

        const skipDefaultNodeGroup = args.skipDefaultNodeGroup || args.fargate;

        // Create the default worker node group and grant the workers access to the API server.
        const configDeps = [core.kubeconfig];
        if (!skipDefaultNodeGroup) {
            this.defaultNodeGroup = createNodeGroup(name, {
                cluster: core,
                ...core.nodeGroupOptions,
            }, this);
            configDeps.push(this.defaultNodeGroup.cfnStack.id);
        }

        // Export the cluster's kubeconfig with a dependency upon the cluster's autoscaling group. This will help
        // ensure that the cluster's consumers do not attempt to use the cluster until its workers are attached.
        this.kubeconfig = pulumi.all(configDeps).apply(([kubeconfig]) => kubeconfig);

        // Export a k8s provider with the above kubeconfig. Note that we do not export the provider we created earlier
        // in order to help ensure that worker nodes are available before the provider can be used.
        this.provider = new k8s.Provider(`${name}-provider`, {
            kubeconfig: this.kubeconfig.apply(JSON.stringify),
        }, { parent: this });

        // If we need to deploy the Kubernetes dashboard, do so now.
        if (args.deployDashboard) {
            pulumi.log.warn("Option `deployDashboard` has been deprecated. Please consider using the Helm chart, or writing the dashboard directly in Pulumi.", this.eksCluster);
            createDashboard(name, {}, this, this.provider);
        }

        this.registerOutputs({ kubeconfig: this.kubeconfig });
    }

    /**
     * Create a self-managed node group using CloudFormation and an ASG.
     *
     * See for more details:
     * https://docs.aws.amazon.com/eks/latest/userguide/worker.html
     */
    createNodeGroup(name: string, args: ClusterNodeGroupOptions): NodeGroup {
        const awsProvider = this.core.awsProvider ? {aws: this.core.awsProvider} : undefined;
        return new NodeGroup(name, {
            ...args,
            cluster: this.core,
            nodeSecurityGroup: this.core.nodeGroupOptions.nodeSecurityGroup,
            clusterIngressRule: this.core.nodeGroupOptions.clusterIngressRule,
        }, {
            parent: this,
            providers: {
                ...awsProvider,
                kubernetes: this.provider,
            },
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
        const kc = generateKubeconfig(
            this.eksCluster.name,
            this.eksCluster.endpoint,
            this.eksCluster.certificateAuthority.data,
            args,
        );
        return pulumi.output(kc).apply(JSON.stringify);
    }
}
