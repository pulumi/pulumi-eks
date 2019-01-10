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
 * CoreOptions describes the configuration options accepted by a Core component.
 */
export interface CoreOptions {
    /**
     * The VPC in which to create the cluster. If unset, the cluster will be created in the default VPC.
     */
    vpcId?: pulumi.Input<string>;

    /**
     * The subnets to attach to the EKS cluster. If either vpcId or subnetIds is unset, the cluster will use the
     * default VPC's subnets.
     */
    subnetIds?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * Optional mappings from AWS IAM roles to Kubernetes users and groups.
     */
    roleMappings?: pulumi.Input<pulumi.Input<RoleMapping>[]>;

     /**
     * Optional mappings from AWS IAM users to Kubernetes users and groups.
     */
    userMappings?: pulumi.Input<pulumi.Input<UserMapping>[]>;

    /**
    * The instance role to use for all nodes in this workder pool.
    */
    instanceRole?: pulumi.Input<aws.iam.Role>;

    /**
     * An optional set of StorageClasses to enable for the cluster. If this is a single volume type rather than a map,
     * a single StorageClass will be created for that volume type and made the cluster's default StorageClass.
     */
    storageClasses?: { [name: string]: StorageClass } | EBSVolumeType;

    /**
     * The configiuration of the Amazon VPC CNI plugin for this instance. Defaults are described in the documentation
     * for the VpcCniOptions type.
     */
    vpcCniOptions?: VpcCniOptions;
}

/**
 * Core is a component that wraps the core AWS and Kubernetes resources necessary to run an EKS cluster and its optional
 * StorageClasses.
 *
 * Note that the EKS cluster created by this component will not have any worker nodes, so deploying many important
 * Kubernetes resources will fail. Worker nodes can be created with the WorkerPool component.
 */
export class Core extends pulumi.ComponentResource {
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
     * The VPC in which the EKS cluster was created.
     */
    public readonly vpcId: pulumi.Output<string>;

    /**
     * The subnets attached to the EKS cluster.
     */
    public readonly subnetIds: pulumi.Output<string[]>;

   /**
     * The security group for the EKS cluster.
     */
    public readonly clusterSecurityGroup: aws.ec2.SecurityGroup;

    /**
     * The EKS cluster itself.
     */
    public readonly cluster: aws.eks.Cluster;

    /**
     * The Amazon VPC CNI plugin for this cluster.
     */
    public readonly vpcCni: VpcCni;

    /**
     * Create a new EKS cluster with worker nodes, optional storage classes, and deploy the Kubernetes Dashboard if
     * requested.
     *
     * @param name The _unique_ name of this component.
     * @param args The arguments for this cluster.
     * @param opts A bag of options that control this copmonent's behavior.
     */
    constructor(name: string, args?: CoreOptions, opts?: pulumi.ComponentResourceOptions) {
        super("eks:index:Core", name, args, opts);

        // Create the core infrastructure reuqired by the cluster.
        const core = createCore(name, args || {}, this);

        this.vpcId = core.vpcId;
        this.subnetIds = core.subnetIds;
        this.clusterSecurityGroup = core.eksClusterSecurityGroup;
        this.cluster = core.eksCluster;
        this.kubeconfig = core.kubeconfig;
        this.vpcCni = core.vpcCni;

        // Create the Kubernetes provider we'll use to manage the config map we need to allow worker nodes to access
        // the EKS cluster.
        this.provider = core.provider;

        this.registerOutputs({ kubeconfig: this.kubeconfig });
    }
}

export interface CoreData {
    vpcId: pulumi.Output<string>;
    subnetIds: pulumi.Output<string[]>;
    eksClusterSecurityGroup: aws.ec2.SecurityGroup;
    eksCluster: aws.eks.Cluster;
    eksNodeAccess: k8s.core.v1.ConfigMap;
    instanceProfile: aws.iam.InstanceProfile;
    kubeconfig: pulumi.Output<any>;
    provider: k8s.Provider;
    vpcCni: VpcCni;
}

export function createCore(name: string, args: CoreOptions, parent: pulumi.ComponentResource): CoreData {
    // Check to ensure that aws-iam-authenticator is installed, as we'll need it in order to deploy k8s resources
    // to the EKS cluster.
    try {
        which.sync("aws-iam-authenticator");
    } catch (err) {
        throw new pulumi.RunError("Could not find aws-iam-authenticator for EKS. See https://github.com/pulumi/eks#installing for installation instructions.");
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
    const allEgress = {
        description: "Allow internet access.",
        fromPort: 0,
        toPort: 0,
        protocol: "-1",  // all
        cidrBlocks: [ "0.0.0.0/0" ],
    };
    const eksClusterSecurityGroup = new aws.ec2.SecurityGroup(`${name}-eksClusterSecurityGroup`, {
        vpcId: vpcId,
        egress: [ allEgress ],
    }, { parent: parent });

    // Create the EKS cluster
    const eksCluster = new aws.eks.Cluster(`${name}-eksCluster`, {
        roleArn: eksRole.role.apply(r => r.arn),
        vpcConfig: { securityGroupIds: [ eksClusterSecurityGroup.id ], subnetIds: subnetIds },
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

    // Create the instance role we'll use for worker nodes.
    let instanceRole: pulumi.Output<aws.iam.Role>;
    if (args.instanceRole) {
        instanceRole = pulumi.output(args.instanceRole);
    } else {
        instanceRole = (new ServiceRole(`${name}-instanceRole`, {
            service: "ec2.amazonaws.com",
            managedPolicyArns: [
                "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
                "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
                "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
            ],
        }, { parent: parent })).role;
    }
    const instanceRoleARN = instanceRole.apply(r => r.arn);

    // Enable access to the EKS cluster for worker nodes.
    const instanceRoleMapping: RoleMapping = {
        roleArn: instanceRoleARN,
        username: "system:node:{{EC2PrivateDNSName}}",
        groups: ["system:bootstrappers", "system:nodes"],
    };
    const roleMappings = pulumi.all([pulumi.output(args.roleMappings || []), instanceRoleMapping])
        .apply(([mappings, instanceMapping]) => {
            return jsyaml.safeDump([...mappings, instanceMapping].map(m => ({
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

    const instanceProfile = new aws.iam.InstanceProfile(`${name}-instanceProfile`, {
        role: instanceRole,
    }, { parent: parent });

    return {
        vpcId: pulumi.output(vpcId),
        subnetIds: pulumi.output(subnetIds),
        eksClusterSecurityGroup: eksClusterSecurityGroup,
        eksCluster: eksCluster,
        kubeconfig: kubeconfig,
        provider: provider,
        vpcCni: vpcCni,
        instanceProfile: instanceProfile,
        eksNodeAccess: eksNodeAccess,
    };
}
