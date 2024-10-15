// Copyright 2016-2024, Pulumi Corporation.
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

import { OperatingSystem } from "./ami";
import { NodeadmOptions } from "./nodegroup";
import * as jsyaml from "js-yaml";
import * as toml from "@iarna/toml";
import * as ipaddr from "ipaddr.js";
import { isObject } from "./utilities";

// linux is the default user data type for AMIs that use the eks bootstrap script. (e.g. AL2)
// nodeadm is the user data type for AMIs that use nodeadm to bootstrap the node. (e.g. AL2023)
// bottlerocket is the user data type for Bottlerocket AMIs.
export type UserDataType = "linux" | "nodeadm" | "bottlerocket";
export type NodeGroupType = "managed" | "self-managed-v1" | "self-managed-v2";

const osUserDataType: { [key in OperatingSystem]: UserDataType } = {
    AL2: "linux",
    AL2023: "nodeadm",
    Bottlerocket: "bottlerocket",
};

export interface ClusterMetadata {
    // the name of the cluster
    name: string;
    // the endpoint of the Kubernetes cluster
    apiServerEndpoint: string;
    // base64 encoded certificate authority data
    certificateAuthority: string;
    // the cluster service CIDR
    serviceCidr: string;
}

interface Taint {
    value: string | undefined;
    effect: "NoSchedule" | "NoExecute" | "PreferNoSchedule";
}

// base arguments for all types of node groups
interface BaseUserDataArgs {
    nodeGroupType: NodeGroupType;

    kubeletExtraArgs: string | undefined;
    bootstrapExtraArgs: string | undefined;
    labels: { [key: string]: string } | undefined;
    taints: { [key: string]: Taint } | undefined;

    /**
     * User specified code to run on node startup. This code is expected to
     * handle the full AWS EKS bootstrapping code.
     *
     * See for more details: https://docs.aws.amazon.com/eks/latest/userguide/worker.html
     */
    userDataOverride: string | undefined;
    bottlerocketSettings: object | undefined;
    nodeadmExtraOptions:
        | {
              content: string;
              contentType: string;
          }[]
        | undefined;
}

// common arguments of self-managed node groups
interface BaseSelfManagedNodeUserDataArgs extends BaseUserDataArgs {
    nodeGroupType: "self-managed-v1" | "self-managed-v2";
    stackName: string;

    /**
     * Extra code to run on node startup. This code will run after the AWS EKS bootstrapping
     * code and before the node signals its readiness. This code must be a typical user data script,
     * critically it must begin with an interpreter directive (i.e. a `#!`).
     */
    extraUserData: string | undefined;
}

type CustomUserDataArgs = Pick<UserDataArgs, "bootstrapExtraArgs" | "kubeletExtraArgs"> & {
    bottlerocketSettings: pulumi.Input<object> | undefined;
    nodeadmExtraOptions: pulumi.Input<pulumi.Input<NodeadmOptions>[]> | undefined;
};

export interface ManagedNodeUserDataArgs extends BaseUserDataArgs {
    nodeGroupType: "managed";
}

export interface SelfManagedV1NodeUserDataArgs extends BaseSelfManagedNodeUserDataArgs {
    nodeGroupType: "self-managed-v1";
    awsRegion: string;
}

export interface SelfManagedV2NodeUserDataArgs extends BaseSelfManagedNodeUserDataArgs {
    nodeGroupType: "self-managed-v2";
}

export type UserDataArgs =
    | ManagedNodeUserDataArgs
    | SelfManagedV1NodeUserDataArgs
    | SelfManagedV2NodeUserDataArgs;

export function isManagedNodeUserDataArgs(args: UserDataArgs): args is ManagedNodeUserDataArgs {
    return args.nodeGroupType === "managed";
}

export function isSelfManagedV1NodeUserDataArgs(
    args: UserDataArgs,
): args is SelfManagedV1NodeUserDataArgs {
    return args.nodeGroupType === "self-managed-v1";
}

export function isSelfManagedV2NodeUserDataArgs(
    args: UserDataArgs,
): args is SelfManagedV2NodeUserDataArgs {
    return args.nodeGroupType === "self-managed-v2";
}

export function isSelfManagedNodeUserDataArgs(
    args: UserDataArgs,
): args is SelfManagedV1NodeUserDataArgs | SelfManagedV2NodeUserDataArgs {
    return args.nodeGroupType === "self-managed-v1" || args.nodeGroupType === "self-managed-v2";
}

export const customUserDataArgs: (keyof CustomUserDataArgs)[] = [
    "bootstrapExtraArgs",
    "kubeletExtraArgs",
    "bottlerocketSettings",
    "nodeadmExtraOptions",
];

/**
 If the user specifies any of the customUserDataArgs, we need to create a base64 encoded user data script.
 */
export function requiresCustomUserData(args: CustomUserDataArgs): boolean {
    return customUserDataArgs.some((key) => args[key] !== undefined);
}

/**
 * Creates user data based on the operating system, cluster metadata, and user data arguments.
 *
 * @param os - The operating system.
 * @param clusterMetadata - The cluster metadata.
 * @param userDataArgs - The user data arguments.
 * @returns The generated user data as a string.
 * @throws {pulumi.ResourceError} If creating user data for the specified operating system is not supported.
 */
export function createUserData(
    os: OperatingSystem,
    clusterMetadata: ClusterMetadata,
    userDataArgs: UserDataArgs,
    parent: pulumi.Resource | undefined,
): string {
    // if the user has provided a custom user data script, use that
    if (userDataArgs.userDataOverride) {
        return userDataArgs.userDataOverride;
    }

    const userDataType = osUserDataType[os];

    switch (userDataType) {
        case "linux":
            return createLinuxUserData(clusterMetadata, userDataArgs, parent);
        case "nodeadm":
            return createNodeadmUserData(clusterMetadata, userDataArgs, parent);
        case "bottlerocket":
            return createBottlerocketUserData(clusterMetadata, userDataArgs, parent);
        default:
            // ensures this switch/case is exhaustive
            const exhaustiveCheck: never = userDataType;
            throw new Error(`Unknown user data type: ${exhaustiveCheck}`);
    }
}

function createLinuxUserData(
    clusterMetadata: ClusterMetadata,
    args: UserDataArgs,
    parent: pulumi.Resource | undefined,
): string {
    if (
        (isSelfManagedV2NodeUserDataArgs(args) || isManagedNodeUserDataArgs(args)) &&
        args.bottlerocketSettings
    ) {
        throw new pulumi.ResourceError(
            "The 'bottlerocketSettings' argument is not supported for Linux based user data.",
            parent,
        );
    }

    // build the bootstrap arguments, they can also include kubelet flags if the user has provided them
    const kubeletExtraArgs = buildKubeletFlags(args);
    let bootstrapExtraArgs = args.bootstrapExtraArgs ? " " + args.bootstrapExtraArgs : "";
    if (kubeletExtraArgs.length === 1) {
        // For backward compatibility with previous versions of this package, don't wrap a single argument with `''`.
        bootstrapExtraArgs += ` --kubelet-extra-args ${kubeletExtraArgs[0]}`;
    } else if (kubeletExtraArgs.length > 1) {
        bootstrapExtraArgs += ` --kubelet-extra-args '${kubeletExtraArgs.join(" ")}'`;
    }

    // This is the base user data script that will be used to bootstrap the nodes
    const baseUserData = `#!/bin/bash

/etc/eks/bootstrap.sh --apiserver-endpoint "${clusterMetadata.apiServerEndpoint}" --b64-cluster-ca "${clusterMetadata.certificateAuthority}" "${clusterMetadata.name}"${bootstrapExtraArgs}`;

    // managed node groups must be in multi-part MIME format
    // see: https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html#launch-template-user-data
    if (isManagedNodeUserDataArgs(args)) {
        return `MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="==MYBOUNDARY=="

--==MYBOUNDARY==
Content-Type: text/x-shellscript; charset="us-ascii"

${baseUserData}
--==MYBOUNDARY==--`;
    }

    let extraUserData = "";
    if (isSelfManagedNodeUserDataArgs(args) && args.extraUserData && args.extraUserData !== "") {
        extraUserData = `cat >/opt/user-data <<${args.stackName}-user-data
${args.extraUserData}
${args.stackName}-user-data
chmod +x /opt/user-data
/opt/user-data
`;
    }

    // We always add extraUserData to the user data script, even if it's empty. This is for backwards compatibility.
    const userData = `${baseUserData}
${extraUserData}
`;

    // self-managed-v1 based node groups use cloudformation to bootstrap the nodes.
    // we need to signal to CFN that the nodes have been  successfully created by using the cfn-signal script.
    // see: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-signal.html
    return !isSelfManagedV1NodeUserDataArgs(args)
        ? userData
        : `${userData}/opt/aws/bin/cfn-signal --exit-code $? --stack ${args.stackName} --resource NodeGroup --region ${args.awsRegion}\n`;
}

// nodeadm based user data is a multi-part MIME document that contains EKS NodeConfig as yaml and optional shell scripts
// for more details see: https://awslabs.github.io/amazon-eks-ami/nodeadm/
function createNodeadmUserData(
    clusterMetadata: ClusterMetadata,
    args: UserDataArgs,
    parent: pulumi.Resource | undefined,
): string {
    if (
        (isSelfManagedV2NodeUserDataArgs(args) || isManagedNodeUserDataArgs(args)) &&
        args.bottlerocketSettings
    ) {
        throw new pulumi.ResourceError(
            "The 'bottlerocketSettings' argument is not supported for nodeadm based user data.",
            parent,
        );
    }

    if (args.bootstrapExtraArgs && args.bootstrapExtraArgs !== "") {
        throw new pulumi.ResourceError(
            "The 'bootstrapExtraArgs' argument is not supported for nodeadm based user data.",
            parent,
        );
    }

    const nodeadmSkeleton = {
        apiVersion: "node.eks.aws/v1alpha1",
        kind: "NodeConfig",
    };

    const baseConfig = {
        ...nodeadmSkeleton,
        spec: {
            cluster: {
                name: clusterMetadata.name,
                apiServerEndpoint: clusterMetadata.apiServerEndpoint,
                certificateAuthority: clusterMetadata.certificateAuthority,
                cidr: clusterMetadata.serviceCidr,
            },
        },
    };

    const nodeadmPrefix = "---\n";

    const parts = [
        {
            contentType: "application/node.eks.aws",
            content: nodeadmPrefix + jsyaml.dump(baseConfig),
        },
    ];

    // nodeadm config gets iteratively merged together, so we can add a new section for the kubelet flags
    const kubeletFlags = buildKubeletFlags(args);
    if (kubeletFlags.length > 0) {
        parts.push({
            contentType: "application/node.eks.aws",
            content:
                nodeadmPrefix +
                jsyaml.dump({
                    ...nodeadmSkeleton,
                    spec: {
                        kubelet: {
                            flags: kubeletFlags,
                        },
                    },
                }),
        });
    }

    // add extra nodeadm options if provided
    if (args.nodeadmExtraOptions) {
        for (const option of args.nodeadmExtraOptions) {
            parts.push(option);
        }
    }

    // TODO[pulumi/pulumi-eks#1195] expose extra nodeadm config options in the schema
    if (isSelfManagedNodeUserDataArgs(args) && args.extraUserData && args.extraUserData !== "") {
        parts.push({
            contentType: 'text/x-shellscript; charset="us-ascii"',
            content: args.extraUserData,
        });
    }

    // self-managed-v1 based node groups use cloudformation to bootstrap the nodes.
    // we need to signal to CFN that the nodes have been  successfully created by using the cfn-signal script.
    // see: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-signal.html
    if (isSelfManagedV1NodeUserDataArgs(args)) {
        parts.push({
            contentType: 'text/x-shellscript; charset="us-ascii"',
            content: `#!/bin/bash

/opt/aws/bin/cfn-signal --exit-code $? --stack ${args.stackName} --resource NodeGroup --region ${args.awsRegion}
`,
        });
    }

    return assembleNodeadmUserData(parts);
}

function assembleNodeadmUserData(parts: { contentType: string; content: string }[]): string {
    const boundary = "BOUNDARY";
    const header = `MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="${boundary}"

`;

    let userData = header;
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        userData += `--${boundary}
Content-Type: ${part.contentType}

${part.content}
`;
    }

    return `${userData}--${boundary}--\n`;
}

/**
 * Builds the kubelet flags based on the provided arguments. If the user has provided labels or taints, they will be
 * added to the kubelet flags. This ensures that the kubelet registers the node with the correct labels and taints.
 *
 * @param args - The UserDataArgs object containing the arguments.
 * @returns An array of strings representing the kubelet flags.
 */
function buildKubeletFlags(args: UserDataArgs): string[] {
    const kubeletExtraArgs = args.kubeletExtraArgs ? args.kubeletExtraArgs.split(" ") : [];
    if (args.labels) {
        const parts = [];
        for (const key of Object.keys(args.labels)) {
            parts.push(key + "=" + args.labels[key]);
        }
        if (parts.length > 0) {
            kubeletExtraArgs.push("--node-labels=" + parts.join(","));
        }
    }
    if (args.taints) {
        const parts = [];
        for (const key of Object.keys(args.taints)) {
            const taint = args.taints[key];
            // taints are represented as key=value:effect or key:effect if value is empty. See https://github.com/kubernetes/kubernetes/blob/de8f6b0db7a6d7506b7544021be413d3faa47078/pkg/apis/core/taint.go#L30
            if (taint.value) {
                parts.push(key + "=" + taint.value + ":" + taint.effect);
            } else {
                parts.push(key + ":" + taint.effect);
            }
        }
        if (parts.length > 0) {
            kubeletExtraArgs.push("--register-with-taints=" + parts.join(","));
        }
    }
    return kubeletExtraArgs;
}

/**
 * Bottlerocket uses TOML for its configuration. The base settings will get merged with user defined ones.
 * For more details see https://bottlerocket.dev/en/os/1.20.x/api/settings/
 */
function createBottlerocketUserData(
    clusterMetadata: ClusterMetadata,
    args: UserDataArgs,
    parent: pulumi.Resource | undefined,
): string {
    if (args.bootstrapExtraArgs && args.bootstrapExtraArgs !== "") {
        throw new pulumi.ResourceError(
            "The 'bootstrapExtraArgs' argument is not supported with Bottlerocket.",
            parent,
        );
    }

    if (args.kubeletExtraArgs && args.kubeletExtraArgs !== "") {
        throw new pulumi.ResourceError(
            "The 'kubeletExtraArgs' argument is not supported with Bottlerocket.",
            parent,
        );
    }

    if (isSelfManagedNodeUserDataArgs(args) && args.extraUserData && args.extraUserData !== "") {
        throw new pulumi.ResourceError(
            "Bottlerocket does not support running scripts as part of the user data. If you need to run scripts, please use a different OS.",
            parent,
        );
    }

    const clusterDnsIp = getClusterDnsIp(clusterMetadata.serviceCidr, parent);
    const baseConfig = {
        settings: {
            kubernetes: {
                "cluster-name": clusterMetadata.name,
                "api-server": clusterMetadata.apiServerEndpoint,
                "cluster-certificate": clusterMetadata.certificateAuthority,
                "cluster-dns-ip": clusterDnsIp,
            },
        },
    };

    if (args.labels) {
        Object.assign(baseConfig.settings.kubernetes, {
            "node-labels": args.labels,
        });
    }

    if (args.taints) {
        const taints = {};
        const records = Object.entries(args.taints).map(([key, taint]) => {
            // empty taint values are represented as an empty string, see https://github.com/bottlerocket-os/bottlerocket/pull/1406
            return { [key]: `${taint.value ?? ""}:${taint.effect}` };
        });
        Object.assign(taints, ...records);

        Object.assign(baseConfig.settings.kubernetes, {
            "node-taints": taints,
        });
    }

    const bottlerocketSettings: any = args.bottlerocketSettings ?? {};

    if (!("settings" in bottlerocketSettings && isObject(bottlerocketSettings.settings))) {
        bottlerocketSettings.settings = {};
    }
    if (
        !(
            "kubernetes" in bottlerocketSettings.settings &&
            isObject(bottlerocketSettings.settings.kubernetes)
        )
    ) {
        bottlerocketSettings.settings.kubernetes = {};
    }

    if (isSelfManagedV1NodeUserDataArgs(args)) {
        if (!("cloudformation" in bottlerocketSettings.settings)) {
            bottlerocketSettings.settings.cloudformation = {};
        }

        bottlerocketSettings.settings.cloudformation = {
            "should-signal": true,
            "stack-name": args.stackName,
            "logical-resource-id": "NodeGroup",
            ...bottlerocketSettings.settings.cloudformation,
        };
    }

    // merge the base settings with the user provided settings
    bottlerocketSettings.settings.kubernetes = {
        ...baseConfig.settings.kubernetes,
        ...bottlerocketSettings.settings.kubernetes,
    };

    return toml.stringify(normalizeProperties(bottlerocketSettings));
}

function normalizeProperties(obj: any): any {
    if (!isObject(obj)) {
        return obj;
    }

    return Object.fromEntries(
        Object.entries(obj)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => {
                return [key, normalizeProperties(value)];
            }),
    );
}

/**
 * Calculates the cluster DNS IP address based on the provided service CIDR. The cluster DNS IP address is the
 * 10th IP address in the service CIDR. See: https://github.com/awslabs/amazon-eks-ami/blob/4f9b5560aee4dd9adbd4f1c711d237fd6f0b4e70/templates/al2/runtime/bootstrap.sh#L462-L485
 *
 * The calculation is done by round tripping the network address of the CIDR to a big integer, adding 10 to it, and then converting it back.
 * This way the calculation is safe for both IPv4 and IPv6.
 *
 * @param serviceCidr - The service CIDR to parse and calculate the cluster DNS IP from.
 * @returns The cluster DNS IP address.
 * @throws {pulumi.ResourceError} If the service CIDR fails to parse or the cluster DNS IP is out of range.
 */
export function getClusterDnsIp(serviceCidr: string, parent: pulumi.Resource | undefined): string {
    try {
        const [ip, _] = ipaddr.parseCIDR(serviceCidr);
        let networkAddress: ipaddr.IPv4 | ipaddr.IPv6;
        if (ip.kind() === "ipv6") {
            networkAddress = ipaddr.IPv6.networkAddressFromCIDR(serviceCidr);
        } else {
            networkAddress = ipaddr.IPv4.networkAddressFromCIDR(serviceCidr);
        }

        const networkAddressHex = networkAddress
            .toByteArray()
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
        const clusterDnsIpDec = BigInt(`0x${networkAddressHex}`) + BigInt(10);

        // pad the hex string to the correct length (v4 has 8 nibbles and v6 32)
        const clusterDnsIpHex = clusterDnsIpDec
            .toString(16)
            .padStart(ip.kind() === "ipv6" ? 32 : 8, "0");

        const newBuf = Buffer.from(clusterDnsIpHex, "hex");
        const clusterDnsIp = ipaddr.fromByteArray(Array.from(newBuf));
        return clusterDnsIp.toString();
    } catch (e) {
        throw new pulumi.ResourceError(
            `Couldn't calculate the cluster dns ip based on the service CIDR. ${e.message}`,
            parent,
        );
    }
}
