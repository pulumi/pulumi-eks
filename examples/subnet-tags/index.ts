import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

const projectName = pulumi.getProject();
const tags = { "project": "subnets", "owner": "pulumi"};

// Create a VPC with subnets that are tagged for load balancer usage.
const vpc = new awsx.ec2.Vpc("vpc",
    {
        tags: {"Name": `${projectName}`, ...tags},
        subnets: [
            // Tag subnets for specific load-balancer usage.
            // Any non-null tag value is valid.
            // See:
            //  - https://docs.aws.amazon.com/eks/latest/userguide/network_reqs.html
            //  - https://github.com/pulumi/pulumi-eks/issues/196
            //  - https://github.com/pulumi/pulumi-eks/issues/415
            {type: "public", tags: {"kubernetes.io/role/elb": "1", ...tags}},
            {type: "private", tags: {"kubernetes.io/role/internal-elb": "1", ...tags}},
        ],
    },
    {
        // Inform pulumi to ignore tag changes to the VPCs or subnets, so that
        // tags auto-added by AWS EKS do not get removed during future
        // refreshes and updates, as they are added outside of pulumi's management
        // and would be removed otherwise.
        // See: https://github.com/pulumi/pulumi-eks/issues/271#issuecomment-548452554
        transformations: [(args: any) => {
            if (args.type === "aws:ec2/vpc:Vpc" || args.type === "aws:ec2/subnet:Subnet") {
                return {
                    props: args.props,
                    opts: pulumi.mergeOptions(args.opts, { ignoreChanges: ["tags"] }),
                };
            }
            return undefined;
        }],
    },
);

// Create a cluster using the VPC and subnets.
const cluster = new eks.Cluster(`${projectName}`, {
    vpcId: vpc.id,
    publicSubnetIds: vpc.publicSubnetIds,
    privateSubnetIds: vpc.privateSubnetIds,
    tags,
});

// Export the cluster kubeconfig.
export const kubeconfig = cluster.kubeconfig;
