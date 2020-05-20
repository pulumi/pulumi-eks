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
import * as pulumi from "@pulumi/pulumi";

import { InputTags } from "./utils";

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
    clusterSecurityGroup: aws.ec2.SecurityGroup;

    /*
     * Key-value mapping of tags to apply to this security group.
     */
    tags?: InputTags;

    /**
     * The EKS cluster associated with the worker node group.
     */
    eksCluster: aws.eks.Cluster;
}

/**
 * createNodeGroupSecurityGroup creates a security group for node groups with the
 * default ingress & egress rules required to connect and work with the EKS
 * cluster security group.
 */
export function createNodeGroupSecurityGroup(name: string, args: NodeGroupSecurityGroupOptions, parent: pulumi.ComponentResource, provider?: pulumi.ProviderResource): [aws.ec2.SecurityGroup, aws.ec2.SecurityGroupRule] {
    const nodeSecurityGroup = new aws.ec2.SecurityGroup(`${name}-nodeSecurityGroup`, {
        vpcId: args.vpcId,
        revokeRulesOnDelete: true,
        tags: pulumi.all([
            args.tags,
            args.eksCluster.name,
        ]).apply(([tags, clusterName]) => (<aws.Tags>{
            "Name": `${name}-nodeSecurityGroup`,
            [`kubernetes.io/cluster/${clusterName}`]: "owned",
            ...tags,
        })),
    }, { parent, provider });

    const nodeIngressRule = new aws.ec2.SecurityGroupRule(`${name}-eksNodeIngressRule`, {
        description: "Allow nodes to communicate with each other",
        type: "ingress",
        fromPort: 0,
        toPort: 0,
        protocol: "-1", // all
        securityGroupId: nodeSecurityGroup.id,
        self: true,
    }, { parent, provider });

    const nodeClusterIngressRule = new aws.ec2.SecurityGroupRule(`${name}-eksNodeClusterIngressRule`, {
        description: "Allow worker Kubelets and pods to receive communication from the cluster control plane",
        type: "ingress",
        fromPort: 1025,
        toPort: 65535,
        protocol: "tcp",
        securityGroupId: nodeSecurityGroup.id,
        sourceSecurityGroupId: args.clusterSecurityGroup.id,
    }, { parent, provider });

    const extApiServerClusterIngressRule = new aws.ec2.SecurityGroupRule(`${name}-eksExtApiServerClusterIngressRule`, {
        description: "Allow pods running extension API servers on port 443 to receive communication from cluster control plane",
        type: "ingress",
        fromPort: 443,
        toPort: 443,
        protocol: "tcp",
        securityGroupId: nodeSecurityGroup.id,
        sourceSecurityGroupId: args.clusterSecurityGroup.id,
    }, { parent, provider });

    const nodeInternetEgressRule = new aws.ec2.SecurityGroupRule(`${name}-eksNodeInternetEgressRule`, {
        description: "Allow internet access.",
        type: "egress",
        fromPort: 0,
        toPort: 0,
        protocol: "-1",  // all
        cidrBlocks: [ "0.0.0.0/0" ],
        securityGroupId: nodeSecurityGroup.id,
    }, { parent, provider });

    const eksClusterIngressRule = new aws.ec2.SecurityGroupRule(`${name}-eksClusterIngressRule`, {
        description: "Allow pods to communicate with the cluster API Server",
        type: "ingress",
        fromPort: 443,
        toPort: 443,
        protocol: "tcp",
        securityGroupId: args.clusterSecurityGroup.id,
        sourceSecurityGroupId: nodeSecurityGroup.id,
    }, { parent, provider });

    return [nodeSecurityGroup, eksClusterIngressRule];
}
