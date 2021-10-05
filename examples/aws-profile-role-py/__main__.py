import json

import pulumi
import pulumi_aws as aws
import pulumi_eks as eks
import pulumi_kubernetes as k8s

from vpc import Vpc

project_name = pulumi.get_project()

# Create a new VPC.
vpc = Vpc(project_name)

# Create a new IAM role on the account caller to use as a cluster admin.
account_id = aws.get_caller_identity().account_id
assume_role_policy = json.dumps({
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "",
            "Effect": "Allow",
            "Principal": {
                "AWS": f"arn:aws:iam::{account_id}:root",
            },
            "Action": "sts:AssumeRole"
        }
    ]
})
cluster_admin_role = aws.iam.Role("clusterAdminRole",
    assume_role_policy=assume_role_policy,
    tags={
        "clusterAccess": "admin-usr"
    },
)

# Create an EKS cluster with a named profile. Map in the new IAM role into
# RBAC for usage after the cluster is running.
#
# Note, the role needs to be mapped into the cluster before it can be used.
# It is omitted from providerCredentialOpts as it will not have access
# to the cluster yet to write the aws-auth configmap for its own permissions.
# See example pod below to use the role once the cluster is ready.
cluster = eks.Cluster(project_name,
    vpc_id=vpc.vpc_id,
    public_subnet_ids=vpc.public_subnet_ids,
    provider_credential_opts=eks.KubeconfigOptionsArgs(
        profile_name=aws.config.profile,
    ),
    role_mappings=[
        eks.RoleMappingArgs(
            groups=["system:masters"],
            role_arn=cluster_admin_role.arn,
            username="pulumi:admin-usr",
        ),
    ]
)

# Export the cluster kubeconfig.
pulumi.export("kubeconfig", cluster.kubeconfig)

# Create a role-based kubeconfig with the named profile and the new
# role mapped into the cluster's RBAC.
role_kubeconfig = cluster.get_kubeconfig(
    profile_name=aws.config.profile,
    role_arn=cluster_admin_role.arn,
)
pulumi.export("roleKubeconfig", role_kubeconfig)
role_provider = k8s.Provider("provider",
    kubeconfig=role_kubeconfig,
    opts=pulumi.ResourceOptions(depends_on=[cluster.provider])
)

# Create a pod with the role-based kubeconfig.
pod = k8s.core.v1.Pod("nginx",
    spec=k8s.core.v1.PodSpecArgs(
        containers=[k8s.core.v1.ContainerArgs(
            name="nginx",
            image="nginx",
            ports=[k8s.core.v1.ContainerPortArgs(name="http", container_port=80)],
        )],
    ),
    opts=pulumi.ResourceOptions(provider=role_provider),
)
