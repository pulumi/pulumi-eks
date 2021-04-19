# coding=utf-8
# *** WARNING: this file was generated by pulumi-gen-eks. ***
# *** Do not edit by hand unless you're certain you know what you are doing! ***

import warnings
import pulumi
import pulumi.runtime
from typing import Any, Mapping, Optional, Sequence, Union, overload
from . import _utilities
from ._inputs import *
from .vpc_cni import VpcCni
import pulumi_aws
import pulumi_kubernetes

__all__ = ['ManagedNodeGroupArgs', 'ManagedNodeGroup']

@pulumi.input_type
class ManagedNodeGroupArgs:
    def __init__(__self__, *,
                 cluster: pulumi.Input['CoreDataArgs'],
                 ami_type: Optional[pulumi.Input[str]] = None,
                 cluster_name: Optional[pulumi.Input[str]] = None,
                 disk_size: Optional[pulumi.Input[int]] = None,
                 force_update_version: Optional[pulumi.Input[bool]] = None,
                 instance_types: Optional[pulumi.Input[Sequence[pulumi.Input[str]]]] = None,
                 labels: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 launch_template: Optional[pulumi.Input['pulumi_aws.eks.NodeGroupLaunchTemplate']] = None,
                 node_group_name: Optional[pulumi.Input[str]] = None,
                 node_role: Optional[pulumi.Input['pulumi_aws.iam.Role']] = None,
                 node_role_arn: Optional[pulumi.Input[str]] = None,
                 release_version: Optional[pulumi.Input[str]] = None,
                 remote_access: Optional[pulumi.Input['pulumi_aws.eks.NodeGroupRemoteAccess']] = None,
                 scaling_config: Optional[pulumi.Input['pulumi_aws.eks.NodeGroupScalingConfig']] = None,
                 subnet_ids: Optional[pulumi.Input[Sequence[pulumi.Input[str]]]] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 version: Optional[pulumi.Input[str]] = None):
        """
        The set of arguments for constructing a ManagedNodeGroup resource.
        :param pulumi.Input['CoreDataArgs'] cluster: The target EKS cluster.
        :param pulumi.Input[str] ami_type: Type of Amazon Machine Image (AMI) associated with the EKS Node Group. Defaults to `AL2_x86_64`. Valid values: `AL2_x86_64`, `AL2_x86_64_GPU`, `AL2_ARM_64`. This provider will only perform drift detection if a configuration value is provided.
        :param pulumi.Input[str] cluster_name: Name of the EKS Cluster.
        :param pulumi.Input[int] disk_size: Disk size in GiB for worker nodes. Defaults to `20`. This provider will only perform drift detection if a configuration value is provided.
        :param pulumi.Input[bool] force_update_version: Force version update if existing pods are unable to be drained due to a pod disruption budget issue.
        :param pulumi.Input[Sequence[pulumi.Input[str]]] instance_types: Set of instance types associated with the EKS Node Group. Defaults to `["t3.medium"]`. This provider will only perform drift detection if a configuration value is provided. Currently, the EKS API only accepts a single value in the set.
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] labels: Key-value map of Kubernetes labels. Only labels that are applied with the EKS API are managed by this argument. Other Kubernetes labels applied to the EKS Node Group will not be managed.
        :param pulumi.Input['pulumi_aws.eks.NodeGroupLaunchTemplate'] launch_template: Launch Template settings.
        :param pulumi.Input[str] node_group_name: Name of the EKS Node Group.
        :param pulumi.Input['pulumi_aws.iam.Role'] node_role: The IAM Role that provides permissions for the EKS Node Group.
               
               Note, `nodeRole` and `nodeRoleArn` are mutually exclusive, and a single option must be used.
        :param pulumi.Input[str] node_role_arn: Amazon Resource Name (ARN) of the IAM Role that provides permissions for the EKS Node Group.
               
               Note, `nodeRoleArn` and `nodeRole` are mutually exclusive, and a single option must be used.
        :param pulumi.Input[str] release_version: AMI version of the EKS Node Group. Defaults to latest version for Kubernetes version.
        :param pulumi.Input['pulumi_aws.eks.NodeGroupRemoteAccess'] remote_access: Remote access settings.
        :param pulumi.Input['pulumi_aws.eks.NodeGroupScalingConfig'] scaling_config: Scaling settings.
               
               Default scaling amounts of the node group autoscaling group are:
                 - desiredSize: 2
                 - minSize: 1
                 - maxSize: 2
        :param pulumi.Input[Sequence[pulumi.Input[str]]] subnet_ids: Identifiers of EC2 Subnets to associate with the EKS Node Group. These subnets must have the following resource tag: `kubernetes.io/cluster/CLUSTER_NAME` (where `CLUSTER_NAME` is replaced with the name of the EKS Cluster).
               
               Default subnetIds is chosen from the following list, in order, if subnetIds arg is not set:
                 - core.subnetIds
                 - core.privateIds
                 - core.publicSublicSubnetIds
               
               This default logic is based on the existing subnet IDs logic of this package: https://git.io/JeM11
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] tags: Key-value mapping of resource tags.
        """
        pulumi.set(__self__, "cluster", cluster)
        if ami_type is not None:
            pulumi.set(__self__, "ami_type", ami_type)
        if cluster_name is not None:
            pulumi.set(__self__, "cluster_name", cluster_name)
        if disk_size is not None:
            pulumi.set(__self__, "disk_size", disk_size)
        if force_update_version is not None:
            pulumi.set(__self__, "force_update_version", force_update_version)
        if instance_types is not None:
            pulumi.set(__self__, "instance_types", instance_types)
        if labels is not None:
            pulumi.set(__self__, "labels", labels)
        if launch_template is not None:
            pulumi.set(__self__, "launch_template", launch_template)
        if node_group_name is not None:
            pulumi.set(__self__, "node_group_name", node_group_name)
        if node_role is not None:
            pulumi.set(__self__, "node_role", node_role)
        if node_role_arn is not None:
            pulumi.set(__self__, "node_role_arn", node_role_arn)
        if release_version is not None:
            pulumi.set(__self__, "release_version", release_version)
        if remote_access is not None:
            pulumi.set(__self__, "remote_access", remote_access)
        if scaling_config is not None:
            pulumi.set(__self__, "scaling_config", scaling_config)
        if subnet_ids is not None:
            pulumi.set(__self__, "subnet_ids", subnet_ids)
        if tags is not None:
            pulumi.set(__self__, "tags", tags)
        if version is not None:
            pulumi.set(__self__, "version", version)

    @property
    @pulumi.getter
    def cluster(self) -> pulumi.Input['CoreDataArgs']:
        """
        The target EKS cluster.
        """
        return pulumi.get(self, "cluster")

    @cluster.setter
    def cluster(self, value: pulumi.Input['CoreDataArgs']):
        pulumi.set(self, "cluster", value)

    @property
    @pulumi.getter(name="amiType")
    def ami_type(self) -> Optional[pulumi.Input[str]]:
        """
        Type of Amazon Machine Image (AMI) associated with the EKS Node Group. Defaults to `AL2_x86_64`. Valid values: `AL2_x86_64`, `AL2_x86_64_GPU`, `AL2_ARM_64`. This provider will only perform drift detection if a configuration value is provided.
        """
        return pulumi.get(self, "ami_type")

    @ami_type.setter
    def ami_type(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "ami_type", value)

    @property
    @pulumi.getter(name="clusterName")
    def cluster_name(self) -> Optional[pulumi.Input[str]]:
        """
        Name of the EKS Cluster.
        """
        return pulumi.get(self, "cluster_name")

    @cluster_name.setter
    def cluster_name(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "cluster_name", value)

    @property
    @pulumi.getter(name="diskSize")
    def disk_size(self) -> Optional[pulumi.Input[int]]:
        """
        Disk size in GiB for worker nodes. Defaults to `20`. This provider will only perform drift detection if a configuration value is provided.
        """
        return pulumi.get(self, "disk_size")

    @disk_size.setter
    def disk_size(self, value: Optional[pulumi.Input[int]]):
        pulumi.set(self, "disk_size", value)

    @property
    @pulumi.getter(name="forceUpdateVersion")
    def force_update_version(self) -> Optional[pulumi.Input[bool]]:
        """
        Force version update if existing pods are unable to be drained due to a pod disruption budget issue.
        """
        return pulumi.get(self, "force_update_version")

    @force_update_version.setter
    def force_update_version(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "force_update_version", value)

    @property
    @pulumi.getter(name="instanceTypes")
    def instance_types(self) -> Optional[pulumi.Input[Sequence[pulumi.Input[str]]]]:
        """
        Set of instance types associated with the EKS Node Group. Defaults to `["t3.medium"]`. This provider will only perform drift detection if a configuration value is provided. Currently, the EKS API only accepts a single value in the set.
        """
        return pulumi.get(self, "instance_types")

    @instance_types.setter
    def instance_types(self, value: Optional[pulumi.Input[Sequence[pulumi.Input[str]]]]):
        pulumi.set(self, "instance_types", value)

    @property
    @pulumi.getter
    def labels(self) -> Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]]:
        """
        Key-value map of Kubernetes labels. Only labels that are applied with the EKS API are managed by this argument. Other Kubernetes labels applied to the EKS Node Group will not be managed.
        """
        return pulumi.get(self, "labels")

    @labels.setter
    def labels(self, value: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]]):
        pulumi.set(self, "labels", value)

    @property
    @pulumi.getter(name="launchTemplate")
    def launch_template(self) -> Optional[pulumi.Input['pulumi_aws.eks.NodeGroupLaunchTemplate']]:
        """
        Launch Template settings.
        """
        return pulumi.get(self, "launch_template")

    @launch_template.setter
    def launch_template(self, value: Optional[pulumi.Input['pulumi_aws.eks.NodeGroupLaunchTemplate']]):
        pulumi.set(self, "launch_template", value)

    @property
    @pulumi.getter(name="nodeGroupName")
    def node_group_name(self) -> Optional[pulumi.Input[str]]:
        """
        Name of the EKS Node Group.
        """
        return pulumi.get(self, "node_group_name")

    @node_group_name.setter
    def node_group_name(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "node_group_name", value)

    @property
    @pulumi.getter(name="nodeRole")
    def node_role(self) -> Optional[pulumi.Input['pulumi_aws.iam.Role']]:
        """
        The IAM Role that provides permissions for the EKS Node Group.

        Note, `nodeRole` and `nodeRoleArn` are mutually exclusive, and a single option must be used.
        """
        return pulumi.get(self, "node_role")

    @node_role.setter
    def node_role(self, value: Optional[pulumi.Input['pulumi_aws.iam.Role']]):
        pulumi.set(self, "node_role", value)

    @property
    @pulumi.getter(name="nodeRoleArn")
    def node_role_arn(self) -> Optional[pulumi.Input[str]]:
        """
        Amazon Resource Name (ARN) of the IAM Role that provides permissions for the EKS Node Group.

        Note, `nodeRoleArn` and `nodeRole` are mutually exclusive, and a single option must be used.
        """
        return pulumi.get(self, "node_role_arn")

    @node_role_arn.setter
    def node_role_arn(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "node_role_arn", value)

    @property
    @pulumi.getter(name="releaseVersion")
    def release_version(self) -> Optional[pulumi.Input[str]]:
        """
        AMI version of the EKS Node Group. Defaults to latest version for Kubernetes version.
        """
        return pulumi.get(self, "release_version")

    @release_version.setter
    def release_version(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "release_version", value)

    @property
    @pulumi.getter(name="remoteAccess")
    def remote_access(self) -> Optional[pulumi.Input['pulumi_aws.eks.NodeGroupRemoteAccess']]:
        """
        Remote access settings.
        """
        return pulumi.get(self, "remote_access")

    @remote_access.setter
    def remote_access(self, value: Optional[pulumi.Input['pulumi_aws.eks.NodeGroupRemoteAccess']]):
        pulumi.set(self, "remote_access", value)

    @property
    @pulumi.getter(name="scalingConfig")
    def scaling_config(self) -> Optional[pulumi.Input['pulumi_aws.eks.NodeGroupScalingConfig']]:
        """
        Scaling settings.

        Default scaling amounts of the node group autoscaling group are:
          - desiredSize: 2
          - minSize: 1
          - maxSize: 2
        """
        return pulumi.get(self, "scaling_config")

    @scaling_config.setter
    def scaling_config(self, value: Optional[pulumi.Input['pulumi_aws.eks.NodeGroupScalingConfig']]):
        pulumi.set(self, "scaling_config", value)

    @property
    @pulumi.getter(name="subnetIds")
    def subnet_ids(self) -> Optional[pulumi.Input[Sequence[pulumi.Input[str]]]]:
        """
        Identifiers of EC2 Subnets to associate with the EKS Node Group. These subnets must have the following resource tag: `kubernetes.io/cluster/CLUSTER_NAME` (where `CLUSTER_NAME` is replaced with the name of the EKS Cluster).

        Default subnetIds is chosen from the following list, in order, if subnetIds arg is not set:
          - core.subnetIds
          - core.privateIds
          - core.publicSublicSubnetIds

        This default logic is based on the existing subnet IDs logic of this package: https://git.io/JeM11
        """
        return pulumi.get(self, "subnet_ids")

    @subnet_ids.setter
    def subnet_ids(self, value: Optional[pulumi.Input[Sequence[pulumi.Input[str]]]]):
        pulumi.set(self, "subnet_ids", value)

    @property
    @pulumi.getter
    def tags(self) -> Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]]:
        """
        Key-value mapping of resource tags.
        """
        return pulumi.get(self, "tags")

    @tags.setter
    def tags(self, value: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]]):
        pulumi.set(self, "tags", value)

    @property
    @pulumi.getter
    def version(self) -> Optional[pulumi.Input[str]]:
        return pulumi.get(self, "version")

    @version.setter
    def version(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "version", value)


class ManagedNodeGroup(pulumi.ComponentResource):
    @overload
    def __init__(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 ami_type: Optional[pulumi.Input[str]] = None,
                 cluster: Optional[pulumi.Input[pulumi.InputType['CoreDataArgs']]] = None,
                 cluster_name: Optional[pulumi.Input[str]] = None,
                 disk_size: Optional[pulumi.Input[int]] = None,
                 force_update_version: Optional[pulumi.Input[bool]] = None,
                 instance_types: Optional[pulumi.Input[Sequence[pulumi.Input[str]]]] = None,
                 labels: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 launch_template: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.eks.NodeGroupLaunchTemplate']]] = None,
                 node_group_name: Optional[pulumi.Input[str]] = None,
                 node_role: Optional[pulumi.Input['pulumi_aws.iam.Role']] = None,
                 node_role_arn: Optional[pulumi.Input[str]] = None,
                 release_version: Optional[pulumi.Input[str]] = None,
                 remote_access: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.eks.NodeGroupRemoteAccess']]] = None,
                 scaling_config: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.eks.NodeGroupScalingConfig']]] = None,
                 subnet_ids: Optional[pulumi.Input[Sequence[pulumi.Input[str]]]] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 version: Optional[pulumi.Input[str]] = None,
                 __props__=None):
        """
        ManagedNodeGroup is a component that wraps creating an AWS managed node group.

        See for more details:
        https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html

        :param str resource_name: The name of the resource.
        :param pulumi.ResourceOptions opts: Options for the resource.
        :param pulumi.Input[str] ami_type: Type of Amazon Machine Image (AMI) associated with the EKS Node Group. Defaults to `AL2_x86_64`. Valid values: `AL2_x86_64`, `AL2_x86_64_GPU`, `AL2_ARM_64`. This provider will only perform drift detection if a configuration value is provided.
        :param pulumi.Input[pulumi.InputType['CoreDataArgs']] cluster: The target EKS cluster.
        :param pulumi.Input[str] cluster_name: Name of the EKS Cluster.
        :param pulumi.Input[int] disk_size: Disk size in GiB for worker nodes. Defaults to `20`. This provider will only perform drift detection if a configuration value is provided.
        :param pulumi.Input[bool] force_update_version: Force version update if existing pods are unable to be drained due to a pod disruption budget issue.
        :param pulumi.Input[Sequence[pulumi.Input[str]]] instance_types: Set of instance types associated with the EKS Node Group. Defaults to `["t3.medium"]`. This provider will only perform drift detection if a configuration value is provided. Currently, the EKS API only accepts a single value in the set.
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] labels: Key-value map of Kubernetes labels. Only labels that are applied with the EKS API are managed by this argument. Other Kubernetes labels applied to the EKS Node Group will not be managed.
        :param pulumi.Input[pulumi.InputType['pulumi_aws.eks.NodeGroupLaunchTemplate']] launch_template: Launch Template settings.
        :param pulumi.Input[str] node_group_name: Name of the EKS Node Group.
        :param pulumi.Input['pulumi_aws.iam.Role'] node_role: The IAM Role that provides permissions for the EKS Node Group.
               
               Note, `nodeRole` and `nodeRoleArn` are mutually exclusive, and a single option must be used.
        :param pulumi.Input[str] node_role_arn: Amazon Resource Name (ARN) of the IAM Role that provides permissions for the EKS Node Group.
               
               Note, `nodeRoleArn` and `nodeRole` are mutually exclusive, and a single option must be used.
        :param pulumi.Input[str] release_version: AMI version of the EKS Node Group. Defaults to latest version for Kubernetes version.
        :param pulumi.Input[pulumi.InputType['pulumi_aws.eks.NodeGroupRemoteAccess']] remote_access: Remote access settings.
        :param pulumi.Input[pulumi.InputType['pulumi_aws.eks.NodeGroupScalingConfig']] scaling_config: Scaling settings.
               
               Default scaling amounts of the node group autoscaling group are:
                 - desiredSize: 2
                 - minSize: 1
                 - maxSize: 2
        :param pulumi.Input[Sequence[pulumi.Input[str]]] subnet_ids: Identifiers of EC2 Subnets to associate with the EKS Node Group. These subnets must have the following resource tag: `kubernetes.io/cluster/CLUSTER_NAME` (where `CLUSTER_NAME` is replaced with the name of the EKS Cluster).
               
               Default subnetIds is chosen from the following list, in order, if subnetIds arg is not set:
                 - core.subnetIds
                 - core.privateIds
                 - core.publicSublicSubnetIds
               
               This default logic is based on the existing subnet IDs logic of this package: https://git.io/JeM11
        :param pulumi.Input[Mapping[str, pulumi.Input[str]]] tags: Key-value mapping of resource tags.
        """
        ...
    @overload
    def __init__(__self__,
                 resource_name: str,
                 args: ManagedNodeGroupArgs,
                 opts: Optional[pulumi.ResourceOptions] = None):
        """
        ManagedNodeGroup is a component that wraps creating an AWS managed node group.

        See for more details:
        https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html

        :param str resource_name: The name of the resource.
        :param ManagedNodeGroupArgs args: The arguments to use to populate this resource's properties.
        :param pulumi.ResourceOptions opts: Options for the resource.
        """
        ...
    def __init__(__self__, resource_name: str, *args, **kwargs):
        resource_args, opts = _utilities.get_resource_args_opts(ManagedNodeGroupArgs, pulumi.ResourceOptions, *args, **kwargs)
        if resource_args is not None:
            __self__._internal_init(resource_name, opts, **resource_args.__dict__)
        else:
            __self__._internal_init(resource_name, *args, **kwargs)

    def _internal_init(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 ami_type: Optional[pulumi.Input[str]] = None,
                 cluster: Optional[pulumi.Input[pulumi.InputType['CoreDataArgs']]] = None,
                 cluster_name: Optional[pulumi.Input[str]] = None,
                 disk_size: Optional[pulumi.Input[int]] = None,
                 force_update_version: Optional[pulumi.Input[bool]] = None,
                 instance_types: Optional[pulumi.Input[Sequence[pulumi.Input[str]]]] = None,
                 labels: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 launch_template: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.eks.NodeGroupLaunchTemplate']]] = None,
                 node_group_name: Optional[pulumi.Input[str]] = None,
                 node_role: Optional[pulumi.Input['pulumi_aws.iam.Role']] = None,
                 node_role_arn: Optional[pulumi.Input[str]] = None,
                 release_version: Optional[pulumi.Input[str]] = None,
                 remote_access: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.eks.NodeGroupRemoteAccess']]] = None,
                 scaling_config: Optional[pulumi.Input[pulumi.InputType['pulumi_aws.eks.NodeGroupScalingConfig']]] = None,
                 subnet_ids: Optional[pulumi.Input[Sequence[pulumi.Input[str]]]] = None,
                 tags: Optional[pulumi.Input[Mapping[str, pulumi.Input[str]]]] = None,
                 version: Optional[pulumi.Input[str]] = None,
                 __props__=None):
        if opts is None:
            opts = pulumi.ResourceOptions()
        if not isinstance(opts, pulumi.ResourceOptions):
            raise TypeError('Expected resource options to be a ResourceOptions instance')
        if opts.version is None:
            opts.version = _utilities.get_version()
        if opts.id is not None:
            raise ValueError('ComponentResource classes do not support opts.id')
        else:
            if __props__ is not None:
                raise TypeError('__props__ is only valid when passed in combination with a valid opts.id to get an existing resource')
            __props__ = ManagedNodeGroupArgs.__new__(ManagedNodeGroupArgs)

            __props__.__dict__["ami_type"] = ami_type
            if cluster is None and not opts.urn:
                raise TypeError("Missing required property 'cluster'")
            __props__.__dict__["cluster"] = cluster
            __props__.__dict__["cluster_name"] = cluster_name
            __props__.__dict__["disk_size"] = disk_size
            __props__.__dict__["force_update_version"] = force_update_version
            __props__.__dict__["instance_types"] = instance_types
            __props__.__dict__["labels"] = labels
            __props__.__dict__["launch_template"] = launch_template
            __props__.__dict__["node_group_name"] = node_group_name
            __props__.__dict__["node_role"] = node_role
            __props__.__dict__["node_role_arn"] = node_role_arn
            __props__.__dict__["release_version"] = release_version
            __props__.__dict__["remote_access"] = remote_access
            __props__.__dict__["scaling_config"] = scaling_config
            __props__.__dict__["subnet_ids"] = subnet_ids
            __props__.__dict__["tags"] = tags
            __props__.__dict__["version"] = version
            __props__.__dict__["node_group"] = None
        super(ManagedNodeGroup, __self__).__init__(
            'eks:index:ManagedNodeGroup',
            resource_name,
            __props__,
            opts,
            remote=True)

    @property
    @pulumi.getter(name="nodeGroup")
    def node_group(self) -> pulumi.Output['pulumi_aws.eks.NodeGroup']:
        """
        The AWS managed node group.
        """
        return pulumi.get(self, "node_group")

