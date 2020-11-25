using Pulumi;
using Pulumi.Eks;

class MyStack : Stack
{
    [Output("kubeconfig1")]
    public Output<object> Kubeconfig1 { get; set; }

    // TODO
    // [Output("kubeconfig2")]
    // public Output<object> Kubeconfig2 { get; set; }

    public MyStack()
    {
        string projectName = Deployment.Instance.ProjectName;

        var cluster1 = new Cluster($"{projectName}-1");

        // # TODO
        // # // Create an EKS cluster with a non-default configuration.
        // # const vpc = new awsx.ec2.Vpc(`${projectName}-2`, {
        // #     tags: { "Name": `${projectName}-2` },
        // # });

        // # const cluster2 = new eks.Cluster(`${projectName}-2`, {
        // #     vpcId: vpc.id,
        // #     publicSubnetIds: vpc.publicSubnetIds,
        // #     desiredCapacity: 2,
        // #     minSize: 2,
        // #     maxSize: 2,
        // #     deployDashboard: false,
        // #     enabledClusterLogTypes: [
        // #         "api",
        // #         "audit",
        // #         "authenticator",
        // #     ],
        // # });

        // Export the clusters' kubeconfig.
        Kubeconfig1 = cluster1.kubeconfig;
        // TODO
        // Kubeconfig2 = cluster2.kubeconfig;
    }
}
