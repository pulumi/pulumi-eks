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
import { Taint } from "./nodegroup";
import * as jsyaml from "js-yaml";

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

/**
 * If the user specifies either kubeletExtraArgs or bootstrapExtraArgs, we need to create a base64 encoded user data script.
 */
export function requiresCustomUserData(
    args: Pick<UserDataArgs, "bootstrapExtraArgs" | "kubeletExtraArgs">,
): boolean {
    return args.kubeletExtraArgs !== undefined || args.bootstrapExtraArgs !== undefined;
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
): string {
    // if the user has provided a custom user data script, use that
    if (userDataArgs.userDataOverride) {
        return userDataArgs.userDataOverride;
    }

    const userDataType = osUserDataType[os];

    switch (userDataType) {
        case "linux":
            return createLinuxUserData(clusterMetadata, userDataArgs);
        case "nodeadm":
            return createNodeadmUserData(clusterMetadata, userDataArgs);
        case "bottlerocket":
            // TODO: support bottlerocket user data
            throw new pulumi.ResourceError(
                `Creating user data for OS '${os}' is not supported yet.`,
                undefined,
            );
        default:
            // ensures this switch/case is exhaustive
            const exhaustiveCheck: never = userDataType;
            throw new Error(`Unknown user data type: ${exhaustiveCheck}`);
    }
}

function createLinuxUserData(clusterMetadata: ClusterMetadata, args: UserDataArgs): string {
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
${extraUserData}`;

    // self-managed-v1 based node groups use cloudformation to bootstrap the nodes.
    // we need to signal to CFN that the nodes have been  successfully created by using the cfn-signal script.
    // see: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-signal.html
    const cfnSignal = isSelfManagedV1NodeUserDataArgs(args)
        ? `/opt/aws/bin/cfn-signal --exit-code $? --stack ${args.stackName} --resource NodeGroup --region ${args.awsRegion}`
        : "";

    return `${userData}
${cfnSignal}
`;
}

function createNodeadmUserData(clusterMetadata: ClusterMetadata, args: UserDataArgs): string {
    if (args.bootstrapExtraArgs) {
        throw new pulumi.ResourceError(
            "The 'bootstrapExtraArgs' argument is not supported for nodeadm based user data.",
            undefined,
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
            content: nodeadmPrefix + jsyaml.dump({
                ...nodeadmSkeleton,
                spec: {
                    kubelet: {
                        flags: kubeletFlags,
                    },
                },
            }),
        });
    }

    // TODO: expose extra nodeadm config options in the schema
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
            parts.push(key + "=" + taint.value + ":" + taint.effect);
        }
        if (parts.length > 0) {
            kubeletExtraArgs.push("--register-with-taints=" + parts.join(","));
        }
    }
    return kubeletExtraArgs;
}
