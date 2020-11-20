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
        // TODO[pulumi/pulumi#5455]: To temporarily workaround an issue with dynamic providers
        // we need to install the @pulumi/eks Node.js package in our example's directory.
        // Once the issue has been addressed, we can remove these lines.
        System.IO.File.WriteAllText("package.json", "{ \"dependencies\": { \"@pulumi/eks\": \"latest\" } }");
        System.Diagnostics.Process.Start("yarn", "install").WaitForExit();
        System.Diagnostics.Process.Start("yarn", "link @pulumi/eks").WaitForExit();

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
