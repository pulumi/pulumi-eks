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
import * as fs from "fs";
import * as path from "path";

import { ServiceRole } from "./servicerole";
import { createStorageClass, EBSVolumeType, StorageClass } from "./storageclass";

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
     * default VPC's subnets.
     */
    subnetIds?: pulumi.Input<pulumi.Input<string>[]>;

    /**
     * The instance type to use for the cluster's nodes. Defaults to "t2.medium".
     */
    instanceType?: pulumi.Input<aws.ec2.InstanceType>;

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
     * Whether or not to deploy the Kubernetes dashboard to the cluster. If the dashboard is deployed, it can be
     * accessed as follows:
     * 1. Retrieve an authentication token for the dashboard by running the following and copying the value of `token`
     *   from the output of the last command:
     *
     *     $ kubectl -n kube-system get secret | grep eks-admin | awk '{print $1}'
     *     $ kubectl -n kube-system describe secret <output from previous command>
     *
     * 2. Start the kubectl proxt:
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
}

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
     * Create a new EKS cluster with worker nodes, optional storage classes, and deploy the Kubernetes Dashboard if
     * requested.
     *
     * @param name The _unique_ name of this component.
     * @param args The arguments for this cluster.
     * @param opts A bag of options that control this copmonent's behavior.
     */
    constructor(name: string, args?: ClusterOptions, opts?: pulumi.ComponentResourceOptions) {
        super("eks:index:Cluster", name, args, opts);

        args = args || {};

        // If no VPC was specified, use the default VPC.
        let vpcId: pulumi.Input<string> = args.vpcId!;
        let subnetIds: pulumi.Input<pulumi.Input<string>[]> = args.subnetIds!;
        if (args.vpcId === undefined) {
            const invokeOpts = { parent: this };
            const vpc = aws.ec2.getVpc({ default: true }, invokeOpts);
            vpcId = vpc.then(v => v.id);
            subnetIds = vpc.then(v => aws.ec2.getSubnetIds({ vpcId: v.id }, invokeOpts)).then(subnets => subnets.ids);
        }

        // Create the EKS service role
        const eksRole = new ServiceRole("eksRole", {
            service: "eks.amazonaws.com",
            description: "Allows EKS to manage clusters on your behalf.",
            managedPolicyArns: [
                "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
                "arn:aws:iam::aws:policy/AmazonEKSServicePolicy",
            ],
        }, { parent: this });

        // Create the EKS cluster security group
        const allEgress = {
            description: "Allow internet access.",
            fromPort: 0,
            toPort: 0,
            protocol: "-1",  // all
            cidrBlocks: [ "0.0.0.0/0" ],
        };
        const eksClusterSecurityGroup = new aws.ec2.SecurityGroup("eksClusterSecurityGroup", {
            vpcId: vpcId,
            egress: [ allEgress ],
        }, { parent: this });

        // Create the EKS cluster
        const eksCluster = new aws.eks.Cluster("eksCluster", {
            roleArn: eksRole.role.apply(r => r.arn),
            vpcConfig: { securityGroupIds: [ eksClusterSecurityGroup.id ], subnetIds: subnetIds },
        }, { parent: this });

        // Create the instance role we'll use for worker nodes.
        const instanceRole = new ServiceRole("instanceRole", {
            service: "ec2.amazonaws.com",
            managedPolicyArns: [
                "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
                "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
                "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
            ],
        }, { parent: this });
        const instanceRoleARN = instanceRole.role.apply(r => r.arn);

        // Compute the required kubeconfig. Note that we do not export this value: we want the exported config to
        // depend on the autoscaling group we'll create later so that nothing attempts to use the EKS cluster before
        // its worker nodes have come up.
        const myKubeconfig = pulumi.all([eksCluster.name, eksCluster.endpoint, eksCluster.certificateAuthority])
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

        // Create the Kubernetes provider we'll use to manage the config map we need to allow worker nodes to access
        // the EKS cluster.
        const k8sProvider = new k8s.Provider("eks-k8s", {
            kubeconfig: myKubeconfig.apply(JSON.stringify),
        }, { parent: this });

        // Enable access to the EKS cluster for worker nodes.
        const eksNodeAccess = new k8s.core.v1.ConfigMap("nodeAccess", {
            apiVersion: "v1",
            metadata: {
                name: "aws-auth",
                namespace: "kube-system",
            },
            data: {
                mapRoles: instanceRoleARN.apply(arn => `- rolearn: ${arn}\n  username: system:node:{{EC2PrivateDNSName}}\n  groups:\n    - system:bootstrappers\n    - system:nodes\n`),
            },
        }, { parent: this, provider: k8sProvider });

        // Add any requested StorageClasses.
        const storageClasses = args.storageClasses || "gp2";
        if (typeof storageClasses === "string") {
            const storageClass = { type: storageClasses, default: true };
            createStorageClass(storageClasses, storageClass, { parent: this, provider: k8sProvider });
        } else {
            for (const key of Object.keys(storageClasses)) {
                createStorageClass(key, storageClasses[key], { parent: this, provider: k8sProvider });
            }
        }

        // Create the cluster's worker nodes.
        const instanceProfile = new aws.iam.InstanceProfile("instanceProfile", {
            role: instanceRole.role,
        }, { parent: this });
        const instanceSecurityGroup = new aws.ec2.SecurityGroup("instanceSecurityGroup", {
            vpcId: vpcId,
            ingress: [
                {
                    description: "Allow nodes to communicate with each other",
                    fromPort: 0,
                    toPort: 0,
                    protocol: "-1", // all
                    self: true,
                },
                {
                    description: "Allow worker Kubelets and pods to receive communication from the cluster control plane",
                    fromPort: 1025,
                    toPort: 65535,
                    protocol: "tcp",
                    securityGroups: [ eksClusterSecurityGroup.id ],
                },
            ],
            egress: [ allEgress ],
            tags: eksCluster.name.apply(n => <aws.Tags>{
                [`kubernetes.io/cluster/${n}`]: "owned",
            }),
        }, { parent: this });
        const eksClusterIngressRule = new aws.ec2.SecurityGroupRule("eksClusterIngressRule", {
            description: "Allow pods to communicate with the cluster API Server",
            type: "ingress",
            fromPort: 443,
            toPort: 443,
            protocol: "tcp",
            securityGroupId: eksClusterSecurityGroup.id,
            sourceSecurityGroupId: instanceSecurityGroup.id,
        }, { parent: this });
        const instanceSecurityGroupId = pulumi.all([instanceSecurityGroup.id, eksClusterIngressRule.id])
            .apply(([id]) => id);

        const awsRegion = pulumi.output(aws.getRegion({}, { parent: this }));
        const clusterCaData = eksCluster.certificateAuthority.apply(ca => Buffer.from(ca.data).toString("base64"));
        const userdata = pulumi.all([awsRegion, eksCluster.name, eksCluster.endpoint, clusterCaData])
            .apply(([region, clusterName, clusterEndpoint, clusterCa]) => {
                return `#!/bin/bash

/etc/eks/bootstrap.sh ${clusterName} --apiserver-endpoint ${clusterEndpoint} --b64-cluster-ca ${clusterCa}
`;
            });
        const eksWorkerAmi = aws.getAmi({
            filters: [{
                name: "name",
                values: [ "amazon-eks-node-*" ],
            }],
            mostRecent: true,
            owners: [ "602401143452" ], // Amazon
        }, { parent: this });
        const instanceLaunchConfiguration = new aws.ec2.LaunchConfiguration("instanceLaunchConfiguration", {
            associatePublicIpAddress: true,
            imageId: eksWorkerAmi.then(r => r.imageId),
            instanceType: args.instanceType || "t2.medium",
            iamInstanceProfile: instanceProfile.id,
            securityGroups: [ instanceSecurityGroupId ],
            userData: userdata,
        }, { parent: this });
        const autoscalingGroup = new aws.autoscaling.Group("autoscalingGroup", {
            desiredCapacity: args.desiredCapacity || 2,
            launchConfiguration: instanceLaunchConfiguration.id,
            maxSize: args.maxSize || 2,
            minSize: args.minSize || 1,
            vpcZoneIdentifiers: subnetIds,
            tags: [
                {
                    key: eksCluster.name.apply(n => `kubernetes.io/cluster/${n}`),
                    value: "owned",
                    propagateAtLaunch: true,
                },
                {
                    key: "Name",
                    value: eksCluster.name.apply(n => `${n}-worker`),
                    propagateAtLaunch: true,
                },
            ],
        }, { parent: this, dependsOn: eksNodeAccess });

        // Export the cluster's kubeconfig with a dependency upon the cluster's autoscaling group. This will help
        // ensure that the cluster's consumers do not attempt to use the cluster until its workers are attached.
        this.kubeconfig = pulumi.all([autoscalingGroup.id, myKubeconfig]).apply(([_, kubeconfig]) => kubeconfig);

        // Export a k8s provider with the above kubeconfig. Note that we do not export the provider we created earlier
        // in order to help ensure that worker nodes are available before the provider can be used.
        this.provider = new k8s.Provider("provider", {
            kubeconfig: this.kubeconfig.apply(JSON.stringify),
        }, { parent: this });

        // If we need to deploy the Kubernetes dashboard, do so now.
        if (args.deployDashboard === undefined || args.deployDashboard) {
            // Deploy the latest version of the k8s dashboard.
            const dashboardYaml = [
                path.join(__dirname, "dashboard", "kubernetes-dashboard.yaml"),
                path.join(__dirname, "dashboard", "heapster.yaml"),
                path.join(__dirname, "dashboard", "influxdb.yaml"),
                path.join(__dirname, "dashboard", "heapster-rbac.yaml"),
            ].map(filePath => fs.readFileSync(filePath).toString());
            const dashboard = new k8s.yaml.ConfigGroup("dashboard", {
                yaml: dashboardYaml,
            }, { parent: this, providers: { kubernetes: this.provider } });

            // Create a service account for admin access.
            const adminAccount = new k8s.core.v1.ServiceAccount("eks-admin", {
                metadata: {
                    name: "eks-admin",
                    namespace: "kube-system",
                },
            }, { parent: this, provider: this.provider });

            // Create a role binding for the admin account.
            const adminRoleBinding = new k8s.rbac.v1.ClusterRoleBinding("eks-admin", {
                metadata: {
                    name: "eks-admin",
                },
                roleRef: {
                    apiGroup: "rbac.authorization.k8s.io",
                    kind: "ClusterRole",
                    name: "cluster-admin",
                },
                subjects: [{
                    kind: "ServiceAccount",
                    name: "eks-admin",
                    namespace: "kube-system",
                }],
            }, { parent: this, provider: this.provider });
        }

        this.registerOutputs({ kubeconfig: this.kubeconfig });
    }
}
