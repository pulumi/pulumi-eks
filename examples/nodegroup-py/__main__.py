import json

import pulumi
import pulumi_aws as aws
import pulumi_kubernetes as k8s
import pulumi_eks as eks

import iam

# IAM roles for the node groups.
role0 = iam.create_role("example-role0-py")

instance_profile0 = aws.iam.InstanceProfile(
    "example-instanceProfile0-py", role=role0.name
)

# Create an EKS cluster with a shared IAM instance role to register with the
# cluster auth.
cluster1 = eks.Cluster(
    "example-nodegroup-iam-simple-py",
    skip_default_node_group=True,
    instance_roles=[role0],
)

eks.NodeGroup(
    "example-ng-simple-ondemand-py",
    cluster=cluster1,
    instance_type="t3.medium",
    desired_capacity=1,
    min_size=1,
    max_size=2,
    labels={"ondemand": "true"},
    instance_profile=instance_profile0,
)

eks.NodeGroupV2(
    "example-ng2-simple-ondemand-py",
    cluster=cluster1,
    instance_type="t3.medium",
    desired_capacity=1,
    min_size=1,
    max_size=2,
    labels={"ondemand": "true"},
    instance_profile=instance_profile0,
)

cluster1_provider = k8s.Provider(
    "cluster1-provider",
    kubeconfig=cluster1.kubeconfig_json,
)

# Create the second node group with spot t3.medium instance
eks.NodeGroup(
    "example-ng-simple-spot-py",
    cluster=cluster1,
    instance_type="t3.medium",
    desired_capacity=1,
    min_size=1,
    max_size=2,
    spot_price="1",
    labels={"preemptible": "true"},
    taints={"special": eks.TaintArgs(value="true", effect="NoSchedule")},
    kubelet_extra_args="--alsologtostderr",
    instance_profile=instance_profile0,
    opts=pulumi.ResourceOptions(providers={"kubernetes": cluster1_provider}),
)

eks.NodeGroupV2(
    "example-ng2-launchtemplate-tags-py",
    cluster=cluster1,
    instance_type="t3.medium",
    desired_capacity=1,
    min_size=1,
    max_size=2,
    labels={"ondemand": "true"},
    instance_profile=instance_profile0,
    launch_template_tag_specifications=[
        aws.ec2.LaunchTemplateTagSpecificationArgs(
            resource_type="instance",
            tags={"foo": "bar"},
        ),
        aws.ec2.LaunchTemplateTagSpecificationArgs(
            resource_type="volume",
            tags={"foo2": "bar2"},
        ),
    ],
)

# Export the cluster's kubeconfig.
pulumi.export("kubeconfig1", cluster1.kubeconfig)

role1 = iam.create_role("example-role1-py")
role2 = iam.create_role("example-role2-py")
role3 = iam.create_role("example-role3-py")

instance_profile1 = aws.iam.InstanceProfile(
    "example-instanceProfile1-py", role=role1.name
)
instance_profile2 = aws.iam.InstanceProfile(
    "example-instanceProfile2-py", role=role2.name
)
instance_profile3 = aws.iam.InstanceProfile(
    "example-instanceProfile3-py", role=role3.name
)

# Create an EKS cluster with many IAM roles to register with the cluster auth.
cluster2 = eks.Cluster(
    "example-nodegroup-iam-advanced-py",
    skip_default_node_group=True,
    instance_roles=[role1, role2, role3],
)

eks.NodeGroup(
    "example-ng-advanced-ondemand-py",
    cluster=cluster2,
    instance_type="t3.medium",
    desired_capacity=1,
    min_size=1,
    max_size=2,
    labels={"ondemand": "true"},
    instance_profile=instance_profile1,
)

eks.NodeGroupV2(
    "example-ng2-advanced-ondemand-py",
    cluster=cluster2,
    instance_type="t3.medium",
    desired_capacity=1,
    min_size=1,
    max_size=2,
    labels={"ondemand": "true"},
    instance_profile=instance_profile2,
)

cluster2_provider = k8s.Provider(
    "cluster2-provider",
    kubeconfig=cluster2.kubeconfig_json,
)

eks.NodeGroup(
    "example-ng-advanced-spot-py",
    cluster=cluster2,
    instance_type="t3.medium",
    desired_capacity=1,
    min_size=1,
    max_size=2,
    spot_price="1",
    labels={"preemptible": "true"},
    taints={"special": eks.TaintArgs(value="true", effect="NoSchedule")},
    instance_profile=instance_profile3,
    opts=pulumi.ResourceOptions(providers={"kubernetes": cluster2_provider}),
)

eks.NodeGroup(
    "example-ng-advanced-spot-gp3-py",
    cluster=cluster2,
    instance_type="t3.medium",
    desired_capacity=1,
    min_size=1,
    max_size=2,
    node_root_volume_type="gp3",
    spot_price="1",
    labels={"preemptible": "true"},
    taints={"special": eks.TaintArgs(value="true", effect="NoSchedule")},
    instance_profile=instance_profile3,
    opts=pulumi.ResourceOptions(providers={"kubernetes": cluster2_provider}),
)

# Export the cluster's kubeconfig.
pulumi.export("kubeconfig2", cluster2.kubeconfig)
