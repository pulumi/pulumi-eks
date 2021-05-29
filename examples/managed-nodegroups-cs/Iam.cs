using Aws = Pulumi.Aws;

static class Iam
{
    private static readonly string[] s_managedPolicyArns =
    {
        "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
        "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
        "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    };

    /// <summary>
    /// Creates a role and attaches the EKS worker node IAM managed policies.
    /// </summary>
    public static Aws.Iam.Role CreateRole(string name)
    {
        var role = new Aws.Iam.Role(name, new Aws.Iam.RoleArgs
        {
            AssumeRolePolicy = @"{
""Version"": ""2008-10-17"",
""Statement"": [{
    ""Sid"": """",
    ""Effect"": ""Allow"",
    ""Principal"": {
        ""Service"": ""eks.amazonaws.com""
    },
    ""Action"": ""sts:AssumeRole""
}]
}",
        });

        for (int i = 0; i < s_managedPolicyArns.Length; i++)
        {
            // Create RolePolicyAttachment without returning it.
            new Aws.Iam.RolePolicyAttachment($"{name}-policy-{i}", new Aws.Iam.RolePolicyAttachmentArgs
            {
                PolicyArn = s_managedPolicyArns[i],
                Role = role.Id,
            });
        }

        return role;
    }
}
