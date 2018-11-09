// Copyright 2016-2018, Pulumi Corporation.
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
import * as childProcess from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as jsyaml from "js-yaml";
import * as path from "path";
import * as process from "process";
import * as tmp from "tmp";
import which = require("which");

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
}

interface VpcCniInputs {
    kubeconfig: string;
    nodePortSupport?: boolean;
    customNetworkConfig?: boolean;
    externalSnat?: boolean;
    warmEniTarget?: number;
    warmIpTarget?: number;
}

function computeVpcCniYaml(yamlPath: string, args: VpcCniInputs): string {
    // Read the CNI YAML. The original source for this YAML is
    // https://github.com/aws/amazon-vpc-cni-k8s/tree/master/config.
    const cniYamlText = fs.readFileSync(yamlPath).toString();
    const cniYaml = jsyaml.safeLoadAll(cniYamlText);

    // Rewrite the envvars for the CNI daemon set as per the inputs.
    const daemonSet = cniYaml.filter(o => o.kind === "DaemonSet")[0];
    const env = daemonSet.spec.template.spec.containers[0].env;
    if (args.nodePortSupport !== undefined) {
        env.push({name: "AWS_VPC_CNI_NODE_PORT_SUPPORT", value: args.nodePortSupport ? "true" : "false"});
    }
    if (args.customNetworkConfig !== undefined) {
        env.push({name: "AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG", value: args.customNetworkConfig ? "true" : "false"});
    }
    if (args.externalSnat !== undefined) {
        env.push({name: "AWS_VPC_K8S_CNI_EXTERNALSNAT", value: args.externalSnat ? "true" : "false"});
    }
    if (args.warmEniTarget !== undefined) {
        env.push({name: "WARM_ENI_TARGET", value: args.warmEniTarget.toString()});
    }
    if (args.warmIpTarget !== undefined) {
        env.push({name: "WARM_IP_TARGET", value: args.warmIpTarget.toString()});
    }
    // Return the computed YAML.
    return cniYaml.map(o => `---\n${jsyaml.safeDump(o)}`).join("");
}

function applyVpcCniYaml(yamlPath: string, args: VpcCniInputs) {
    // Dump the kubeconfig to a file.
    const tmpKubeconfig = tmp.fileSync();
    fs.writeFileSync(tmpKubeconfig.fd, args.kubeconfig);

    // Compute the required CNI YAML and dump it to a file.
    const tmpYaml = tmp.fileSync();
    fs.writeFileSync(tmpYaml.fd, computeVpcCniYaml(yamlPath, args));

    // Call kubectl to apply the YAML.
    childProcess.execSync(`kubectl apply -f ${tmpYaml.name}`, {
        env: { ...process.env, "KUBECONFIG": tmpKubeconfig.name },
    });
}

/**
 * VpcCni manages the configuration of the Amazon VPC CNI plugin for Kubernetes by applying its YAML chart. Once Pulumi is
 * able to programatically manage existing infrastructure, we can replace this with a real k8s resource.
 */
export class VpcCni extends pulumi.dynamic.Resource {
    constructor(name: string, kubeconfig: pulumi.Input<any>, args?: VpcCniOptions, opts?: pulumi.CustomResourceOptions) {
        // Check to ensure that kubectl is installed, as we'll need it in order to deploy k8s resources below.
        try {
            which.sync("kubectl");
        } catch (err) {
            throw new pulumi.RunError("Could not set VPC CNI options: kubectl is missing. See https://kubernetes.io/docs/tasks/tools/install-kubectl/#install-kubectl for installation instructions.");
        }

        const yamlPath = path.join(__dirname, "cni", "aws-k8s-cni.yaml");

        const provider = {
            check: (state: any, inputs: any) => Promise.resolve({inputs: inputs, failedChecks: []}),
            diff: (id: pulumi.ID, state: any, inputs: any) => Promise.resolve({}),
            create: (inputs: any) => {
                applyVpcCniYaml(yamlPath, <VpcCniInputs>inputs);
                return Promise.resolve({id: crypto.randomBytes(8).toString("hex"), outs: {}});
            },
            update: (id: pulumi.ID, state: any, inputs: any) => {
                applyVpcCniYaml(yamlPath, <VpcCniInputs>inputs);
                return Promise.resolve({outs: {}});
            },
            read: (id: pulumi.ID, state: any) => Promise.resolve({id: id, props: state}),
            delete: (id: pulumi.ID, state: any) => Promise.resolve(),
        };

        args = args || {};
        super(provider, name, {
            kubeconfig: pulumi.output(kubeconfig).apply(JSON.stringify),
            nodePortSupport: args.nodePortSupport,
            customNetworkConfig: args.customNetworkConfig,
            externalSnat: args.externalSnat,
            warmEniTarget: args.warmEniTarget,
            warmIpTarget: args.warmIpTarget,
        }, opts);
    }
}
