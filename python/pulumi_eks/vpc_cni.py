# coding=utf-8
# *** WARNING: this file was generated by pulumi-gen-eks. ***
# *** Do not edit by hand unless you're certain you know what you are doing! ***

import warnings
import pulumi
import pulumi.runtime
from typing import Any, Mapping, Optional, Sequence, Union, overload
from . import _utilities

__all__ = ['VpcCniArgs', 'VpcCni']

@pulumi.input_type
class VpcCniArgs:
    def __init__(__self__, *,
                 kubeconfig: Any,
                 cni_configure_rpfilter: Optional[pulumi.Input[bool]] = None,
                 cni_custom_network_cfg: Optional[pulumi.Input[bool]] = None,
                 cni_external_snat: Optional[pulumi.Input[bool]] = None,
                 custom_network_config: Optional[pulumi.Input[bool]] = None,
                 disable_tcp_early_demux: Optional[pulumi.Input[bool]] = None,
                 enable_pod_eni: Optional[pulumi.Input[bool]] = None,
                 eni_config_label_def: Optional[pulumi.Input[str]] = None,
                 eni_mtu: Optional[pulumi.Input[int]] = None,
                 image: Optional[pulumi.Input[str]] = None,
                 init_image: Optional[pulumi.Input[str]] = None,
                 log_file: Optional[pulumi.Input[str]] = None,
                 log_level: Optional[pulumi.Input[str]] = None,
                 node_port_support: Optional[pulumi.Input[bool]] = None,
                 security_context_privileged: Optional[pulumi.Input[bool]] = None,
                 veth_prefix: Optional[pulumi.Input[str]] = None,
                 warm_eni_target: Optional[pulumi.Input[int]] = None,
                 warm_ip_target: Optional[pulumi.Input[int]] = None):
        """
        The set of arguments for constructing a VpcCni resource.
        :param Any kubeconfig: The kubeconfig to use when setting the VPC CNI options.
        :param pulumi.Input[bool] cni_configure_rpfilter: Specifies whether ipamd should configure rp filter for primary interface. Default is `false`.
        :param pulumi.Input[bool] cni_custom_network_cfg: Specifies that your pods may use subnets and security groups that are independent of your worker node's VPC configuration. By default, pods share the same subnet and security groups as the worker node's primary interface. Setting this variable to true causes ipamd to use the security groups and VPC subnet in a worker node's ENIConfig for elastic network interface allocation. You must create an ENIConfig custom resource for each subnet that your pods will reside in, and then annotate or label each worker node to use a specific ENIConfig (multiple worker nodes can be annotated or labelled with the same ENIConfig). Worker nodes can only be annotated with a single ENIConfig at a time, and the subnet in the ENIConfig must belong to the same Availability Zone that the worker node resides in. For more information, see CNI Custom Networking in the Amazon EKS User Guide. Default is `false`
        :param pulumi.Input[bool] cni_external_snat: Specifies whether an external NAT gateway should be used to provide SNAT of secondary ENI IP addresses. If set to true, the SNAT iptables rule and off-VPC IP rule are not applied, and these rules are removed if they have already been applied. Disable SNAT if you need to allow inbound communication to your pods from external VPNs, direct connections, and external VPCs, and your pods do not need to access the Internet directly via an Internet Gateway. However, your nodes must be running in a private subnet and connected to the internet through an AWS NAT Gateway or another external NAT device. Default is `false`
        :param pulumi.Input[bool] custom_network_config: Specifies that your pods may use subnets and security groups (within the same VPC as your control plane resources) that are independent of your cluster's `resourcesVpcConfig`.
               
               Defaults to false.
        :param pulumi.Input[bool] disable_tcp_early_demux: Allows the kubelet's liveness and readiness probes to connect via TCP when pod ENI is enabled. This will slightly increase local TCP connection latency.
        :param pulumi.Input[bool] enable_pod_eni: Specifies whether to allow IPAMD to add the `vpc.amazonaws.com/has-trunk-attached` label to the node if the instance has capacity to attach an additional ENI. Default is `false`. If using liveness and readiness probes, you will also need to disable TCP early demux.
        :param pulumi.Input[str] eni_config_label_def: Specifies the ENI_CONFIG_LABEL_DEF environment variable value for worker nodes. This is used to tell Kubernetes to automatically apply the ENIConfig for each Availability Zone
               Ref: https://docs.aws.amazon.com/eks/latest/userguide/cni-custom-network.html (step 5(c))
               
               Defaults to the official AWS CNI image in ECR.
        :param pulumi.Input[int] eni_mtu: Used to configure the MTU size for attached ENIs. The valid range is from 576 to 9001.
               
               Defaults to 9001.
        :param pulumi.Input[str] image: Specifies the container image to use in the AWS CNI cluster DaemonSet.
               
               Defaults to the official AWS CNI image in ECR.
        :param pulumi.Input[str] init_image: Specifies the init container image to use in the AWS CNI cluster DaemonSet.
               
               Defaults to the official AWS CNI init container image in ECR.
        :param pulumi.Input[str] log_file: Specifies the file path used for logs.
               
               Defaults to "stdout" to emit Pod logs for `kubectl logs`.
        :param pulumi.Input[str] log_level: Specifies the log level used for logs.
               
               Defaults to "DEBUG"
               Valid values: "DEBUG", "INFO", "WARN", "ERROR", or "FATAL".
        :param pulumi.Input[bool] node_port_support: Specifies whether NodePort services are enabled on a worker node's primary network interface. This requires additional iptables rules and that the kernel's reverse path filter on the primary interface is set to loose.
               
               Defaults to true.
        :param pulumi.Input[bool] security_context_privileged: Pass privilege to containers securityContext. This is required when SELinux is enabled. This value will not be passed to the CNI config by default
        :param pulumi.Input[str] veth_prefix: Specifies the veth prefix used to generate the host-side veth device name for the CNI.
               
               The prefix can be at most 4 characters long.
               
               Defaults to "eni".
        :param pulumi.Input[int] warm_eni_target: Specifies the number of free elastic network interfaces (and all of their available IP addresses) that the ipamD daemon should attempt to keep available for pod assignment on the node.
               
               Defaults to 1.
        :param pulumi.Input[int] warm_ip_target: Specifies the number of free IP addresses that the ipamD daemon should attempt to keep available for pod assignment on the node.
        """
        pulumi.set(__self__, "kubeconfig", kubeconfig)
        if cni_configure_rpfilter is not None:
            pulumi.set(__self__, "cni_configure_rpfilter", cni_configure_rpfilter)
        if cni_custom_network_cfg is not None:
            pulumi.set(__self__, "cni_custom_network_cfg", cni_custom_network_cfg)
        if cni_external_snat is not None:
            pulumi.set(__self__, "cni_external_snat", cni_external_snat)
        if custom_network_config is not None:
            pulumi.set(__self__, "custom_network_config", custom_network_config)
        if disable_tcp_early_demux is not None:
            pulumi.set(__self__, "disable_tcp_early_demux", disable_tcp_early_demux)
        if enable_pod_eni is not None:
            pulumi.set(__self__, "enable_pod_eni", enable_pod_eni)
        if eni_config_label_def is not None:
            pulumi.set(__self__, "eni_config_label_def", eni_config_label_def)
        if eni_mtu is not None:
            pulumi.set(__self__, "eni_mtu", eni_mtu)
        if image is not None:
            pulumi.set(__self__, "image", image)
        if init_image is not None:
            pulumi.set(__self__, "init_image", init_image)
        if log_file is not None:
            pulumi.set(__self__, "log_file", log_file)
        if log_level is not None:
            pulumi.set(__self__, "log_level", log_level)
        if node_port_support is not None:
            pulumi.set(__self__, "node_port_support", node_port_support)
        if security_context_privileged is not None:
            pulumi.set(__self__, "security_context_privileged", security_context_privileged)
        if veth_prefix is not None:
            pulumi.set(__self__, "veth_prefix", veth_prefix)
        if warm_eni_target is not None:
            pulumi.set(__self__, "warm_eni_target", warm_eni_target)
        if warm_ip_target is not None:
            pulumi.set(__self__, "warm_ip_target", warm_ip_target)

    @property
    @pulumi.getter
    def kubeconfig(self) -> Any:
        """
        The kubeconfig to use when setting the VPC CNI options.
        """
        return pulumi.get(self, "kubeconfig")

    @kubeconfig.setter
    def kubeconfig(self, value: Any):
        pulumi.set(self, "kubeconfig", value)

    @property
    @pulumi.getter(name="cniConfigureRpfilter")
    def cni_configure_rpfilter(self) -> Optional[pulumi.Input[bool]]:
        """
        Specifies whether ipamd should configure rp filter for primary interface. Default is `false`.
        """
        return pulumi.get(self, "cni_configure_rpfilter")

    @cni_configure_rpfilter.setter
    def cni_configure_rpfilter(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "cni_configure_rpfilter", value)

    @property
    @pulumi.getter(name="cniCustomNetworkCfg")
    def cni_custom_network_cfg(self) -> Optional[pulumi.Input[bool]]:
        """
        Specifies that your pods may use subnets and security groups that are independent of your worker node's VPC configuration. By default, pods share the same subnet and security groups as the worker node's primary interface. Setting this variable to true causes ipamd to use the security groups and VPC subnet in a worker node's ENIConfig for elastic network interface allocation. You must create an ENIConfig custom resource for each subnet that your pods will reside in, and then annotate or label each worker node to use a specific ENIConfig (multiple worker nodes can be annotated or labelled with the same ENIConfig). Worker nodes can only be annotated with a single ENIConfig at a time, and the subnet in the ENIConfig must belong to the same Availability Zone that the worker node resides in. For more information, see CNI Custom Networking in the Amazon EKS User Guide. Default is `false`
        """
        return pulumi.get(self, "cni_custom_network_cfg")

    @cni_custom_network_cfg.setter
    def cni_custom_network_cfg(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "cni_custom_network_cfg", value)

    @property
    @pulumi.getter(name="cniExternalSnat")
    def cni_external_snat(self) -> Optional[pulumi.Input[bool]]:
        """
        Specifies whether an external NAT gateway should be used to provide SNAT of secondary ENI IP addresses. If set to true, the SNAT iptables rule and off-VPC IP rule are not applied, and these rules are removed if they have already been applied. Disable SNAT if you need to allow inbound communication to your pods from external VPNs, direct connections, and external VPCs, and your pods do not need to access the Internet directly via an Internet Gateway. However, your nodes must be running in a private subnet and connected to the internet through an AWS NAT Gateway or another external NAT device. Default is `false`
        """
        return pulumi.get(self, "cni_external_snat")

    @cni_external_snat.setter
    def cni_external_snat(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "cni_external_snat", value)

    @property
    @pulumi.getter(name="customNetworkConfig")
    def custom_network_config(self) -> Optional[pulumi.Input[bool]]:
        """
        Specifies that your pods may use subnets and security groups (within the same VPC as your control plane resources) that are independent of your cluster's `resourcesVpcConfig`.

        Defaults to false.
        """
        return pulumi.get(self, "custom_network_config")

    @custom_network_config.setter
    def custom_network_config(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "custom_network_config", value)

    @property
    @pulumi.getter(name="disableTcpEarlyDemux")
    def disable_tcp_early_demux(self) -> Optional[pulumi.Input[bool]]:
        """
        Allows the kubelet's liveness and readiness probes to connect via TCP when pod ENI is enabled. This will slightly increase local TCP connection latency.
        """
        return pulumi.get(self, "disable_tcp_early_demux")

    @disable_tcp_early_demux.setter
    def disable_tcp_early_demux(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "disable_tcp_early_demux", value)

    @property
    @pulumi.getter(name="enablePodEni")
    def enable_pod_eni(self) -> Optional[pulumi.Input[bool]]:
        """
        Specifies whether to allow IPAMD to add the `vpc.amazonaws.com/has-trunk-attached` label to the node if the instance has capacity to attach an additional ENI. Default is `false`. If using liveness and readiness probes, you will also need to disable TCP early demux.
        """
        return pulumi.get(self, "enable_pod_eni")

    @enable_pod_eni.setter
    def enable_pod_eni(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "enable_pod_eni", value)

    @property
    @pulumi.getter(name="eniConfigLabelDef")
    def eni_config_label_def(self) -> Optional[pulumi.Input[str]]:
        """
        Specifies the ENI_CONFIG_LABEL_DEF environment variable value for worker nodes. This is used to tell Kubernetes to automatically apply the ENIConfig for each Availability Zone
        Ref: https://docs.aws.amazon.com/eks/latest/userguide/cni-custom-network.html (step 5(c))

        Defaults to the official AWS CNI image in ECR.
        """
        return pulumi.get(self, "eni_config_label_def")

    @eni_config_label_def.setter
    def eni_config_label_def(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "eni_config_label_def", value)

    @property
    @pulumi.getter(name="eniMtu")
    def eni_mtu(self) -> Optional[pulumi.Input[int]]:
        """
        Used to configure the MTU size for attached ENIs. The valid range is from 576 to 9001.

        Defaults to 9001.
        """
        return pulumi.get(self, "eni_mtu")

    @eni_mtu.setter
    def eni_mtu(self, value: Optional[pulumi.Input[int]]):
        pulumi.set(self, "eni_mtu", value)

    @property
    @pulumi.getter
    def image(self) -> Optional[pulumi.Input[str]]:
        """
        Specifies the container image to use in the AWS CNI cluster DaemonSet.

        Defaults to the official AWS CNI image in ECR.
        """
        return pulumi.get(self, "image")

    @image.setter
    def image(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "image", value)

    @property
    @pulumi.getter(name="initImage")
    def init_image(self) -> Optional[pulumi.Input[str]]:
        """
        Specifies the init container image to use in the AWS CNI cluster DaemonSet.

        Defaults to the official AWS CNI init container image in ECR.
        """
        return pulumi.get(self, "init_image")

    @init_image.setter
    def init_image(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "init_image", value)

    @property
    @pulumi.getter(name="logFile")
    def log_file(self) -> Optional[pulumi.Input[str]]:
        """
        Specifies the file path used for logs.

        Defaults to "stdout" to emit Pod logs for `kubectl logs`.
        """
        return pulumi.get(self, "log_file")

    @log_file.setter
    def log_file(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "log_file", value)

    @property
    @pulumi.getter(name="logLevel")
    def log_level(self) -> Optional[pulumi.Input[str]]:
        """
        Specifies the log level used for logs.

        Defaults to "DEBUG"
        Valid values: "DEBUG", "INFO", "WARN", "ERROR", or "FATAL".
        """
        return pulumi.get(self, "log_level")

    @log_level.setter
    def log_level(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "log_level", value)

    @property
    @pulumi.getter(name="nodePortSupport")
    def node_port_support(self) -> Optional[pulumi.Input[bool]]:
        """
        Specifies whether NodePort services are enabled on a worker node's primary network interface. This requires additional iptables rules and that the kernel's reverse path filter on the primary interface is set to loose.

        Defaults to true.
        """
        return pulumi.get(self, "node_port_support")

    @node_port_support.setter
    def node_port_support(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "node_port_support", value)

    @property
    @pulumi.getter(name="securityContextPrivileged")
    def security_context_privileged(self) -> Optional[pulumi.Input[bool]]:
        """
        Pass privilege to containers securityContext. This is required when SELinux is enabled. This value will not be passed to the CNI config by default
        """
        return pulumi.get(self, "security_context_privileged")

    @security_context_privileged.setter
    def security_context_privileged(self, value: Optional[pulumi.Input[bool]]):
        pulumi.set(self, "security_context_privileged", value)

    @property
    @pulumi.getter(name="vethPrefix")
    def veth_prefix(self) -> Optional[pulumi.Input[str]]:
        """
        Specifies the veth prefix used to generate the host-side veth device name for the CNI.

        The prefix can be at most 4 characters long.

        Defaults to "eni".
        """
        return pulumi.get(self, "veth_prefix")

    @veth_prefix.setter
    def veth_prefix(self, value: Optional[pulumi.Input[str]]):
        pulumi.set(self, "veth_prefix", value)

    @property
    @pulumi.getter(name="warmEniTarget")
    def warm_eni_target(self) -> Optional[pulumi.Input[int]]:
        """
        Specifies the number of free elastic network interfaces (and all of their available IP addresses) that the ipamD daemon should attempt to keep available for pod assignment on the node.

        Defaults to 1.
        """
        return pulumi.get(self, "warm_eni_target")

    @warm_eni_target.setter
    def warm_eni_target(self, value: Optional[pulumi.Input[int]]):
        pulumi.set(self, "warm_eni_target", value)

    @property
    @pulumi.getter(name="warmIpTarget")
    def warm_ip_target(self) -> Optional[pulumi.Input[int]]:
        """
        Specifies the number of free IP addresses that the ipamD daemon should attempt to keep available for pod assignment on the node.
        """
        return pulumi.get(self, "warm_ip_target")

    @warm_ip_target.setter
    def warm_ip_target(self, value: Optional[pulumi.Input[int]]):
        pulumi.set(self, "warm_ip_target", value)


class VpcCni(pulumi.CustomResource):
    @overload
    def __init__(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 cni_configure_rpfilter: Optional[pulumi.Input[bool]] = None,
                 cni_custom_network_cfg: Optional[pulumi.Input[bool]] = None,
                 cni_external_snat: Optional[pulumi.Input[bool]] = None,
                 custom_network_config: Optional[pulumi.Input[bool]] = None,
                 disable_tcp_early_demux: Optional[pulumi.Input[bool]] = None,
                 enable_pod_eni: Optional[pulumi.Input[bool]] = None,
                 eni_config_label_def: Optional[pulumi.Input[str]] = None,
                 eni_mtu: Optional[pulumi.Input[int]] = None,
                 image: Optional[pulumi.Input[str]] = None,
                 init_image: Optional[pulumi.Input[str]] = None,
                 kubeconfig: Optional[Any] = None,
                 log_file: Optional[pulumi.Input[str]] = None,
                 log_level: Optional[pulumi.Input[str]] = None,
                 node_port_support: Optional[pulumi.Input[bool]] = None,
                 security_context_privileged: Optional[pulumi.Input[bool]] = None,
                 veth_prefix: Optional[pulumi.Input[str]] = None,
                 warm_eni_target: Optional[pulumi.Input[int]] = None,
                 warm_ip_target: Optional[pulumi.Input[int]] = None,
                 __props__=None):
        """
        VpcCni manages the configuration of the Amazon VPC CNI plugin for Kubernetes by applying its YAML chart.

        :param str resource_name: The name of the resource.
        :param pulumi.ResourceOptions opts: Options for the resource.
        :param pulumi.Input[bool] cni_configure_rpfilter: Specifies whether ipamd should configure rp filter for primary interface. Default is `false`.
        :param pulumi.Input[bool] cni_custom_network_cfg: Specifies that your pods may use subnets and security groups that are independent of your worker node's VPC configuration. By default, pods share the same subnet and security groups as the worker node's primary interface. Setting this variable to true causes ipamd to use the security groups and VPC subnet in a worker node's ENIConfig for elastic network interface allocation. You must create an ENIConfig custom resource for each subnet that your pods will reside in, and then annotate or label each worker node to use a specific ENIConfig (multiple worker nodes can be annotated or labelled with the same ENIConfig). Worker nodes can only be annotated with a single ENIConfig at a time, and the subnet in the ENIConfig must belong to the same Availability Zone that the worker node resides in. For more information, see CNI Custom Networking in the Amazon EKS User Guide. Default is `false`
        :param pulumi.Input[bool] cni_external_snat: Specifies whether an external NAT gateway should be used to provide SNAT of secondary ENI IP addresses. If set to true, the SNAT iptables rule and off-VPC IP rule are not applied, and these rules are removed if they have already been applied. Disable SNAT if you need to allow inbound communication to your pods from external VPNs, direct connections, and external VPCs, and your pods do not need to access the Internet directly via an Internet Gateway. However, your nodes must be running in a private subnet and connected to the internet through an AWS NAT Gateway or another external NAT device. Default is `false`
        :param pulumi.Input[bool] custom_network_config: Specifies that your pods may use subnets and security groups (within the same VPC as your control plane resources) that are independent of your cluster's `resourcesVpcConfig`.
               
               Defaults to false.
        :param pulumi.Input[bool] disable_tcp_early_demux: Allows the kubelet's liveness and readiness probes to connect via TCP when pod ENI is enabled. This will slightly increase local TCP connection latency.
        :param pulumi.Input[bool] enable_pod_eni: Specifies whether to allow IPAMD to add the `vpc.amazonaws.com/has-trunk-attached` label to the node if the instance has capacity to attach an additional ENI. Default is `false`. If using liveness and readiness probes, you will also need to disable TCP early demux.
        :param pulumi.Input[str] eni_config_label_def: Specifies the ENI_CONFIG_LABEL_DEF environment variable value for worker nodes. This is used to tell Kubernetes to automatically apply the ENIConfig for each Availability Zone
               Ref: https://docs.aws.amazon.com/eks/latest/userguide/cni-custom-network.html (step 5(c))
               
               Defaults to the official AWS CNI image in ECR.
        :param pulumi.Input[int] eni_mtu: Used to configure the MTU size for attached ENIs. The valid range is from 576 to 9001.
               
               Defaults to 9001.
        :param pulumi.Input[str] image: Specifies the container image to use in the AWS CNI cluster DaemonSet.
               
               Defaults to the official AWS CNI image in ECR.
        :param pulumi.Input[str] init_image: Specifies the init container image to use in the AWS CNI cluster DaemonSet.
               
               Defaults to the official AWS CNI init container image in ECR.
        :param Any kubeconfig: The kubeconfig to use when setting the VPC CNI options.
        :param pulumi.Input[str] log_file: Specifies the file path used for logs.
               
               Defaults to "stdout" to emit Pod logs for `kubectl logs`.
        :param pulumi.Input[str] log_level: Specifies the log level used for logs.
               
               Defaults to "DEBUG"
               Valid values: "DEBUG", "INFO", "WARN", "ERROR", or "FATAL".
        :param pulumi.Input[bool] node_port_support: Specifies whether NodePort services are enabled on a worker node's primary network interface. This requires additional iptables rules and that the kernel's reverse path filter on the primary interface is set to loose.
               
               Defaults to true.
        :param pulumi.Input[bool] security_context_privileged: Pass privilege to containers securityContext. This is required when SELinux is enabled. This value will not be passed to the CNI config by default
        :param pulumi.Input[str] veth_prefix: Specifies the veth prefix used to generate the host-side veth device name for the CNI.
               
               The prefix can be at most 4 characters long.
               
               Defaults to "eni".
        :param pulumi.Input[int] warm_eni_target: Specifies the number of free elastic network interfaces (and all of their available IP addresses) that the ipamD daemon should attempt to keep available for pod assignment on the node.
               
               Defaults to 1.
        :param pulumi.Input[int] warm_ip_target: Specifies the number of free IP addresses that the ipamD daemon should attempt to keep available for pod assignment on the node.
        """
        ...
    @overload
    def __init__(__self__,
                 resource_name: str,
                 args: VpcCniArgs,
                 opts: Optional[pulumi.ResourceOptions] = None):
        """
        VpcCni manages the configuration of the Amazon VPC CNI plugin for Kubernetes by applying its YAML chart.

        :param str resource_name: The name of the resource.
        :param VpcCniArgs args: The arguments to use to populate this resource's properties.
        :param pulumi.ResourceOptions opts: Options for the resource.
        """
        ...
    def __init__(__self__, resource_name: str, *args, **kwargs):
        resource_args, opts = _utilities.get_resource_args_opts(VpcCniArgs, pulumi.ResourceOptions, *args, **kwargs)
        if resource_args is not None:
            __self__._internal_init(resource_name, opts, **resource_args.__dict__)
        else:
            __self__._internal_init(resource_name, *args, **kwargs)

    def _internal_init(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 cni_configure_rpfilter: Optional[pulumi.Input[bool]] = None,
                 cni_custom_network_cfg: Optional[pulumi.Input[bool]] = None,
                 cni_external_snat: Optional[pulumi.Input[bool]] = None,
                 custom_network_config: Optional[pulumi.Input[bool]] = None,
                 disable_tcp_early_demux: Optional[pulumi.Input[bool]] = None,
                 enable_pod_eni: Optional[pulumi.Input[bool]] = None,
                 eni_config_label_def: Optional[pulumi.Input[str]] = None,
                 eni_mtu: Optional[pulumi.Input[int]] = None,
                 image: Optional[pulumi.Input[str]] = None,
                 init_image: Optional[pulumi.Input[str]] = None,
                 kubeconfig: Optional[Any] = None,
                 log_file: Optional[pulumi.Input[str]] = None,
                 log_level: Optional[pulumi.Input[str]] = None,
                 node_port_support: Optional[pulumi.Input[bool]] = None,
                 security_context_privileged: Optional[pulumi.Input[bool]] = None,
                 veth_prefix: Optional[pulumi.Input[str]] = None,
                 warm_eni_target: Optional[pulumi.Input[int]] = None,
                 warm_ip_target: Optional[pulumi.Input[int]] = None,
                 __props__=None):
        if opts is None:
            opts = pulumi.ResourceOptions()
        if not isinstance(opts, pulumi.ResourceOptions):
            raise TypeError('Expected resource options to be a ResourceOptions instance')
        if opts.version is None:
            opts.version = _utilities.get_version()
        if opts.id is None:
            if __props__ is not None:
                raise TypeError('__props__ is only valid when passed in combination with a valid opts.id to get an existing resource')
            __props__ = VpcCniArgs.__new__(VpcCniArgs)

            __props__.__dict__["cni_configure_rpfilter"] = cni_configure_rpfilter
            __props__.__dict__["cni_custom_network_cfg"] = cni_custom_network_cfg
            __props__.__dict__["cni_external_snat"] = cni_external_snat
            __props__.__dict__["custom_network_config"] = custom_network_config
            __props__.__dict__["disable_tcp_early_demux"] = disable_tcp_early_demux
            __props__.__dict__["enable_pod_eni"] = enable_pod_eni
            __props__.__dict__["eni_config_label_def"] = eni_config_label_def
            __props__.__dict__["eni_mtu"] = eni_mtu
            __props__.__dict__["image"] = image
            __props__.__dict__["init_image"] = init_image
            if kubeconfig is None and not opts.urn:
                raise TypeError("Missing required property 'kubeconfig'")
            __props__.__dict__["kubeconfig"] = kubeconfig
            __props__.__dict__["log_file"] = log_file
            __props__.__dict__["log_level"] = log_level
            __props__.__dict__["node_port_support"] = node_port_support
            __props__.__dict__["security_context_privileged"] = security_context_privileged
            __props__.__dict__["veth_prefix"] = veth_prefix
            __props__.__dict__["warm_eni_target"] = warm_eni_target
            __props__.__dict__["warm_ip_target"] = warm_ip_target
        super(VpcCni, __self__).__init__(
            'eks:index:VpcCni',
            resource_name,
            __props__,
            opts)

    @staticmethod
    def get(resource_name: str,
            id: pulumi.Input[str],
            opts: Optional[pulumi.ResourceOptions] = None) -> 'VpcCni':
        """
        Get an existing VpcCni resource's state with the given name, id, and optional extra
        properties used to qualify the lookup.

        :param str resource_name: The unique name of the resulting resource.
        :param pulumi.Input[str] id: The unique provider ID of the resource to lookup.
        :param pulumi.ResourceOptions opts: Options for the resource.
        """
        opts = pulumi.ResourceOptions.merge(opts, pulumi.ResourceOptions(id=id))

        __props__ = VpcCniArgs.__new__(VpcCniArgs)

        return VpcCni(resource_name, opts=opts, __props__=__props__)

