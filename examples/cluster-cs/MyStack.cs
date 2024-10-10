using Pulumi;
using Eks = Pulumi.Eks;
using Aws = Pulumi.Aws;
using Awsx = Pulumi.Awsx;
using System.Collections.Generic;

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

        var cluster1 = new Eks.Cluster($"{projectName}-1");

        var vpc = new Awsx.Ec2.Vpc($"{projectName}-2");

        var cluster2 = new Eks.Cluster($"{projectName}-2", new Eks.ClusterArgs
        {
            VpcId = vpc.VpcId,
            PublicSubnetIds = vpc.PublicSubnetIds,
            DesiredCapacity = 2,
            MinSize = 2,
            MaxSize = 2,
            EnabledClusterLogTypes = {
                "api",
                "audit",
                "authenticator",
            }
        });

        var iamRole = new Aws.Iam.Role("ec2Role", new Aws.Iam.RoleArgs
        {
            AssumeRolePolicy = @"{
                ""Version"": ""2012-10-17"",
                ""Statement"": [
                    {
                        ""Effect"": ""Allow"",
                        ""Principal"": {
                            ""Service"": ""ec2.amazonaws.com""
                        },
                        ""Action"": ""sts:AssumeRole""
                    }
                ]
            }"
        });

var cluster3 = new Eks.Cluster($"{projectName}-3", new Eks.ClusterArgs
{
    VpcId = vpc.VpcId,
    PublicSubnetIds = vpc.PublicSubnetIds,
    NodeGroupOptions = new Eks.Inputs.ClusterNodeGroupOptionsArgs
    {
        DesiredCapacity = 1,
        MinSize = 1,
        MaxSize = 1,
        InstanceType = "t3.small",
    },
    AuthenticationMode = Eks.AuthenticationMode.ApiAndConfigMap,
    AccessEntries = new Dictionary<string, Eks.Inputs.AccessEntryArgs>
        {
                { $"{projectName}-role", new Eks.Inputs.AccessEntryArgs {
                PrincipalArn = iamRole.Arn,
                AccessPolicies = new Dictionary<string, Input<Eks.Inputs.AccessPolicyAssociationArgs>> {
                    { "accessPolicy1", new Eks.Inputs.AccessPolicyAssociationArgs {
                        AccessScope = new Aws.Eks.Inputs.AccessPolicyAssociationAccessScopeArgs {
                            Namespaces = new[] { "default", "application" },
                            Type = "namespace"
                        },
                        PolicyArn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy",
                    }
                }
            },
            }}
        }
});

        // Export the clusters' kubeconfig.
        Kubeconfig1 = cluster1.Kubeconfig;
        Kubeconfig2 = cluster2.Kubeconfig;
        Kubeconfig3 = cluster3.Kubeconfig;
    }
}
