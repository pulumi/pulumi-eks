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

import {
    AmiType,
    DEFAULT_OS,
    getAmiType,
    getOperatingSystem,
    OperatingSystem,
    toAmiType,
} from "./ami";

describe("toAmiType", () => {
    test("should return the correct AmiType for valid aliases", () => {
        expect(toAmiType("amazon-linux-2")).toBe(AmiType.AL2X86_64);
        expect(toAmiType("amazon-linux-2-gpu")).toBe(AmiType.AL2X86_64GPU);
        expect(toAmiType("amazon-linux-2-arm")).toBe(AmiType.AL2Arm64);
        expect(toAmiType("amazon-linux-2023/x86_64/standard")).toBe(AmiType.AL2023X86_64Standard);
        expect(toAmiType("amazon-linux-2023/arm64/standard")).toBe(AmiType.AL2023Arm64Standard);
    });
    test("should return the correct AmiType for valid AmiType strings", () => {
        expect(toAmiType("AL2_x86_64")).toBe(AmiType.AL2X86_64);
        expect(toAmiType("AL2_x86_64_GPU")).toBe(AmiType.AL2X86_64GPU);
        expect(toAmiType("AL2_ARM_64")).toBe(AmiType.AL2Arm64);
        expect(toAmiType("AL2023_x86_64_STANDARD")).toBe(AmiType.AL2023X86_64Standard);
        expect(toAmiType("AL2023_ARM_64_STANDARD")).toBe(AmiType.AL2023Arm64Standard);
        expect(toAmiType("BOTTLEROCKET_ARM_64")).toBe(AmiType.BottlerocketArm64);
        expect(toAmiType("BOTTLEROCKET_X86_64")).toBe(AmiType.BottlerocketX86_64);
        expect(toAmiType("BOTTLEROCKET_ARM_64_NVIDIA")).toBe(AmiType.BottlerocketArm64Nvidia);
        expect(toAmiType("BOTTLEROCKET_x86_64_NVIDIA")).toBe(AmiType.BottlerocketX86_64Nvidia);
    });
    test("should return undefined for invalid aliases", () => {
        expect(toAmiType("invalid-alias")).toBeUndefined();
    });
});
describe("getOperatingSystem", () => {
    test("should return the provided operating system if available", () => {
        const operatingSystem = getOperatingSystem(undefined, OperatingSystem.AL2023);
        expect(operatingSystem).toBe(OperatingSystem.AL2023);
    });

    test("should return the default operating system if no AMI type or operating system is provided", () => {
        const operatingSystem = getOperatingSystem();
        expect(operatingSystem).toBe(DEFAULT_OS);
    });

    test("should resolve the operating system based on the provided AMI type", () => {
        const operatingSystem = getOperatingSystem("AL2023_ARM_64_STANDARD");
        expect(operatingSystem).toBe(OperatingSystem.AL2023);
    });

    test("should throw an error for unknown AMI type", () => {
        expect(() => {
            getOperatingSystem("unknown-ami-type");
        }).toThrow("Cannot determine OS of unknown AMI type: unknown-ami-type");
    });

    test("should throw an error if the operating system does not match the AMI type", () => {
        expect(() => {
            getOperatingSystem("AL2023_ARM_64_STANDARD", OperatingSystem.Bottlerocket);
        }).toThrow(
            "Operating system 'Bottlerocket' does not match the detected operating system 'AL2023' of AMI type 'AL2023_ARM_64_STANDARD'.",
        );
    });
});
describe("getAmiType", () => {
    test("should return the correct AmiType for the specified criteria", () => {
        expect(getAmiType(OperatingSystem.AL2, false, "x86_64")).toBe(AmiType.AL2X86_64);
        expect(getAmiType(OperatingSystem.AL2, true, "x86_64")).toBe(AmiType.AL2X86_64GPU);
        expect(getAmiType(OperatingSystem.AL2, false, "arm64")).toBe(AmiType.AL2Arm64);
        expect(getAmiType(OperatingSystem.AL2023, false, "x86_64")).toBe(
            AmiType.AL2023X86_64Standard,
        );
        expect(getAmiType(OperatingSystem.AL2023, false, "arm64")).toBe(
            AmiType.AL2023Arm64Standard,
        );
        expect(getAmiType(OperatingSystem.Bottlerocket, false, "arm64")).toBe(
            AmiType.BottlerocketArm64,
        );
        expect(getAmiType(OperatingSystem.Bottlerocket, false, "x86_64")).toBe(
            AmiType.BottlerocketX86_64,
        );
        expect(getAmiType(OperatingSystem.Bottlerocket, true, "arm64")).toBe(
            AmiType.BottlerocketArm64Nvidia,
        );
        expect(getAmiType(OperatingSystem.Bottlerocket, true, "x86_64")).toBe(
            AmiType.BottlerocketX86_64Nvidia,
        );
    });

    test("should throw an error if no AMI type is found for the specified criteria", () => {
        expect(() => {
            getAmiType(OperatingSystem.AL2, true, "arm64");
        }).toThrow("No AMI type found for OS: AL2, GPU support: true, architecture: arm64");
    });
});
