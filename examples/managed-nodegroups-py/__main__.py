import pulumi
import pulumi_aws as aws
import pulumi_eks as eks

import iam

# IAM roles for the node groups.
role0 = iam.create_role("example-role0")
role1 = iam.create_role("example-role1")
role2 = iam.create_role("example-role2")

# Create an EKS cluster.
cluster = eks.Cluster("example-managed-nodegroups",
                      skip_default_node_group=True,
                      instance_roles=[role0, role1, role2])

# Export the cluster's kubeconfig.
pulumi.export("kubeconfig", cluster.kubeconfig)

# Create a simple AWS managed node group using a cluster as input and the
# refactored API.
managed_node_group0 = eks.ManagedNodeGroup("example-managed-ng0",
                                           cluster=cluster.core, # TODO[pulumi/pulumi-eks#483]: Pass cluster directly.
                                           node_role=role0)

# Create a simple AWS managed node group using a cluster as input and the
# initial API.
managed_node_group1 = eks.ManagedNodeGroup("example-managed-ng1",
                                           cluster=cluster.core, # TODO[pulumi/pulumi-eks#483]: Pass cluster directly.
                                           node_group_name="aws-managed-ng1",
                                           node_role_arn=role1.arn,
                                           opts=pulumi.ResourceOptions(parent=cluster))

# Create an explicit AWS managed node group using a cluster as input and the
# initial API.
managed_node_group2 = eks.ManagedNodeGroup("example-managed-ng2",
                                           cluster=cluster.core, # TODO[pulumi/pulumi-eks#483]: Pass cluster directly.
                                           node_group_name="aws-managed-ng2",
                                           node_role_arn=role2.arn,
                                        # TODO[pulumi/pulumi#5819]: Add this back when it's available in the schema.
                                        #  scaling_config=eks.ManagedNodeGroupScalingConfigArgs(
                                        #      desired_size=1,
                                        #      min_size=1,
                                        #      max_size=2,
                                        #  ),
                                           disk_size=20,
                                           instance_types=["t2.medium"],
                                           labels={"ondemand": "true"},
                                           tags={"org": "pulumi"},
                                           opts=pulumi.ResourceOptions(parent=cluster))
