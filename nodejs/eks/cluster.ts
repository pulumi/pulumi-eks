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

import { createCore } from "./core";
import { EBSVolumeType, StorageClass } from "./storageclass";
import { createWorkerPool } from "./workerpool";

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
     * Public key material for SSH access to worker nodes. See allowed formats at:
     * https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
     * If not provided, no SSH access is enabled on VMs.
     */
    nodePublicKey?: pulumi.Input<string>;

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

        // Create the core resources required by the cluster.
        args.storageClasses = args.storageClasses || "gp2";
        const core = createCore(name, args, this);
        this.clusterSecurityGroup = core.eksClusterSecurityGroup;

        // Create the worker pool and grant the workers access to the API server.
        const defaultPool = createWorkerPool(name, {
            vpcId: core.vpcId,
            subnetIds: core.subnetIds,
            clusterSecurityGroup: core.eksClusterSecurityGroup,
            cluster: core.eksCluster,
            instanceType: args.instanceType,
            nodePublicKey: args.nodePublicKey,
            nodeRootVolumeSize: args.nodeRootVolumeSize,
            nodeUserData: args.nodeUserData,
            minSize: args.minSize,
            maxSize: args.maxSize,
        }, this, core.provider);
        this.instanceRole = defaultPool.instanceRole;
        this.nodeSecurityGroup = defaultPool.nodeSecurityGroup;

        // Export the cluster's kubeconfig with a dependency upon the cluster's autoscaling group. This will help
        // ensure that the cluster's consumers do not attempt to use the cluster until its workers are attached.
        this.kubeconfig = pulumi.all([defaultPool.cfnStack.id, core.kubeconfig]).apply(([_, kubeconfig]) => kubeconfig);

        // Export a k8s provider with the above kubeconfig. Note that we do not export the provider we created earlier
        // in order to help ensure that worker nodes are available before the provider can be used.
        this.provider = new k8s.Provider(`${name}-provider`, {
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
            const dashboard = new k8s.yaml.ConfigGroup(`${name}-dashboard`, {
                yaml: dashboardYaml,
            }, { parent: this, providers: { kubernetes: this.provider } });

            // Create a service account for admin access.
            const adminAccount = new k8s.core.v1.ServiceAccount(`${name}-eks-admin`, {
                metadata: {
                    name: "eks-admin",
                    namespace: "kube-system",
                },
            }, { parent: this, provider: this.provider });

            // Create a role binding for the admin account.
            const adminRoleBinding = new k8s.rbac.v1.ClusterRoleBinding(`${name}-eks-admin`, {
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
