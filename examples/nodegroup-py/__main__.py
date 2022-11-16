import pulumi
import pulumi_aws as aws
import pulumi_eks as eks

import iam

# IAM roles for the node groups.
role0 = iam.create_role("example-role0")

instance_profile0 = aws.iam.InstanceProfile("example-instanceProfile0", role=role0.name)

# Create an EKS cluster.
cluster = eks.Cluster(
    "example-managed-nodegroups", skip_default_node_group=True, instance_roles=[role0]
)

eks.NodeGroupV2(
    "example-ng2-simple-ondemand-py",
    cluster=cluster,
    instance_type="t2.medium",
    desired_capacity=1,
    min_size=1,
    max_size=2,
    labels={"ondemand": "true"},
    instance_profile=instance_profile0,
)
