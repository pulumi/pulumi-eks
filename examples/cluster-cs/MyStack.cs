using Pulumi;
using Eks = Pulumi.Eks;
using Awsx = Pulumi.Awsx;

class MyStack : Stack
{
    [Output("kubeconfig1")]
    public Output<object> Kubeconfig1 { get; set; }

    [Output("kubeconfig2")]
    public Output<object> Kubeconfig2 { get; set; }

    [Output("kubeconfig3")]
    public Output<object> Kubeconfig3 { get; set; }

    public MyStack()
    {
        string projectName = Deployment.Instance.ProjectName;

        var cluster1 = new Cluster($"{projectName}-1");

        var vpc = new Awsx.Ec2.Vpc($"{projectName}-2");

        var cluster2 = new Cluster($"{projectName}-2", new ClusterArgs {
            VpcId = vpc.Id,
            PublicSubnetIds = vpc.PublicSubnetIds,
            DesiredCapacity = 2,
            MinSize = 2,
            MaxSize = 2,
            DeployDashboard = false,
            EnabledClusterLogTypes = {
                "api",
                "audit",
                "authenticator",
            }
        });

        var cluster3 = new Cluster($"{projectName}-3", new ClusterArgs {
            VpcId = vpc.Id,
            PublicSubnetIds = vpc.PublicSubnetIds,
            NodeGroupOptions = new ClusterNodeGroupOptionsArgs {
                DesiredCapacity = 1,
                MinSize = 1,
                MaxSize = 1,
                InstanceType = "t2.small",
            },
        });

        // Export the clusters' kubeconfig.
        Kubeconfig1 = cluster1.Kubeconfig;
        Kubeconfig2 = cluster2.Kubeconfig;
        Kubeconfig3 = cluster3.Kubeconfig;
    }
}
