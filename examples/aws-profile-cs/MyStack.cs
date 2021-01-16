using System;
using Pulumi;
using Aws = Pulumi.Aws;
using Eks = Pulumi.Eks;

class MyStack : Stack
{
    [Output("kubeconfig")]
    public Output<object> Kubeconfig { get; set; }

    public MyStack()
    {
        string projectName = Deployment.Instance.ProjectName;

        // For CI testing only: used to set profileName to alternate AWS_PROFILE envvar.
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ALT_AWS_PROFILE")))
        {
            throw new Exception("ALT_AWS_PROFILE must be set");
        }

        // AWS named profile to use.
        string profileName = Environment.GetEnvironmentVariable("ALT_AWS_PROFILE");

        // Create an AWS provider instance using the named profile creds
        // and current region.
        var awsProvider = new Aws.Provider("aws-provider", new Aws.ProviderArgs
        {
            Profile = profileName,
            Region = Output.Create(Aws.GetRegion.InvokeAsync()).Apply(r => r.Name),
        });

        // Define the AWS provider credential opts to configure the cluster's
        // kubeconfig auth.
        var kubeconfigOptions = new Eks.Inputs.KubeconfigOptionsArgs
        {
            ProfileName = profileName,
        };

        // Create the cluster using the AWS provider and credential opts.
        var cluster = new Eks.Cluster(projectName, new Eks.ClusterArgs
        {
            ProviderCredentialOpts = kubeconfigOptions,
        },
        new ComponentResourceOptions
        {
            Provider = awsProvider,
        });

        // Export the cluster kubeconfig.
        Kubeconfig = cluster.Kubeconfig;
    }
}
