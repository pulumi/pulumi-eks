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

export type CpuArchitecture = "arm64" | "x86_64";
export type ClusterVersion = string;

/* eslint-disable-next-line */ // Generating the enum object for OperatingSystem like codegen does
export const OperatingSystem = {
    AL2: "AL2",
    AL2023: "AL2023",
    Bottlerocket: "Bottlerocket",
} as const;

/**
 * The AMI families supported by the component.
 */
export type OperatingSystem = (typeof OperatingSystem)[keyof typeof OperatingSystem]; // eslint-disable-line no-redeclare
export const DEFAULT_OS = OperatingSystem.AL2023;

export interface AmiMetadata {
    os: OperatingSystem;
    gpuSupport: boolean;
    architecture: CpuArchitecture;
    // Function to get the SSM parameter name of the AMI
    ssmParameterName: (arg: ClusterVersion) => string;

    // Some AMI types were previously exposed by a part of their SSM parameter name. This only works for AL2 & AL2023, so to support the
    // other AMIs we need to refer to them by their EKS AMI type. This is for backwards compatibility.
    aliases?: string[];
}

// metadata for the EKS optimized AMIs. See https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-amis.html
const amiTypeMetadata: { [key in AmiType]: AmiMetadata } = {
    AL2_x86_64: {
        os: OperatingSystem.AL2,
        gpuSupport: false,
        architecture: "x86_64",
        ssmParameterName: (clusterVersion: ClusterVersion) =>
            `/aws/service/eks/optimized-ami/${clusterVersion}/amazon-linux-2/recommended/image_id`,

        aliases: ["amazon-linux-2"],
    },
    AL2_x86_64_GPU: {
        os: OperatingSystem.AL2,
        gpuSupport: true,
        architecture: "x86_64",
        ssmParameterName: (clusterVersion: ClusterVersion) =>
            `/aws/service/eks/optimized-ami/${clusterVersion}/amazon-linux-2-gpu/recommended/image_id`,

        aliases: ["amazon-linux-2-gpu"],
    },
    AL2_ARM_64: {
        os: OperatingSystem.AL2,
        gpuSupport: false,
        architecture: "arm64",
        ssmParameterName: (clusterVersion: ClusterVersion) =>
            `/aws/service/eks/optimized-ami/${clusterVersion}/amazon-linux-2-arm64/recommended/image_id`,

        aliases: ["amazon-linux-2-arm"],
    },
    AL2023_x86_64_STANDARD: {
        os: OperatingSystem.AL2023,
        gpuSupport: false,
        architecture: "x86_64",
        ssmParameterName: (clusterVersion: ClusterVersion) =>
            `/aws/service/eks/optimized-ami/${clusterVersion}/amazon-linux-2023/x86_64/standard/recommended/image_id`,

        aliases: ["amazon-linux-2023/x86_64/standard"],
    },
    AL2023_ARM_64_STANDARD: {
        os: OperatingSystem.AL2023,
        gpuSupport: false,
        architecture: "arm64",
        ssmParameterName: (clusterVersion: ClusterVersion) =>
            `/aws/service/eks/optimized-ami/${clusterVersion}/amazon-linux-2023/arm64/standard/recommended/image_id`,

        aliases: ["amazon-linux-2023/arm64/standard"],
    },
    AL2023_x86_64_NVIDIA: {
        os: OperatingSystem.AL2023,
        gpuSupport: true,
        architecture: "x86_64",
        ssmParameterName: (clusterVersion: ClusterVersion) =>
            `/aws/service/eks/optimized-ami/${clusterVersion}/amazon-linux-2023/x86_64/nvidia/recommended/image_id`,

        aliases: ["amazon-linux-2023/x86_64/nvidia"],
    },
    BOTTLEROCKET_ARM_64: {
        os: OperatingSystem.Bottlerocket,
        gpuSupport: false,
        architecture: "arm64",
        ssmParameterName: (clusterVersion: ClusterVersion) =>
            `/aws/service/bottlerocket/aws-k8s-${clusterVersion}/arm64/latest/image_id`,
    },
    BOTTLEROCKET_x86_64: {
        os: OperatingSystem.Bottlerocket,
        gpuSupport: false,
        architecture: "x86_64",
        ssmParameterName: (clusterVersion: ClusterVersion) =>
            `/aws/service/bottlerocket/aws-k8s-${clusterVersion}/x86_64/latest/image_id`,
    },
    BOTTLEROCKET_ARM_64_NVIDIA: {
        os: OperatingSystem.Bottlerocket,
        gpuSupport: true,
        architecture: "arm64",
        ssmParameterName: (clusterVersion: ClusterVersion) =>
            `/aws/service/bottlerocket/aws-k8s-${clusterVersion}-nvidia/arm64/latest/image_id`,
    },
    BOTTLEROCKET_x86_64_NVIDIA: {
        os: OperatingSystem.Bottlerocket,
        gpuSupport: true,
        architecture: "x86_64",
        ssmParameterName: (clusterVersion: ClusterVersion) =>
            `/aws/service/bottlerocket/aws-k8s-${clusterVersion}-nvidia/x86_64/latest/image_id`,
    },
};

export function getAmiMetadata(amiType: AmiType): AmiMetadata {
    return amiTypeMetadata[amiType];
}

/* eslint-disable-next-line */ // Generating the enum object for AmiType like codegen does
export const AmiType = {
    AL2X86_64: "AL2_x86_64",
    AL2X86_64GPU: "AL2_x86_64_GPU",
    AL2Arm64: "AL2_ARM_64",

    AL2023X86_64Standard: "AL2023_x86_64_STANDARD",
    AL2023Arm64Standard: "AL2023_ARM_64_STANDARD",
    AL2023X86_64Nvidia: "AL2023_x86_64_NVIDIA",

    BottlerocketArm64: "BOTTLEROCKET_ARM_64",
    BottlerocketX86_64: "BOTTLEROCKET_x86_64",
    BottlerocketArm64Nvidia: "BOTTLEROCKET_ARM_64_NVIDIA",
    BottlerocketX86_64Nvidia: "BOTTLEROCKET_x86_64_NVIDIA",

    // Windows AMIs are not supported right now
} as const;

/**
 * The AMI types supported by the component. From here: https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateNodegroup.html
 */
export type AmiType = (typeof AmiType)[keyof typeof AmiType]; // eslint-disable-line no-redeclare

export const amiTypeValues: AmiType[] = Object.values(AmiType);

function isAmiType(value: string): value is AmiType {
    return Object.values(AmiType).includes(value as AmiType);
}

const amiTypeAliases: { [key: string]: AmiType } =
    Object.entries(amiTypeMetadata)
        .flatMap(([key, value]) => {
            return value.aliases?.map((alias) => {
                return { [alias]: key as AmiType };
            });
        })
        .reduce((acc, val) => (val ? Object.assign(acc ?? {}, val) : acc ?? {})) ?? {};

/**
 * Converts the given string to an `AmiType` or returns `undefined` if it's not valid.
 * Takes into account previous AMI type aliases like "amazon-linux-2", "amazon-linux-2-gpu" and "amazon-linux-2-arm".
 *
 * @param amiType - The AMI type to convert.
 * @returns The corresponding `AmiType` or `undefined`.
 */
export function toAmiType(str: string): AmiType | undefined {
    if (isAmiType(str)) {
        return str;
    }

    return amiTypeAliases[str];
}

/**
 * Retrieves the operating system based on the provided AMI type and operating system.
 * If the operating system is specified and the AMI type is not, it returns the specified operating system.
 * If neither the AMI type nor the operating system is specified, it returns the default operating system.
 * If the AMI type is specified, it resolves the AMI type and retrieves the operating system from the metadata.
 * If the operating system is specified and it does not match the detected operating system of the AMI type,
 * it throws a ResourceError.
 * @param amiType - The AMI type.
 * @param operatingSystem - The operating system.
 * @returns The resolved operating system.
 * @throws {pulumi.ResourceError} If the AMI type is unknown or if the specified operating system does not match the detected operating system.
 */
export function getOperatingSystem(
    amiType: string | undefined,
    operatingSystem: OperatingSystem | undefined,
): OperatingSystem {
    if (operatingSystem && !amiType) {
        return operatingSystem;
    } else if (!amiType) {
        return operatingSystem ?? DEFAULT_OS;
    }

    const resolvedAmiType = toAmiType(amiType);
    if (!resolvedAmiType) {
        throw new pulumi.InputPropertyError({
            propertyPath: "amiType",
            reason: `Cannot determine OS of unknown AMI type: ${amiType}`,
        });
    }

    const resolvedOs = getAmiMetadata(resolvedAmiType).os;

    // if users provided both OS and AMI type, we should check if they match
    if (operatingSystem && operatingSystem !== resolvedOs) {
        throw new pulumi.InputPropertyError({
            propertyPath: "operatingSystem",
            reason: `Operating system '${operatingSystem}' does not match the detected operating system '${resolvedOs}' of AMI type '${amiType}'.`,
        });
    }

    return resolvedOs;
}

/**
 * Retrieves the AMI type based on the specified operating system, GPU support, and CPU architecture.
 *
 * @param os - The operating system of the AMI.
 * @param gpuSupport - A boolean indicating whether the AMI should support GPUs.
 * @param architecture - The CPU architecture of the AMI.
 * @returns The AMI type that matches the specified criteria.
 * @throws An error if no AMI type is found for the specified criteria.
 */
export function getAmiType(
    os: OperatingSystem,
    gpuSupport: boolean,
    architecture: CpuArchitecture,
    parent: pulumi.Resource | undefined,
): AmiType {
    for (const amiType of amiTypeValues) {
        const metadata = getAmiMetadata(amiType);
        if (
            metadata.os === os &&
            metadata.gpuSupport === gpuSupport &&
            metadata.architecture === architecture
        ) {
            return amiType;
        }
    }

    throw new pulumi.ResourceError(
        `No AMI type found for OS: ${os}, GPU support: ${gpuSupport}, architecture: ${architecture}`,
        parent,
    );
}
