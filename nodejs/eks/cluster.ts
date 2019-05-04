// Copyright 2016-2018, Pulumi Corporation.
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
import * as jsyaml from "js-yaml";
import which = require("which");

import { VpcCni, VpcCniOptions } from "./cni";
import { createDashboard } from "./dashboard";
import { createNodeGroup, NodeGroup, NodeGroupBaseOptions, NodeGroupData } from "./nodegroup";
import { createNodeGroupSecurityGroup } from "./securitygroup";
import { ServiceRole } from "./servicerole";
import { createStorageClass, EBSVolumeType, StorageClass } from "./storageclass";

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
 * CoreData defines the core set of data associated with an EKS cluster, including the network in which is runs.
 */
export interface CoreData {
    cluster: aws.eks.Cluster;
    vpcId: pulumi.Output<string>;
    subnetIds: pulumi.Output<string[]>;
    clusterSecurityGroup: aws.ec2.SecurityGroup;
    provider: k8s.Provider;
    instanceProfile?: aws.iam.InstanceProfile;
    eksNodeAccess?: k8s.core.v1.ConfigMap;
    kubeconfig?: pulumi.Output<any>;
    vpcCni?: VpcCni;
    tags?: { [key: string]: string };
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

    // If no VPC was specified, use the default VPC.
    let vpcId: pulumi.Input<string> = args.vpcId!;
    let subnetIds: pulumi.Input<pulumi.Input<string>[]> = args.subnetIds!;
    if (args.vpcId === undefined) {
        const invokeOpts = { parent: parent };
        const vpc = aws.ec2.getVpc({ default: true }, invokeOpts);
        vpcId = vpc.then(v => v.id);
        subnetIds = vpc.then(v => aws.ec2.getSubnetIds({ vpcId: v.id }, invokeOpts)).then(subnets => subnets.ids);
    }

    // Create the EKS service role
    const eksRole = new ServiceRole(`${name}-eksRole`, {
        service: "eks.amazonaws.com",
        description: "Allows EKS to manage clusters on your behalf.",
        managedPolicyArns: [
            "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
            "arn:aws:iam::aws:policy/AmazonEKSServicePolicy",
        ],
    }, { parent: parent });

    // Create the EKS cluster security group
    const eksClusterSecurityGroup = new aws.ec2.SecurityGroup(`${name}-eksClusterSecurityGroup`, {
        vpcId: vpcId,
        revokeRulesOnDelete: true,
        tags: <aws.Tags>{
            "Name": `${name}`,
            ...args.tags,
            ...args.clusterSecurityGroupTags,
        },
    }, { parent: parent });

    const eksClusterInternetEgressRule = new aws.ec2.SecurityGroupRule(`${name}-eksClusterInternetEgressRule`, {
        description: "Allow internet access.",
        type: "egress",
        fromPort: 0,
        toPort: 0,
        protocol: "-1",  // all
        cidrBlocks: [ "0.0.0.0/0" ],
        securityGroupId: eksClusterSecurityGroup.id,
    }, { parent: parent });

    // Create the EKS cluster
    const eksCluster = new aws.eks.Cluster(`${name}-eksCluster`, {
        roleArn: eksRole.role.apply(r => r.arn),
        vpcConfig: { securityGroupIds: [ eksClusterSecurityGroup.id ], subnetIds: subnetIds },
        version: args.version,
        enabledClusterLogTypes: args.enabledClusterLogTypes,
    }, { parent: parent });

    // Compute the required kubeconfig. Note that we do not export this value: we want the exported config to
    // depend on the autoscaling group we'll create later so that nothing attempts to use the EKS cluster before
    // its worker nodes have come up.
    const kubeconfig = pulumi.all([eksCluster.name, eksCluster.endpoint, eksCluster.certificateAuthority])
        .apply(([clusterName, clusterEndpoint, clusterCertificateAuthority]) => {
            return {
                apiVersion: "v1",
                clusters: [{
                    cluster: {
                        server: clusterEndpoint,
                        "certificate-authority-data": clusterCertificateAuthority.data,
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
                            args: ["token", "-i", clusterName],
                        },
                    },
                }],
            };
        });

    const provider = new k8s.Provider(`${name}-eks-k8s`, {
        kubeconfig: kubeconfig.apply(JSON.stringify),
    }, { parent: parent });

    // Add any requested StorageClasses.
    const storageClasses = args.storageClasses || {};
    if (typeof storageClasses === "string") {
        const storageClass = { type: storageClasses, default: true };
        createStorageClass(`${name.toLowerCase()}-${storageClasses}`, storageClass, { parent: parent, provider: provider });
    } else {
        for (const key of Object.keys(storageClasses)) {
            createStorageClass(`${name.toLowerCase()}-${key}`, storageClasses[key], { parent: parent, provider: provider });
        }
    }

    // Create the VPC CNI management resource.
    const vpcCni = new VpcCni(`${name}-vpc-cni`, kubeconfig, args.vpcCniOptions, { parent: parent });

    let instanceRoleMappings: pulumi.Output<RoleMapping[]>;
    let instanceProfile: aws.iam.InstanceProfile | undefined;
    // Create role mappings of the instance roles specified for aws-auth.
    if (args.instanceRoles) {
        instanceRoleMappings = pulumi.output(args.instanceRoles).apply(instanceRoles =>
            instanceRoles.map(role => createInstanceRoleMapping(role.arn)),
        );
    } else if (args.instanceRole) {
        // Create an instance profile if using a default node group
        if (!args.skipDefaultNodeGroup) {
            instanceProfile = new aws.iam.InstanceProfile(`${name}-instanceProfile`, {
                role: args.instanceRole,
            }, { parent: parent });
        }

        instanceRoleMappings = pulumi.output(args.instanceRole).apply(instanceRole =>
            [createInstanceRoleMapping(instanceRole.arn)],
        );
    } else {
        const instanceRole = (new ServiceRole(`${name}-instanceRole`, {
            service: "ec2.amazonaws.com",
            managedPolicyArns: [
                "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
                "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
                "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
            ],
        }, { parent: parent })).role;

        // Create a new policy for the role, if specified.
        if (args.customInstanceRolePolicy) {
            const customRolePolicy = new aws.iam.RolePolicy(`${name}-EKSWorkerCustomPolicy`, {
                role: instanceRole,
                policy: args.customInstanceRolePolicy,
            });
        }

        // Create an instance profile if using a default node group
        if (!args.skipDefaultNodeGroup) {
            instanceProfile = new aws.iam.InstanceProfile(`${name}-instanceProfile`, {
                role: instanceRole,
            }, { parent: parent });
        }

        instanceRoleMappings = pulumi.output(instanceRole).apply(role =>
            [createInstanceRoleMapping(role.arn)],
        );
    }

    const roleMappings = pulumi.all([pulumi.output(args.roleMappings || []), instanceRoleMappings])
        .apply(([mappings, instanceMappings]) => {
            return jsyaml.safeDump([...mappings, ...instanceMappings].map(m => ({
                rolearn: m.roleArn,
                username: m.username,
                groups: m.groups,
            })));
        });
    const nodeAccessData: any = {
        mapRoles: roleMappings,
    };
    if (args.userMappings !== undefined) {
        nodeAccessData.mapUsers = pulumi.output(args.userMappings).apply(mappings => {
            return jsyaml.safeDump(mappings.map(m => ({
                userarn: m.userArn,
                username: m.username,
                groups: m.groups,
            })));
        });
    }
    const eksNodeAccess = new k8s.core.v1.ConfigMap(`${name}-nodeAccess`, {
        apiVersion: "v1",
        metadata: {
            name: `aws-auth`,
            namespace: "kube-system",
        },
        data: nodeAccessData,
    }, { parent: parent, provider: provider });

    return {
        vpcId: pulumi.output(vpcId),
        subnetIds: pulumi.output(subnetIds),
        clusterSecurityGroup: eksClusterSecurityGroup,
        cluster: eksCluster,
        kubeconfig: kubeconfig,
        provider: provider,
        vpcCni: vpcCni,
        instanceProfile: instanceProfile,
        eksNodeAccess: eksNodeAccess,
        tags: args.tags,
    };
}

/**
 * Enable access to the EKS cluster for worker nodes, by creating an
 * instance role mapping to the k8s username and groups of aws-auth.
 */
function createInstanceRoleMapping(arn: pulumi.Input<string>): RoleMapping {
    const instanceRoleMapping: RoleMapping = {
        roleArn: arn,
        username: "system:node:{{EC2PrivateDNSName}}",
        groups: ["system:bootstrappers", "system:nodes"],
    };

    return instanceRoleMapping;
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
     * The subnets to attach to the EKS cluster. If either vpcId or subnetIds is unset, the cluster will use the
     * default VPC's subnets. If the list of subnets includes both public and private subnets, the Kubernetes API
     * server and the worker nodes will only be attached to the private subnets. See
     * https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html for more details.
     */
    subnetIds?: pulumi.Input<pulumi.Input<string>[]>;

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
     * This enables the advanced case of registering *many* IAM instance roles
     * with the cluster for per node group IAM, instead of the simpler, shared case of `instanceRole`.
     *
     * Note: options `instanceRole` and `instanceRoles` are mutually exclusive.
     */
    instanceRoles?: pulumi.Input<pulumi.Input<aws.iam.Role>[]>;

    /**
     * @deprecated: This option has been replaced with the use of
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
     * The tags to apply to the cluster security group.
     */
    clusterSecurityGroupTags?: { [key: string]: string };

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
     * a single StorageClass will be created for that volume type and made the cluster's default StorageClass.
     *
     * Defaults to "gp2".
     */
    storageClasses?: { [name: string]: StorageClass } | EBSVolumeType;

    /**
     * If this toggle is set to true, the EKS cluster will be created without node group attached.
     */
    skipDefaultNodeGroup?: boolean;

    /**
     * Whether or not to deploy the Kubernetes dashboard to the cluster. If the dashboard is deployed, it can be
     * accessed as follows:
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
    tags?: { [key: string]: string };

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
}

/**
 * ClusterNodeGroupOptions describes the configuration options accepted by a cluster
 * to create its own node groups. It's a subset of NodeGroupOptions.
 */
export interface ClusterNodeGroupOptions extends NodeGroupBaseOptions {}

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
     * The service role used by the EKS cluster.
     */
    public readonly instanceRole: pulumi.Output<aws.iam.Role>;

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
        args.storageClasses = args.storageClasses || "gp2";
        const core = createCore(name, args, this);
        this.core = core;
        this.clusterSecurityGroup = core.clusterSecurityGroup;
        this.eksCluster = core.cluster;

        // create default security group for nodegroup
        this.nodeSecurityGroup = createNodeGroupSecurityGroup(name, {
            vpcId: core.vpcId,
            clusterSecurityGroup: core.clusterSecurityGroup,
            eksCluster: core.cluster,
        }, this);

        this.eksClusterIngressRule = new aws.ec2.SecurityGroupRule(`${name}-eksClusterIngressRule`, {
            description: "Allow pods to communicate with the cluster API Server",
            type: "ingress",
            fromPort: 443,
            toPort: 443,
            protocol: "tcp",
            securityGroupId: core.clusterSecurityGroup.id,
            sourceSecurityGroupId: this.nodeSecurityGroup.id,
        }, { parent: this });

        const configDeps = [core.kubeconfig];
        if (!args.skipDefaultNodeGroup) {
            // Create the worker node group and grant the workers access to the API server.
            this.defaultNodeGroup = createNodeGroup(name, {
                cluster: core,
                nodeSubnetIds: args.nodeSubnetIds,
                nodeAssociatePublicIpAddress: args.nodeAssociatePublicIpAddress,
                nodeSecurityGroup: this.nodeSecurityGroup,
                clusterIngressRule: this.eksClusterIngressRule,
                instanceType: args.instanceType,
                nodePublicKey: args.nodePublicKey,
                nodeRootVolumeSize: args.nodeRootVolumeSize,
                nodeUserData: args.nodeUserData,
                minSize: args.minSize,
                maxSize: args.maxSize,
                desiredCapacity: args.desiredCapacity,
                amiId: args.nodeAmiId,
                version: args.version,
                instanceProfile: core.instanceProfile,
            }, this, core.provider);
            this.nodeSecurityGroup = this.defaultNodeGroup.nodeSecurityGroup;
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
            createDashboard(name, {}, this, this.provider);
        }

        this.registerOutputs({ kubeconfig: this.kubeconfig });
    }

    createNodeGroup(name: string, args: ClusterNodeGroupOptions): NodeGroup {
        return new NodeGroup(name, {
            ...args,
            cluster: this.core,
            nodeSecurityGroup: this.nodeSecurityGroup,
            clusterIngressRule: this.eksClusterIngressRule,
        }, {
            parent: this,
            providers: { kubernetes: this.provider },
        });
    }
}
