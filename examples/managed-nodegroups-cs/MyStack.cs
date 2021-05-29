using Pulumi;
using Aws = Pulumi.Aws;
using Eks = Pulumi.Eks;

class MyStack : Stack
{
    [Output("kubeconfig")]
    public Output<object> Kubeconfig { get; set; }

    public MyStack()
    {
        // IAM roles for the node groups.
        var role0 = Iam.CreateRole("example-role0");
        var role1 = Iam.CreateRole("example-role1");
        var role2 = Iam.CreateRole("example-role2");

        // Create an EKS cluster.
        var cluster = new Eks.Cluster("example-managed-nodegroups", new Eks.ClusterArgs
        {
            SkipDefaultNodeGroup = true,
            InstanceRoles = { role0, role1, role2 },
        });

        // Export the cluster's kubeconfig.
        Kubeconfig = cluster.Kubeconfig;

        // Create a simple AWS managed node group using a cluster as input and the
        // refactored API.
        var managedNodeGroup0 = new Eks.ManagedNodeGroup("example-mananged-ng0", new Eks.ManagedNodeGroupArgs
        {
            Cluster = cluster.Core.Apply(c => c.ToArgs<Eks.Inputs.CoreDataArgs>()), // TODO[pulumi/pulumi-eks#483]: Pass cluster directly.
            NodeRole = role0,
        });

        // Create a simple AWS managed node group using a cluster as input and the
        // initial API.
        var managedNodeGroup1 = new Eks.ManagedNodeGroup("example-managed-ng1", new Eks.ManagedNodeGroupArgs
        {
            Cluster = cluster.Core.Apply(c => c.ToArgs<Eks.Inputs.CoreDataArgs>()), // TODO[pulumi/pulumi-eks#483]: Pass cluster directly.
            NodeGroupName = "aws-managed-ng1",
            NodeRoleArn = role1.Arn,
        },
        new ComponentResourceOptions
        {
            Parent = cluster,
        });

        var managedNodeGroup2 = new Eks.ManagedNodeGroup("example-managed-ng2", new Eks.ManagedNodeGroupArgs
        {
            Cluster = cluster.Core.Apply(c => c.ToArgs<Eks.Inputs.CoreDataArgs>()), // TODO[pulumi/pulumi-eks#483]: Pass cluster directly.
            NodeGroupName = "aws-managed-ng2",
            NodeRoleArn = role2.Arn,
            ScalingConfig = new Aws.Eks.Inputs.NodeGroupScalingConfigArgs
            {
                DesiredSize = 1,
                MinSize = 1,
                MaxSize = 2,
            },
            DiskSize = 20,
            InstanceTypes = { "t2.medium" },
            Labels =
            {
                { "ondemand", "true" },
            },
            Tags =
            {
               { "org", "pulumi" },
            }
        },
        new ComponentResourceOptions
        {
            Parent = cluster,
        });
    }
}
