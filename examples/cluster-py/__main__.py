import pulumi
import pulumi_aws as aws
import pulumi_eks as eks
import pulumi_awsx as awsx


project_name = pulumi.get_project()

# Create an EKS cluster with the default configuration.
cluster1 = eks.Cluster(f"{project_name}-1")

# Create an EKS cluster with a non-default configuration.
vpc = awsx.ec2.Vpc(project_name, tags={"Name": project_name})

cluster2 = eks.Cluster(
    "eks-cluster",
    vpc_id=vpc.vpc_id,
    public_subnet_ids=vpc.public_subnet_ids,
    public_access_cidrs=["0.0.0.0/0"],
    desired_capacity=2,
    min_size=2,
    max_size=2,
    instance_type="t3.micro",
    # set storage class.
    storage_classes={
        "gp2": eks.StorageClassArgs(
            type="gp2",
            allow_volume_expansion=True,
            default=True,
            encrypted=True,
        )
    },
    enabled_cluster_log_types=[
        "api",
        "audit",
        "authenticator",
    ],
)

iam_role = aws.iam.Role(
    f"{project_name}-role",
    assume_role_policy=pulumi.Output.json_dumps(
        {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "sts:AssumeRole",
                    "Effect": "Allow",
                    "Principal": {"Service": "ec2.amazonaws.com"},
                }
            ],
        }
    ),
)

cluster3 = eks.Cluster(
    f"{project_name}-3",
    vpc_id=vpc.vpc_id,
    public_subnet_ids=vpc.public_subnet_ids,
    default_addons_to_remove=["coredns"],
    node_group_options=eks.ClusterNodeGroupOptionsArgs(
        desired_capacity=1, min_size=1, max_size=1, instance_type="t3.small"
    ),
    authentication_mode=eks.AuthenticationMode.API_AND_CONFIG_MAP,
    access_entries={
        f"{project_name}-role": eks.AccessEntryArgs(
            principal_arn=iam_role.arn,
            kubernetes_groups=["test-group"],
            access_policies={
                "view": eks.AccessPolicyAssociationArgs(
                    policy_arn="arn:aws:eks::aws:cluster-access-policy/AmazonEKSViewPolicy",
                    access_scope=aws.eks.AccessPolicyAssociationAccessScopeArgs(
                        namespaces=["default", "application"], type="namespace"
                    ),
                )
            },
        )
    },
)

##########################
###     EKS Addons     ###
##########################

coredns = eks.Addon(
    f"{project_name}-cluster3-coredns",
    cluster=cluster3,
    addon_name="coredns",
    addon_version="v1.11.1-eksbuild.9",
    resolve_conflicts_on_update="PRESERVE",
    configuration_values={
        "replicaCount": 4,
        "resources": {
            "limits": {
                "cpu": "100m",
                "memory": "150Mi",
            },
            "requests": {
                "cpu": "100m",
                "memory": "150Mi",
            },
        },
    },
)


# Export the clusters' kubeconfig.
pulumi.export("kubeconfig1", cluster1.kubeconfig)
pulumi.export("kubeconfig2", cluster2.kubeconfig)
pulumi.export("kubeconfig3", cluster3.kubeconfig)
