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
import * as fs from "fs";
import * as https from "https";
import * as jsyaml from "js-yaml";
import fetch from "node-fetch";
import * as tmp from "tmp";
import * as which from "which";

import * as childProcess from "child_process";
import { VpcCni, VpcCniOptions } from "./cni";
import { createDashboard } from "./dashboard";
import { createNodeGroup, NodeGroup, NodeGroupBaseOptions, NodeGroupData } from "./nodegroup";
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
 * CoreData defines the core set of data associated with an EKS cluster, including the network in which it runs.
 */
export interface CoreData {
    cluster: aws.eks.Cluster;
    vpcId: pulumi.Output<string>;
    subnetIds: pulumi.Output<string[]>;
    clusterSecurityGroup: aws.ec2.SecurityGroup;
    provider: k8s.Provider;
    instanceRoles: pulumi.Output<aws.iam.Role[]>;
    nodeGroupOptions: ClusterNodeGroupOptions;
    publicSubnetIds?: pulumi.Output<string[]>;
    privateSubnetIds?: pulumi.Output<string[]>;
    storageClasses?: UserStorageClasses;
    kubeconfig?: pulumi.Output<any>;
    vpcCni?: VpcCni;
    tags?: InputTags;
    nodeSecurityGroupTags?: InputTags;
}

function createOrGetInstanceProfile(name: string, parent: pulumi.ComponentResource, instanceRoleName?: pulumi.Input<aws.iam.Role>, instanceProfileName?: pulumi.Input<string>): aws.iam.InstanceProfile {
  let instanceProfile: aws.iam.InstanceProfile;
  if (instanceProfileName) {
    instanceProfile = aws.iam.InstanceProfile.get(`${name}-instanceProfile`,
      instanceProfileName, undefined, {parent: parent});
  } else {
    instanceProfile = new aws.iam.InstanceProfile(`${name}-instanceProfile`, {
        role: instanceRoleName,
    }, { parent: parent });
  }

  return instanceProfile;
}

function generateKubeconfig(clusterName: string, clusterEndpoint: string, certData: string, roleArn?: string) {
    let args = ["token", "-i", clusterName];

    if (roleArn) {
        args = [...args, "-r", roleArn];
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
                    command: "aws-iam-authenticator",
                    args: args,
                },
            },
        }],
    };
}

export function getRoleProvider(name: string, region?: aws.Region, profile?: string): CreationRoleProvider {
    const iamRole = new aws.iam.Role(`${name}-eksClusterCreatorRole`, {
        assumeRolePolicy: aws.getCallerIdentity().then(id => `{
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
    });

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
      { parent: iamRole },
    );

    const provider = new aws.Provider(`${name}-eksClusterCreatorEntity`, {
        region: region,
        profile: profile,
        assumeRole: {
            roleArn: iamRole.arn.apply(async(arn) => {
                // wait 30 seconds to assume the IAM Role https://github.com/pulumi/pulumi-aws/issues/673
                if (!pulumi.runtime.isDryRun()) {
                    await new Promise(resolve => setTimeout(resolve, 30 * 1000));
                }
                return arn;
            }),
        },
    }, { parent: iamRole });

    return {
        role: iamRole,
        provider: provider,
    };
}

export function createCore(name: string, args: ClusterOptions, parent: pulumi.ComponentResource): CoreData {
    // Check to ensure that aws-iam-authenticator is installed, as we'll need it in order to deploy k8s resources
    // to the EKS cluster.
    try {
        which.sync("aws-iam-authenticator");
    } catch (err) {
        throw new Error("Could not find aws-iam-authenticator for EKS. See https://github.com/pulumi/eks#installing for installation instructions.");
    }

    if (args.instanceRole && args.instanceRoles) {
        throw new Error("instanceRole and instanceRoles are mutually exclusive, and cannot both be set.");
    }

    if (args.subnetIds && (args.publicSubnetIds || args.privateSubnetIds)) {
        throw new Error("subnetIds, and the use of publicSubnetIds and/or privateSubnetIds are mutually exclusive. Choose a single approach.");
    }

    if (args.nodeGroupOptions && (
        args.nodeSubnetIds ||
        args.nodeAssociatePublicIpAddress ||
        args.instanceType ||
        args.instanceProfileName ||
        args.nodePublicKey ||
        args.nodeRootVolumeSize ||
        args.nodeUserData ||
        args.minSize ||
        args.maxSize ||
        args.desiredCapacity ||
        args.nodeAmiId)) {
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
      }, { parent: parent })).role;
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
        }, { parent: parent });

        const eksClusterInternetEgressRule = new aws.ec2.SecurityGroupRule(`${name}-eksClusterInternetEgressRule`, {
            description: "Allow internet access.",
            type: "egress",
            fromPort: 0,
            toPort: 0,
            protocol: "-1",  // all
            cidrBlocks: ["0.0.0.0/0"],
            securityGroupId: eksClusterSecurityGroup.id,
        }, { parent: parent });
    }

    // Create the EKS cluster
    const eksCluster = new aws.eks.Cluster(`${name}-eksCluster`, {
        roleArn: eksRole.apply(r => r.arn),
        vpcConfig: {
            securityGroupIds: [eksClusterSecurityGroup.id],
            subnetIds: clusterSubnetIds,
            endpointPrivateAccess: args.endpointPrivateAccess,
            endpointPublicAccess: args.endpointPublicAccess,
        },
        version: args.version,
        enabledClusterLogTypes: args.enabledClusterLogTypes,
    }, {
        parent: parent,
        provider: args.creationRoleProvider ? args.creationRoleProvider.provider : undefined,
    });

    // Instead of using the kubeconfig directly, we also add a wait of up to 5 minutes or until we
    // can reach the API server for the Output that provides access to the kubeconfig string so that
    // there is time for the cluster API server to become completely available.  Ideally we
    // would rely on the EKS API only returning once this was available, but we have seen frequent
    // cases where it is not yet available immediately after provisioning - possibly due to DNS
    // propagation delay or other non-deterministic factors.
    const endpoint = eksCluster.endpoint.apply(async (clusterEndpoint) => {
        if (!pulumi.runtime.isDryRun()) {
            // For up to 300 seconds, try to contact the API cluster endpoint and verify that it is reachable.
            const agent = new https.Agent({ rejectUnauthorized: false });
            for (let i = 0; i < 60; i++) {
                try {
                    const resp = await fetch(clusterEndpoint, { agent });
                    await resp.json();
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
              config = args.creationRoleProvider.role.arn.apply(arn => generateKubeconfig(clusterName, clusterEndpoint, clusterCertificateAuthority.data, arn));
            } else {
              config = generateKubeconfig(clusterName, clusterEndpoint, clusterCertificateAuthority.data);
            }

            return config;
        });

    const provider = new k8s.Provider(`${name}-eks-k8s`, {
        kubeconfig: kubeconfig.apply(JSON.stringify),
    }, { parent: parent });

    // Add any requested StorageClasses.
    const storageClasses = args.storageClasses || {};
    const userStorageClasses: UserStorageClasses = pulumi.output({});
    if (typeof storageClasses === "string") {
        const storageClass = { type: storageClasses, default: true };
        userStorageClasses[storageClasses] = pulumi.output(
            createStorageClass(`${name.toLowerCase()}-${storageClasses}`, storageClass, { parent: parent, provider: provider }));
    } else {
        for (const key of Object.keys(storageClasses)) {
            userStorageClasses[key] = pulumi.output(createStorageClass(`${name.toLowerCase()}-${key}`, storageClasses[key], { parent: parent, provider: provider }));
        }
    }

    // Create the VPC CNI management resource.
    const vpcCni = new VpcCni(`${name}-vpc-cni`, kubeconfig, args.vpcCniOptions, { parent: parent });

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
        if (!args.skipDefaultNodeGroup) {
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
        }, { parent: parent })).role;

        instanceRoles = pulumi.output([instanceRole]);

        // Create a new policy for the role, if specified.
        if (args.customInstanceRolePolicy) {
            pulumi.log.warn("Option `customInstanceRolePolicy` has been deprecated. Please use `instanceRole` or `instanceRoles`. The role provided to either option should already include all required policies.", eksCluster);
            const customRolePolicy = new aws.iam.RolePolicy(`${name}-EKSWorkerCustomPolicy`, {
                role: instanceRole,
                policy: args.customInstanceRolePolicy,
            });
        }

        // Create an instance profile if using a default node group
        if (!args.skipDefaultNodeGroup) {
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
    /*
    * We must kubectl apply the aws-auth configmap since the creation of an
    * AWS managed node group automatically triggers AWS to create the aws-auth
    * configmap for us.
    *
    * For managed nodegroups:
    *   To properly create aws-auth, we need to kubectl apply the configmap
    *   instead of kubectl create it, if not it will fail with an existing
    *   resource error message.
    *
    * For self-managed nodegroups:
    *   We continue to always create the aws-auth configmap.
    *
    * As a work around, we'll kubectl apply to satisfy both node group cases.
    *
    * TODO(metral)
    * When https://git.io/JeXom is resolved, we can move away from kubectl
    * shell out.
    */
    pulumi.all([
        kubeconfig,
        nodeAccessData,
    ]).apply(([kc, accessData]) => {
        const tmpKubeconfig = tmp.fileSync();
        const tmpJson = tmp.fileSync();

        // Dump the kubeconfig to a file.
        fs.writeFileSync(tmpKubeconfig.fd, JSON.stringify(kc));

        // Compute the required aws-auth JSON manifest and dump it to a file.
        fs.writeFileSync(tmpJson.fd, `{
"apiVersion": "v1",
"kind": "ConfigMap",
"metadata": {
  "name": "aws-auth",
  "namespace": "kube-system",
  "labels": {
    "app.kubernetes.io/managed-by": "pulumi"
  }
},
"data": ${JSON.stringify(accessData)}
}`);

        // Call kubectl to apply the aws-auth manifest.
        childProcess.execSync(`kubectl apply -f ${tmpJson.name}`, {
            stdio: "ignore",
            env: { ...process.env, "KUBECONFIG": tmpKubeconfig.name },
        });
    });

    return {
        vpcId: pulumi.output(vpcId),
        subnetIds: args.subnetIds ? pulumi.output(args.subnetIds): pulumi.output(clusterSubnetIds),
        publicSubnetIds: args.publicSubnetIds ? pulumi.output(args.publicSubnetIds): undefined,
        privateSubnetIds: args.privateSubnetIds ? pulumi.output(args.privateSubnetIds): undefined,
        clusterSecurityGroup: eksClusterSecurityGroup,
        cluster: eksCluster,
        nodeGroupOptions: nodeGroupOptions,
        kubeconfig: kubeconfig,
        provider: provider,
        vpcCni: vpcCni,
        instanceRoles: instanceRoles,
        tags: args.tags,
        nodeSecurityGroupTags: args.nodeSecurityGroupTags,
        storageClasses: userStorageClasses,
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

    /*
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
     * @deprecated This option has been replaced with the use of
     * `instanceRole` or `instanceRoles`. The role provided to either option
     * should already include all required policies.
     *
     * Attach a custom role policy to worker node instance role
     */
    customInstanceRolePolicy?: pulumi.Input<string>;

    /**
     * The AMI to use for worker nodes. Defaults to the value of Amazon EKS - Optimized AMI if no value is provided.
	 * More information about the AWS eks optimized ami is available at https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html.
	 * Use the information provided by AWS if you want to build your own AMI.
     */
    nodeAmiId?: pulumi.Input<string>;

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
     */
    skipDefaultNodeGroup?: boolean;

    /**
     * @deprecated This option has been deprecated due to a lack of
     * support for it on EKS, and the general community recommendation to avoid
     * using it for security concerns. If you'd like alternatives to deploy the
     * dashboard, consider writing it in Pulumi, or using the Helm chart.
     *
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
    endpointPublicAccess?: boolean;

    /**
     * Indicates whether or not the Amazon EKS private API server endpoint is enabled.  The default is `false`.
     */
    endpointPrivateAccess?: boolean;
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

        // Create the core resources required by the cluster.
        const core = createCore(name, args, this);
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

        // Create the default worker node group and grant the workers access to the API server.
        const configDeps = [core.kubeconfig];
        if (!args.skipDefaultNodeGroup) {
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
        if (args.deployDashboard === undefined || args.deployDashboard) {
            pulumi.log.warn("Option `deployDashboard` has been deprecated. Please consider using the Helm chart, or writing the dashboard directly in Pulumi.", this.eksCluster);
            createDashboard(name, {}, this, this.provider);
        }

        this.registerOutputs({ kubeconfig: this.kubeconfig });
    }

    // Create a self-managed node group.
    createNodeGroup(name: string, args: ClusterNodeGroupOptions): NodeGroup {
        return new NodeGroup(name, {
            ...args,
            cluster: this.core,
            nodeSecurityGroup: this.core.nodeGroupOptions.nodeSecurityGroup,
            clusterIngressRule: this.core.nodeGroupOptions.clusterIngressRule,
        }, {
            parent: this,
            providers: { kubernetes: this.provider },
        });
    }
}
