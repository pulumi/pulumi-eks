import * as aws from "@pulumi/aws";
import * as k8s from '@pulumi/kubernetes';
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

// Creates an EKS NodeGroup.
interface NodeGroupArgs {
    instanceType: pulumi.Input<aws.ec2.InstanceType>;
    desiredCapacity: pulumi.Input<number>;
    cluster: eks.Cluster;
    instanceProfile: aws.iam.InstanceProfile;
    taints?: pulumi.Input<any>;
}
export function createNodeGroup(
    name: string,
    args: NodeGroupArgs,
    k8sProvider: k8s.Provider,
): eks.NodeGroup {
    return new eks.NodeGroup(name, {
        cluster: args.cluster,
        nodeSecurityGroup: args.cluster.nodeSecurityGroup,
        clusterIngressRule: args.cluster.eksClusterIngressRule,
        instanceType: args.instanceType,
        nodeAssociatePublicIpAddress: false,
        desiredCapacity: args.desiredCapacity,
        minSize: args.desiredCapacity,
        maxSize: 10,
        instanceProfile: args.instanceProfile,
        taints: args.taints,
    }, {
        providers: { kubernetes: k8sProvider},
    });
}
