# coding=utf-8
# *** WARNING: this file was generated by pulumi-gen-eks. ***
# *** Do not edit by hand unless you're certain you know what you are doing! ***

from enum import Enum

__all__ = [
    'AccessEntryType',
    'AmiType',
    'AuthenticationMode',
    'ClusterNodePools',
    'OperatingSystem',
    'ResolveConflictsOnCreate',
    'ResolveConflictsOnUpdate',
]


class AccessEntryType(str, Enum):
    """
    The type of the new access entry. Valid values are STANDARD, FARGATE_LINUX, EC2_LINUX, and EC2_WINDOWS.
    Defaults to STANDARD which provides the standard workflow. EC2_LINUX and EC2_WINDOWS types disallow users to input a kubernetesGroup, and prevent associating access policies.
    """
    STANDARD = "STANDARD"
    """
    Standard Access Entry Workflow. Allows users to input a username and kubernetesGroup, and to associate access policies.
    """
    FARGATE_LINUX = "FARGATE_LINUX"
    """
    For IAM roles used with AWS Fargate profiles.
    """
    EC2_LINUX = "EC2_LINUX"
    """
    For IAM roles associated with self-managed Linux node groups. Allows the nodes to join the cluster.
    """
    EC2_WINDOWS = "EC2_WINDOWS"
    """
    For IAM roles associated with self-managed Windows node groups. Allows the nodes to join the cluster.
    """
    EC2 = "EC2"
    """
    For IAM roles associated with EC2 instances that need access policies. Allows the nodes to join the cluster.
    """


class AmiType(str, Enum):
    """
    Predefined AMI types for EKS optimized AMIs. Can be used to select the latest EKS optimized AMI for a node group.
    """
    AL2_X86_64 = "AL2_x86_64"
    AL2_X86_64_GPU = "AL2_x86_64_GPU"
    AL2_ARM64 = "AL2_ARM_64"
    AL2023_X86_64_STANDARD = "AL2023_x86_64_STANDARD"
    AL2023_ARM64_STANDARD = "AL2023_ARM_64_STANDARD"
    AL2023_X86_64_NVIDIA = "AL2023_x86_64_NVIDIA"
    BOTTLEROCKET_ARM64 = "BOTTLEROCKET_ARM_64"
    BOTTLEROCKET_X86_64 = "BOTTLEROCKET_x86_64"
    BOTTLEROCKET_ARM64_NVIDIA = "BOTTLEROCKET_ARM_64_NVIDIA"
    BOTTLEROCKET_X86_64_NVIDIA = "BOTTLEROCKET_x86_64_NVIDIA"


class AuthenticationMode(str, Enum):
    """
    The authentication mode of the cluster. Valid values are `CONFIG_MAP`, `API` or `API_AND_CONFIG_MAP`.

    See for more details:
    https://docs.aws.amazon.com/eks/latest/userguide/grant-k8s-access.html#set-cam
    """
    CONFIG_MAP = "CONFIG_MAP"
    """
    Only aws-auth ConfigMap will be used for authenticating to the Kubernetes API.
    """
    API = "API"
    """
    Only Access Entries will be used for authenticating to the Kubernetes API.
    """
    API_AND_CONFIG_MAP = "API_AND_CONFIG_MAP"
    """
    Both aws-auth ConfigMap and Access Entries can be used for authenticating to the Kubernetes API.
    """


class ClusterNodePools(str, Enum):
    """
    Built-in node pools of EKS Auto Mode. For more details see: https://docs.aws.amazon.com/eks/latest/userguide/set-builtin-node-pools.html
    """
    SYSTEM = "system"
    """
    This NodePool has a `CriticalAddonsOnly` taint. Many EKS addons, such as CoreDNS, tolerate this taint. Use this system node pool to segregate cluster-critical applications. Supports both `amd64` and `arm64` architectures.
    """
    GENERAL_PURPOSE = "general-purpose"
    """
    This NodePool provides support for launching nodes for general purpose workloads in your cluster. Only supports `amd64` architecture.
    """


class OperatingSystem(str, Enum):
    """
    The type of EKS optimized Operating System to use for node groups.

    See for more details:
    https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-amis.html
    """
    AL2 = "AL2"
    """
    EKS optimized OS based on Amazon Linux 2 (AL2).
    """
    AL2023 = "AL2023"
    """
    EKS optimized OS based on Amazon Linux 2023 (AL2023).
    See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
    """
    BOTTLEROCKET = "Bottlerocket"
    """
    EKS optimized Container OS based on Bottlerocket.
    See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami-bottlerocket.html
    """
    RECOMMENDED = "AL2023"
    """
    The recommended EKS optimized OS. Currently Amazon Linux 2023 (AL2023).
    This will be kept up to date with AWS' recommendations for EKS optimized operating systems.

    See for more details: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
    """


class ResolveConflictsOnCreate(str, Enum):
    """
    How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on. Valid values are `NONE` and `OVERWRITE`. For more details see the [CreateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html) API Docs.
    """
    NONE = "NONE"
    """
    If the self-managed version of the add-on is installed on your cluster, Amazon EKS doesn't change the value. Creation of the add-on might fail.
    """
    OVERWRITE = "OVERWRITE"
    """
    If the self-managed version of the add-on is installed on your cluster and the Amazon EKS default value is different than the existing value, Amazon EKS changes the value to the Amazon EKS default value.
    """


class ResolveConflictsOnUpdate(str, Enum):
    """
    How to resolve field value conflicts for an Amazon EKS add-on if you've changed a value from the Amazon EKS default value. Valid values are `NONE`, `OVERWRITE`, and `PRESERVE`. For more details see the [UpdateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_UpdateAddon.html) API Docs.
    """
    NONE = "NONE"
    """
    Amazon EKS doesn't change the value. The update might fail.
    """
    OVERWRITE = "OVERWRITE"
    """
    Amazon EKS overwrites the changed value back to the Amazon EKS default value.
    """
    PRESERVE = "PRESERVE"
    """
    Amazon EKS preserves the value. If you choose this option, we recommend that you test any field and value changes on a non-production cluster before updating the add-on on your production cluster.
    """
