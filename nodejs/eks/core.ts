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
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import which = require("which");

import { ServiceRole } from "./servicerole";
import { createStorageClass, EBSVolumeType, StorageClass } from "./storageclass";

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
     * An optional set of StorageClasses to enable for the cluster. If this is a single volume type rather than a map,
     * a single StorageClass will be created for that volume type and made the cluster's default StorageClass.
     */
    storageClasses?: { [name: string]: StorageClass } | EBSVolumeType;
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
    kubeconfig: pulumi.Output<any>;
    provider: k8s.Provider;
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

    return {
        vpcId: pulumi.output(vpcId),
        subnetIds: pulumi.output(subnetIds),
        eksClusterSecurityGroup: eksClusterSecurityGroup,
        eksCluster: eksCluster,
        kubeconfig: kubeconfig,
        provider: provider,
    };
}
