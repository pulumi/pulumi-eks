using Pulumi;
using Pulumi.Eks;

class MyStack : Stack
{
    [Output("kubeconfig1")]
    public Output<object> Kubeconfig1 { get; set; }

    [Output("kubeconfig2")]
    public Output<object> Kubeconfig2 { get; set; }

    public MyStack()
    {
        string projectName = Deployment.Instance.ProjectName;

        // Create an EKS cluster with the default configuration.
        var cluster1 = new Cluster($"{projectName}-1");

        // Create an EKS cluster with a non-default configuration.
        var vpc = new Vpc($"{projectName}-2", new VpcArgs
        {
            Tags =
            {
                { "Name", $"{projectName}-2" },
            },
        });

        var cluster2 = new Cluster($"{projectName}-2", new ClusterArgs
        {
            VpcId = vpc.VpcId,
            PublicSubnetIds = vpc.PublicSubnetIds,
            DesiredCapacity = 2,
            MinSize = 2,
            MaxSize = 2,
            EnabledClusterLogTypes = new[]
            {
                "api",
                "audit",
                "authenticator"
            },
        });

        // Export the clusters' kubeconfig.
        Kubeconfig1 = cluster1.Kubeconfig;
        Kubeconfig2 = cluster2.Kubeconfig;
    }
}
