import * as k8s from '@pulumi/kubernetes';
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

export = async () => {
    /**
        * Identical IAM for all NodeGroups: all NodeGroups share the same `instanceRole`.
        */

    // Create example IAM roles and profiles to show to use them with NodeGroups.
    // Note, all roles for the instance profiles are required to at least have
    // the following EKS Managed Policies attached to successfully auth and join the
    // cluster:
    //   - "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
    //   - "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
    //   - "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
    const role0 = iam.createRole("example-role0");

    // Create an EKS cluster with a shared IAM instance role to register with the
    // cluster auth.
    const cluster1 = new eks.Cluster("example-nodegroup-iam-simple", {
        skipDefaultNodeGroup: true,
        nodeAmiId: "ami-0384725f0d30527c7",
        instanceRole: role0,
    });

    new k8s.core.v1.Namespace("apps", undefined, {provider: await cluster1.getK8sProvider()});

}
