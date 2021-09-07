// Copyright 2016-2020, Pulumi Corporation.
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

interface VpcCniInputs {
    kubeconfig: any;
    nodePortSupport?: boolean;
    customNetworkConfig?: boolean;
    externalSnat?: boolean;
    warmEniTarget?: number;
    warmIpTarget?: number;
    warmPrefixTarget?: number;
    enablePrefixDelegation?: boolean;
    logLevel?: string;
    logFile?: string;
    image?: string;
    initImage?: string;
    vethPrefix?: string;
    eniMtu?: number;
    eniConfigLabelDef?: string;
    pluginLogLevel?: string;
    pluginLogFile?: string;
    enablePodEni?: boolean;
    disableTcpEarlyDemux?: boolean;
    cniConfigureRpfilter?: boolean;
    cniCustomNetworkCfg?: boolean;
    cniExternalSnat?: boolean;
    securityContextPrivileged?: boolean;
}

function computeVpcCniYaml(cniYamlText: string, args: VpcCniInputs): string {
    const cniYaml = jsyaml.safeLoadAll(cniYamlText);

    // Rewrite the envvars for the CNI daemon set as per the inputs.
    const daemonSet = cniYaml.filter(o => o.kind === "DaemonSet")[0];
    const env = daemonSet.spec.template.spec.containers[0].env;
    const initEnv = daemonSet.spec.template.spec.initContainers[0].env;
    const securityContext = daemonSet.spec.template.spec.containers[0].securityContext;
    if (args.nodePortSupport) {
        env.push({name: "AWS_VPC_CNI_NODE_PORT_SUPPORT", value: args.nodePortSupport ? "true" : "false"});
    }
    if (args.customNetworkConfig) {
        env.push({name: "AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG", value: args.customNetworkConfig ? "true" : "false"});
    }
    if (args.externalSnat) {
        env.push({name: "AWS_VPC_K8S_CNI_EXTERNALSNAT", value: args.externalSnat ? "true" : "false"});
    }
    if (args.warmEniTarget) {
        env.push({name: "WARM_ENI_TARGET", value: args.warmEniTarget.toString()});
    } else {
        env.push({name: "WARM_ENI_TARGET", value: "1"});
    }
    if (args.warmIpTarget) {
        env.push({name: "WARM_IP_TARGET", value: args.warmIpTarget.toString()});
    }
    if (args.warmPrefixTarget) {
        env.push({name: "WARM_PREFIX_TARGET", value: args.warmPrefixTarget.toString()});
    }
    if (args.enablePrefixDelegation) {
        env.push({name: "ENABLE_PREFIX_DELEGATION ", value: args.enablePrefixDelegation.toString()});
    }
    if (args.logLevel) {
        env.push({name: "AWS_VPC_K8S_CNI_LOGLEVEL", value: args.logLevel.toString()});
    } else {
        env.push({name: "AWS_VPC_K8S_CNI_LOGLEVEL", value: "DEBUG"});
    }
    if (args.logFile) {
        env.push({name: "AWS_VPC_K8S_CNI_LOG_FILE", value: args.logFile.toString()});
    } else {
        env.push({name: "AWS_VPC_K8S_CNI_LOG_FILE", value: "/host/var/log/aws-routed-eni/ipamd.log"});
    }
    if (args.vethPrefix) {
        env.push({name: "AWS_VPC_K8S_CNI_VETHPREFIX", value: args.vethPrefix.toString()});
    } else {
        env.push({name: "AWS_VPC_K8S_CNI_VETHPREFIX", value: "eni"});
    }
    if (args.eniMtu) {
        env.push({name: "AWS_VPC_ENI_MTU", value: args.eniMtu.toString()});
    } else {
        env.push({name: "AWS_VPC_ENI_MTU", value: "9001"});
    }
    if (args.image) {
        daemonSet.spec.template.spec.containers[0].image = args.image.toString();
    }
    if (args.initImage) {
        daemonSet.spec.template.spec.initContainers[0].image = args.initImage.toString();
    }
    if (args.eniConfigLabelDef) {
        env.push({name: "ENI_CONFIG_LABEL_DEF", value: args.eniConfigLabelDef.toString()});
    }
    if (args.pluginLogLevel) {
        env.push({name: "AWS_VPC_K8S_PLUGIN_LOG_LEVEL", value: args.pluginLogLevel.toString()});
    } else {
        env.push({name: "AWS_VPC_K8S_PLUGIN_LOG_LEVEL", value: "DEBUG"});
    }
    if (args.pluginLogFile) {
        env.push({name: "AWS_VPC_K8S_PLUGIN_LOG_FILE", value: args.pluginLogFile.toString()});
    } else {
        env.push({name: "AWS_VPC_K8S_PLUGIN_LOG_FILE", value: "/var/log/aws-routed-eni/plugin.log"});
    }
    if (args.enablePodEni) {
        env.push({name: "ENABLE_POD_ENI", value: args.enablePodEni ? "true" : "false"});
    } else {
        env.push({name: "ENABLE_POD_ENI", value: "false"});
    }
    if (args.disableTcpEarlyDemux) {
        initEnv.push({name: "DISABLE_TCP_EARLY_DEMUX", value: args.disableTcpEarlyDemux ? "true" : "false"});
    } else {
        initEnv.push({name: "DISABLE_TCP_EARLY_DEMUX", value: "false"});
    }
    if (args.cniConfigureRpfilter) {
        env.push({name: "AWS_VPC_K8S_CNI_CONFIGURE_RPFILTER", value: args.cniConfigureRpfilter ? "true" : "false"});
    } else {
        env.push({name: "AWS_VPC_K8S_CNI_CONFIGURE_RPFILTER", value: "false"});
    }
    if (args.cniCustomNetworkCfg) {
        env.push({name: "AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG", value: args.cniCustomNetworkCfg ? "true" : "false"});
    } else {
        env.push({name: "AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG", value: "false"});
    }
    if (args.cniExternalSnat) {
        env.push({name: "AWS_VPC_K8S_CNI_EXTERNALSNAT", value: args.cniExternalSnat ? "true" : "false"});
    } else {
        env.push({name: "AWS_VPC_K8S_CNI_EXTERNALSNAT", value: "false"});
    }
    if (args.securityContextPrivileged) {
        securityContext.privileged = args.securityContextPrivileged;
    }
    // Return the computed YAML.
    return cniYaml.map(o => `---\n${jsyaml.safeDump(o)}`).join("");
}

function applyVpcCniYaml(args: VpcCniInputs) {
    // Check to ensure that kubectl is installed, as we'll need it in order to deploy k8s resources below.
    try {
        which.sync("kubectl");
    } catch (err) {
        throw new Error("Could not set VPC CNI options: kubectl is missing. See https://kubernetes.io/docs/tasks/tools/install-kubectl/#install-kubectl for installation instructions.");
    }

    const yamlPath = path.join(__dirname, "..", "..", "cni", "aws-k8s-cni.yaml");
    const cniYamlText = fs.readFileSync(yamlPath).toString();

    const kubeconfig: string = typeof args.kubeconfig === "string"
        ? args.kubeconfig
        : JSON.stringify(args);

    // Dump the kubeconfig to a file.
    const tmpKubeconfig = tmp.fileSync();
    fs.writeFileSync(tmpKubeconfig.fd, kubeconfig);

    // Compute the required CNI YAML and dump it to a file.
    const tmpYaml = tmp.fileSync();
    fs.writeFileSync(tmpYaml.fd, computeVpcCniYaml(cniYamlText, args));

    // Call kubectl to apply the YAML.
    childProcess.execSync(`kubectl apply -f ${tmpYaml.name}`, {
        env: { ...process.env, "KUBECONFIG": tmpKubeconfig.name },
    });
}

/** @internal */
export function vpcCniProviderFactory(): pulumi.provider.Provider {
    return {
        check: (urn: pulumi.URN, olds: any, news: any) => {
            let inputs = news;
            // Since this used to be implemented as a dynamic provider, if we have an old `__provider`
            // input, propagate it to the new inputs so the engine doesn't see a diff, to avoid any
            // unnecessary calls to `update`.
            if (olds.__provider && !news.__provider) {
                inputs = {
                    ...news,
                    __provider: olds.__provider,
                };
            }
            return Promise.resolve({ inputs });
        },
        create: (urn: pulumi.URN, inputs: any) => {
            try {
                applyVpcCniYaml(<VpcCniInputs>inputs);
            } catch (e) {
                return Promise.reject(e);
            }
            return Promise.resolve({id: crypto.randomBytes(8).toString("hex"), outs: {}});
        },
        update: (id: pulumi.ID, urn: pulumi.URN, olds: any, news: any) => {
            try {
                applyVpcCniYaml(<VpcCniInputs>news);
            } catch (e) {
                return Promise.reject(e);
            }
            return Promise.resolve({outs: {}});
        },
        version: "", // ignored
    };
}
