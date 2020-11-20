import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";

// Create an EKS cluster.
const projectName = pulumi.getProject();
const cluster = new eks.Cluster(projectName);
export const kubeconfig = cluster.kubeconfig;

// Get the results of the default security group created by AWS EKS.
const defaultSecgroupId = cluster.core.cluster.vpcConfig.clusterSecurityGroupId;
const defaultSecgroupResult = defaultSecgroupId.apply(id => {
    if (!id) { return undefined; }
    return pulumi.output(aws.ec2.getSecurityGroup({
        filters: [{
            name: "group-id",
            values: [id],
        }],
    }, {async: true}));
});

// Import the default security group into Pulumi.
// https://www.pulumi.com/docs/guides/adopting/import/#adopting-existing-resources
const defaultSecgroup = pulumi.all([
    cluster.core.cluster.name,
    cluster.core.vpcId,
    defaultSecgroupResult,
]).apply(([clusterName, vpcId, sgResult]) => {
    if (!sgResult) { return undefined; }
    return new aws.ec2.SecurityGroup("default-eks-sg", {
        name: sgResult.name,
        description: sgResult.description,
        ingress: [{ protocol: "-1", fromPort: 0, toPort: 0, self: true}],
        egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"]}],
        tags: sgResult.tags,
        vpcId,
    }, {import: sgResult.id});
});
