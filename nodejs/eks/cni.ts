// Copyright 2016-2019, Pulumi Corporation.
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

/**
 * VpcCniOptions describes the configuration options available for the Amazon VPC CNI plugin for Kubernetes.
 */
export interface VpcCniOptions {
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
     * Specifies the container image to use in the AWS CNI cluster DaemonSet.
     *
     * Defaults to the official AWS CNI image in ECR.
     */
    image?: pulumi.Input<string>;

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
     * Defaults to "false".
     */
    enablePodEni?: pulumi.Input<boolean>;

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

// Dynamic providers don't currently work well with multi-language components [1]. To workaround this, the
// dynamic providers in this library have been ported to be custom resources implemented by the new provider
// plugin. An alias is used and care has been taken in the implementation inside the provider to avoid any
// diffs for any existing stacks that were created using the old dynamic provider.
// [1] https://github.com/pulumi/pulumi/issues/5455

/**
 * VpcCni manages the configuration of the Amazon VPC CNI plugin for Kubernetes by applying its YAML chart. Once Pulumi is
 * able to programatically manage existing infrastructure, we can replace this with a real k8s resource.
 */
export class VpcCni extends pulumi.CustomResource {
    constructor(name: string, kubeconfig: pulumi.Input<any>, args?: VpcCniOptions, opts?: pulumi.CustomResourceOptions) {
        // This was previously implemented as a dynamic provider, so alias the old type.
        const aliasOpts = { aliases: [{ type: "pulumi-nodejs:dynamic:Resource" }] };
        opts = pulumi.mergeOptions(opts, aliasOpts);
        super("eks:index:VpcCni", name, {
            kubeconfig: kubeconfig ? pulumi.output(kubeconfig).apply(JSON.stringify) : undefined,
            nodePortSupport: args?.nodePortSupport,
            customNetworkConfig: args?.customNetworkConfig,
            externalSnat: args?.externalSnat,
            warmEniTarget: args?.warmEniTarget,
            warmIpTarget: args?.warmIpTarget,
            logLevel: args?.logLevel,
            logFile: args?.logFile,
            image: args?.image,
            eniConfigLabelDef: args?.eniConfigLabelDef,
            pluginLogLevel: args?.pluginLogLevel,
            pluginLogFile: args?.pluginLogFile,
            enablePodEni: args?.enablePodEni,
            cniConfigureRpfilter: args?.cniConfigureRpfilter,
            cniCustomNetworkCfg: args?.cniCustomNetworkCfg,
            cniExternalSnat: args?.cniCustomNetworkCfg,
            securityContextPrivileged: args?.securityContextPrivileged,
        }, opts);
    }
}
