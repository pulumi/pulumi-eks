// Copyright 2016-2014, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";

export interface VpcCniAddonOptions {
    clusterName: pulumi.Input<string>;

    /**
     * The Kubernetes version of the cluster. This is used to determine the addon version to use if `addonVersion` is not specified.
     */
    clusterVersion?: pulumi.Input<string>;

    /**
     * The version of the addon to use. If not specified, the latest version of the addon for the cluster's Kubernetes version will be used.
     */
    addonVersion?: pulumi.Input<string>;

    /**
     * Specifies whether NodePort services are enabled on a worker node's primary network interface. This requires
     * additional iptables rules and that the kernel's reverse path filter on the primary interface is set to loose.
     *
     * Defaults to true.
     */
    nodePortSupport?: pulumi.Input<boolean>;

    /**
     * Specifies that your pods may use subnets and security groups (within the same VPC as your control plane
     * resources) that are independent of your cluster's `resourcesVpcConfig`.
     *
     * Defaults to false.
     */
    customNetworkConfig?: pulumi.Input<boolean>;

    /**
     * Specifies whether an external NAT gateway should be used to provide SNAT of secondary ENI IP addresses. If set
     * to true, the SNAT iptables rule and off-VPC IP rule are not applied, and these rules are removed if they have
     * already been applied.
     *
     * Defaults to false.
     */
    externalSnat?: pulumi.Input<boolean>;

    /**
     * Specifies the number of free elastic network interfaces (and all of their available IP addresses) that the ipamD
     * daemon should attempt to keep available for pod assignment on the node.
     *
     * Defaults to 1.
     */
    warmEniTarget?: pulumi.Input<number>;

    /**
     * Specifies the number of free IP addresses that the ipamD daemon should attempt to keep available for pod
     * assignment on the node.
     */
    warmIpTarget?: pulumi.Input<number>;

    /**
     * WARM_PREFIX_TARGET will allocate one full (/28) prefix even if a single IP is consumed with the existing prefix.
     * Ref: https://github.com/aws/amazon-vpc-cni-k8s/blob/master/docs/prefix-and-ip-target.md
     */
    warmPrefixTarget?: pulumi.Input<number>;

    /**
     * IPAMD will start allocating (/28) prefixes to the ENIs with ENABLE_PREFIX_DELEGATION set to true.
     * Ref: https://github.com/aws/amazon-vpc-cni-k8s/blob/master/docs/prefix-and-ip-target.md
     */
    enablePrefixDelegation?: pulumi.Input<boolean>;

    /**
     * VPC CNI can operate in either IPv4 or IPv6 mode. Setting ENABLE_IPv6 to true. will configure it in IPv6 mode.
     * Note that IPv6 is only supported in Prefix Delegation mode so enablePrefixDelegation must also be set.
     *
     * Ref: https://github.com/aws/amazon-vpc-cni-k8s/blob/master/README.md#enable_ipv6-v1100
     */
    enableIpv6?: pulumi.Input<boolean>;

    /**
     * Specifies the log level used for logs.
     *
     * Defaults to "DEBUG".
     * See more options: https://git.io/fj92K
     */
    logLevel?: pulumi.Input<string>;

    /**
     * Specifies the file path used for logs.
     *
     * Defaults to "stdout" to emit Pod logs for `kubectl logs`.
     */
    logFile?: pulumi.Input<string>;

    /**
     * Specifies the aws-node container image to use in the AWS CNI cluster DaemonSet.
     *
     * Defaults to the official AWS CNI image in ECR.
     */
    image?: pulumi.Input<string>;

    /**
     * Specifies the aws-eks-nodeagent container image to use in the AWS CNI cluster DaemonSet.
     *
     * Defaults to the official AWS CNI image in ECR.
     */
    nodeAgentImage?: pulumi.Input<string>;

    /**
     * Specifies the init container image to use in the AWS CNI cluster DaemonSet.
     *
     * Defaults to the official AWS CNI init container image in ECR.
     */
    initImage?: pulumi.Input<string>;

    /**
     * Specifies the veth prefix used to generate the host-side veth device
     * name for the CNI.
     *
     * The prefix can be at most 4 characters long.
     *
     * Defaults to "eni".
     */
    vethPrefix?: pulumi.Input<string>;

    /**
     * Used to configure the MTU size for attached ENIs. The valid range is
     * from 576 to 9001.
     *
     * Defaults to 9001.
     */
    eniMtu?: pulumi.Input<number>;
    /*
     * Specifies the ENI_CONFIG_LABEL_DEF environment variable value for worker nodes
     * This is used to tell Kubernetes to automatically apply the ENIConfig for each Availability Zone
     * Ref: https://docs.aws.amazon.com/eks/latest/userguide/cni-custom-network.html (step 5(c))
     *
     * Defaults to the official AWS CNI image in ECR.
     */
    eniConfigLabelDef?: pulumi.Input<string>;

    /**
     * Specifies the log level used for plugin logs.
     *
     * Defaults to "DEBUG".
     */
    pluginLogLevel?: pulumi.Input<string>;

    /**
     * Specifies the file path used for plugin logs.
     *
     * Defaults to "stdout" to emit Plugin logs.
     */
    pluginLogFile?: pulumi.Input<string>;

    /**
     * Specifies whether to allow IPAMD to add the `vpc.amazonaws.com/has-trunk-attached` label to the node if the
     * instance has capacity to attach an additional ENI.
     *
     * If using liveness and readiness probes, you will also need to disable TCP early demux.
     *
     * Defaults to "false".
     */
    enablePodEni?: pulumi.Input<boolean>;

    /**
     * Allows the kubelet's liveness and readiness probes to connect via TCP when pod ENI is enabled.
     * This will slightly increase local TCP connection latency.
     *
     * Defaults to "false".
     */
    disableTcpEarlyDemux?: pulumi.Input<boolean>;

    /**
     * Specifies whether ipamd should configure rp filter for primary interface.
     *
     * Defaults to "false".
     */
    cniConfigureRpfilter?: pulumi.Input<boolean>;

    /**
     * Specifies that your pods may use subnets and security groups that are independent of your worker node's
     * VPC configuration. By default, pods share the same subnet and security groups as the worker node's primary
     * interface. Setting this variable to true causes ipamd to use the security groups and VPC subnet in a worker
     * node's ENIConfig for elastic network interface allocation. You must create an ENIConfig custom resource for
     * each subnet that your pods will reside in, and then annotate or label each worker node to use a specific
     * ENIConfig (multiple worker nodes can be annotated or labelled with the same ENIConfig). Worker nodes can only
     * be annotated with a single ENIConfig at a time, and the subnet in the ENIConfig must belong to the same
     * Availability Zone that the worker node resides in. For more information, see CNI Custom Networking in the
     * Amazon EKS User Guide.
     *
     * Defaults to "false".
     */
    cniCustomNetworkCfg?: pulumi.Input<boolean>;

    /**
     * Specifies whether an external NAT gateway should be used to provide SNAT of secondary ENI IP addresses. If set
     * to true, the SNAT iptables rule and off-VPC IP rule are not applied, and these rules are removed if they have
     * already been applied. Disable SNAT if you need to allow inbound communication to your pods from external VPNs,
     * direct connections, and external VPCs, and your pods do not need to access the Internet directly via an Internet
     * Gateway. However, your nodes must be running in a private subnet and connected to the internet through an AWS NAT
     * Gateway or another external NAT device.
     *
     * Defaults to "false".
     */
    cniExternalSnat?: pulumi.Input<boolean>;

    /**
     * Pass privilege to containers securityContext
     * this is required when SELinux is enabled
     * This value will not be passed to the CNI config by default
     */
    securityContextPrivileged?: pulumi.Input<boolean>;
}

/**
 * Addon manages an EKS add-on.
 * For more information about supported add-ons, see: https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html
 */
export class VpcCniAddon extends pulumi.ComponentResource {
    public readonly addon: pulumi.Input<aws.eks.Addon>;

    constructor(name: string, args?: VpcCniAddonOptions, opts?: pulumi.ComponentResourceOptions) {
        const type = "eks:index:VpcCniAddon";

        if (opts?.urn) {
            const props = {
                addon: undefined,
            };
            super(type, name, props, opts);
            return;
        }

        super(type, name, args, opts);

        if (args?.clusterName === undefined) {
            throw new pulumi.ResourceError("Missing required option 'clusterName'", this);
        }

        const { env, initEnv } = computeEnv(args);

        let addonVersion: pulumi.Input<string>;
        if (args.addonVersion) {
            addonVersion = args.addonVersion;
        } else if (args.clusterVersion) {
            addonVersion = aws.eks.getAddonVersionOutput(
                {
                    addonName: "vpc-cni",
                    kubernetesVersion: args.clusterVersion,
                    mostRecent: true,
                },
                { parent: this },
            ).version;
        } else {
            throw new pulumi.ResourceError(
                "You need to specify either `addonVersion` or `clusterVersion` to determine the version of the vpc-cni addon to use.",
                this,
            );
        }

        this.addon = new aws.eks.Addon(
            name,
            {
                clusterName: args.clusterName,
                addonName: "vpc-cni",
                // this makes sure adoption of existing resources works and doesn't fail
                resolveConflictsOnCreate: "OVERWRITE",
                // do not overwrite existing configuration when updating the vpc-cni
                resolveConflictsOnUpdate: "PRESERVE",
                preserve: true,
                configurationValues: pulumi.jsonStringify({
                    env: env,
                    init: {
                        env: initEnv,
                    },
                }),
            },
            { parent: this },
        );

        if (args.image || args.initImage || args.nodeAgentImage || args.securityContextPrivileged) {
            this.createDaemonSetPatch(name, args, this.addon);
        }

        this.registerOutputs({ addon: this.addon });
    }

    // create a SSA patch to set options that are not configurable via the addon
    private createDaemonSetPatch(
        name: string,
        args: VpcCniAddonOptions,
        addon: aws.eks.Addon,
    ): k8s.apps.v1.DaemonSetPatch {
        const containers: k8s.types.input.core.v1.ContainerPatch[] = [];
        const initContainers: k8s.types.input.core.v1.ContainerPatch[] = [];

        if (args.image || args.securityContextPrivileged) {
            containers.push({
                name: "aws-node",
                image: args.image,
                securityContext: args.securityContextPrivileged
                    ? {
                          privileged: args.securityContextPrivileged,
                      }
                    : undefined,
            });
        }

        if (args.nodeAgentImage) {
            containers.push({
                name: "aws-eks-nodeagent",
                image: args.nodeAgentImage,
            });
        }

        if (args.initImage) {
            initContainers.push({
                name: "aws-vpc-cni-init",
                image: args.initImage,
            });
        }

        return new k8s.apps.v1.DaemonSetPatch(
            name,
            {
                metadata: {
                    name: "aws-node",
                    namespace: "kube-system",
                    annotations: {
                        "pulumi.com/patchForce": "true",
                    },
                },
                spec: {
                    template: {
                        spec: {
                            containers: containers.length > 0 ? containers : undefined,
                            initContainers: initContainers.length > 0 ? initContainers : undefined,
                        },
                    },
                },
            },
            { parent: this, dependsOn: [addon] },
        );
    }
}

function computeEnv(args: VpcCniAddonOptions): {
    env: { [key: string]: string };
    initEnv: { [key: string]: string };
} {
    const env: { name: string; value: string }[] = [];
    const initEnv: { name: string; value: string }[] = [];
    if (args.nodePortSupport) {
        env.push({
            name: "AWS_VPC_CNI_NODE_PORT_SUPPORT",
            value: args.nodePortSupport ? "true" : "false",
        });
    }
    if (args.customNetworkConfig) {
        env.push({
            name: "AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG",
            value: args.customNetworkConfig ? "true" : "false",
        });
    }
    env.push({ name: "WARM_ENI_TARGET", value: `${args.warmEniTarget ?? 1}` });
    if (args.warmIpTarget) {
        env.push({
            name: "WARM_IP_TARGET",
            value: args.warmIpTarget.toString(),
        });
    }
    if (args.warmPrefixTarget) {
        env.push({
            name: "WARM_PREFIX_TARGET",
            value: args.warmPrefixTarget.toString(),
        });
    }

    if (args.enablePrefixDelegation) {
        env.push({
            name: "ENABLE_PREFIX_DELEGATION",
            value: args.enablePrefixDelegation ? "true" : "false",
        });
    }
    if (args.logLevel) {
        env.push({
            name: "AWS_VPC_K8S_CNI_LOGLEVEL",
            value: args.logLevel.toString(),
        });
    } else {
        env.push({ name: "AWS_VPC_K8S_CNI_LOGLEVEL", value: "DEBUG" });
    }
    if (args.logFile) {
        env.push({
            name: "AWS_VPC_K8S_CNI_LOG_FILE",
            value: args.logFile.toString(),
        });
    } else {
        env.push({
            name: "AWS_VPC_K8S_CNI_LOG_FILE",
            value: "/host/var/log/aws-routed-eni/ipamd.log",
        });
    }
    if (args.vethPrefix) {
        env.push({
            name: "AWS_VPC_K8S_CNI_VETHPREFIX",
            value: args.vethPrefix.toString(),
        });
    } else {
        env.push({ name: "AWS_VPC_K8S_CNI_VETHPREFIX", value: "eni" });
    }
    if (args.eniMtu) {
        env.push({ name: "AWS_VPC_ENI_MTU", value: args.eniMtu.toString() });
    } else {
        env.push({ name: "AWS_VPC_ENI_MTU", value: "9001" });
    }

    if (args.eniConfigLabelDef) {
        env.push({
            name: "ENI_CONFIG_LABEL_DEF",
            value: args.eniConfigLabelDef.toString(),
        });
    }
    if (args.pluginLogLevel) {
        env.push({
            name: "AWS_VPC_K8S_PLUGIN_LOG_LEVEL",
            value: args.pluginLogLevel.toString(),
        });
    } else {
        env.push({ name: "AWS_VPC_K8S_PLUGIN_LOG_LEVEL", value: "DEBUG" });
    }
    if (args.pluginLogFile) {
        env.push({
            name: "AWS_VPC_K8S_PLUGIN_LOG_FILE",
            value: args.pluginLogFile.toString(),
        });
    } else {
        env.push({
            name: "AWS_VPC_K8S_PLUGIN_LOG_FILE",
            value: "/var/log/aws-routed-eni/plugin.log",
        });
    }
    if (args.enablePodEni) {
        env.push({
            name: "ENABLE_POD_ENI",
            value: args.enablePodEni ? "true" : "false",
        });
    } else {
        env.push({ name: "ENABLE_POD_ENI", value: "false" });
    }
    if (args.disableTcpEarlyDemux) {
        initEnv.push({
            name: "DISABLE_TCP_EARLY_DEMUX",
            value: args.disableTcpEarlyDemux ? "true" : "false",
        });
    } else {
        initEnv.push({ name: "DISABLE_TCP_EARLY_DEMUX", value: "false" });
    }
    if (args.cniConfigureRpfilter) {
        env.push({
            name: "AWS_VPC_K8S_CNI_CONFIGURE_RPFILTER",
            value: args.cniConfigureRpfilter ? "true" : "false",
        });
    }
    if (args.cniCustomNetworkCfg) {
        env.push({
            name: "AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG",
            value: args.cniCustomNetworkCfg ? "true" : "false",
        });
    } else {
        env.push({
            name: "AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG",
            value: "false",
        });
    }
    // A user would usually specify externalSnat or cniExternalSnat NOT both
    if (args.cniExternalSnat && args.externalSnat) {
        throw new Error(
            "Please specify one of `cniExternalSnat` or `externalSnat` in your VpcCniOptions",
        );
    }
    if (args.externalSnat) {
        env.push({
            name: "AWS_VPC_K8S_CNI_EXTERNALSNAT",
            value: args.externalSnat ? "true" : "false",
        });
    } else if (args.cniExternalSnat) {
        env.push({
            name: "AWS_VPC_K8S_CNI_EXTERNALSNAT",
            value: args.cniExternalSnat ? "true" : "false",
        });
    } else {
        env.push({ name: "AWS_VPC_K8S_CNI_EXTERNALSNAT", value: "false" });
    }

    return {
        env: env.reduce((acc, { name, value }) => {
            Object.assign(acc, { [name]: value });
            return acc;
        }, {}),
        initEnv: initEnv.reduce((acc, { name, value }) => {
            Object.assign(acc, { [name]: value });
            return acc;
        }, {}),
    };
}
