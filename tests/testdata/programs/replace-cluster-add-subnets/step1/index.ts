import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

const projectName = pulumi.getProject();

// Allocate a new VPC with custom settings, and a public & private subnet per AZ.
const vpc = new awsx.ec2.Vpc(`${projectName}`, {
    cidrBlock: "172.16.0.0/16",
    numberOfAvailabilityZones: 3,
    tags: { "Name": `${projectName}` },
});

const publicSubnetIds = vpc.publicSubnetIds;

const cluster = new eks.Cluster(`${projectName}`, {
    vpcId: vpc.vpcId,
    publicSubnetIds: publicSubnetIds,
}, { transforms: [args => {
    // trigger a replacement of the cluster
    if (args.type === "aws:eks/cluster:Cluster") {
        return {
            props: args.props,
            opts: pulumi.mergeOptions(args.opts, { replaceOnChanges: ["vpcConfig"] })
        }
    }
    return undefined;
}]});

// Export the cluster name and kubeconfig
export const clusterName = cluster.core.cluster.name;
export const kubeconfig = cluster.kubeconfig;
