import pulumi
import pulumi_aws as aws
import pulumi_awsx as awsx
import pulumi_eks as eks

import iam


project_name = pulumi.get_project()

# IAM roles for the node groups.
role = iam.create_role(project_name)

vpc = awsx.ec2.Vpc(project_name,
    tags={"Name": project_name}
)

cluster = eks.Cluster(project_name,
                          vpc_id=vpc.vpc_id,
                          public_subnet_ids=vpc.public_subnet_ids,
                          private_subnet_ids=vpc.private_subnet_ids,
                          skip_default_node_group=True,
                          use_default_vpc_cni=True,
                          authentication_mode=eks.AuthenticationMode.API,
                            access_entries={
                                f'{project_name}-role': eks.AccessEntryArgs(
                                    principal_arn=role.arn, type=eks.AccessEntryType.EC2_LINUX
                                )
                            })


# Export the cluster's kubeconfig.
pulumi.export("kubeconfig", cluster.kubeconfig)

scaling_config = aws.eks.NodeGroupScalingConfigArgs(
    desired_size=1,
    min_size=1,
    max_size=1,
)


mng_al2023 = eks.ManagedNodeGroup(f'{project_name}-al2023',
                                           cluster=cluster,
                                           node_role=role,
                                           instance_types=["t3.medium"],
                                           scaling_config=scaling_config,
                                           operating_system=eks.OperatingSystem.AL2023)

mng_al2023_arm = eks.ManagedNodeGroup(f'{project_name}-al2023-arm',
                                           cluster=cluster,
                                           node_role=role,
                                           instance_types=["t4g.medium"],
                                           scaling_config=scaling_config,
                                           operating_system=eks.OperatingSystem.AL2023)

mng_al2023_userdata = eks.ManagedNodeGroup(f'{project_name}-al2023-userdata',
                                           cluster=cluster,
                                           node_role=role,
                                           instance_types=["t3.medium"],
                                           scaling_config=scaling_config,
                                           operating_system=eks.OperatingSystem.AL2023,
                                           kubelet_extra_args="--max-pods=100")

mng_al2023_arm_userdata = eks.ManagedNodeGroup(f'{project_name}-al2023-arm-userdata',
                                           cluster=cluster,
                                           node_role=role,
                                           instance_types=["t4g.medium"],
                                           scaling_config=scaling_config,
                                           operating_system=eks.OperatingSystem.AL2023,
                                           kubelet_extra_args="--max-pods=100")

mng_bottlerocket = eks.ManagedNodeGroup(f'{project_name}-bottlerocket',
                                           cluster=cluster,
                                           node_role=role,
                                           instance_types=["t3.medium"],
                                           scaling_config=scaling_config,
                                           operating_system=eks.OperatingSystem.BOTTLEROCKET)

mng_bottlerocket_arm = eks.ManagedNodeGroup(f'{project_name}-bottlerocket-arm',
                                           cluster=cluster,
                                           node_role=role,
                                           instance_types=["t4g.medium"],
                                           scaling_config=scaling_config,
                                           operating_system=eks.OperatingSystem.BOTTLEROCKET)

mng_bottlerocket_userdata = eks.ManagedNodeGroup(f'{project_name}-bottlerocket-userdata',
                                           cluster=cluster,
                                           node_role=role,
                                           instance_types=["t3.medium"],
                                           scaling_config=scaling_config,
                                           operating_system=eks.OperatingSystem.BOTTLEROCKET,
                                           bottlerocket_settings={ "settings": { "kubernetes": { "max-pods": 100 } } })
