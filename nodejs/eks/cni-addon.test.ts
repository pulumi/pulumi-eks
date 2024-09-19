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
import { CniEnvVariables, ComputedEnv, computeEnv } from "./cni-addon";

describe("computeEnv", () => {
    it("should set default values when no arguments are provided", async () => {
        const args = {};
        const result = pulumi.output(computeEnv(args));

        await new Promise<pulumi.UnwrappedObject<ComputedEnv>>((resolve) =>
            result!.apply(resolve),
        ).then((result) => {
            expect(result).toMatchSnapshot();
        });
    });

    it("should set provided values correctly", async () => {
        const args: CniEnvVariables = {
            nodePortSupport: pulumi.output(true),
            customNetworkConfig: pulumi.output(true),
            warmEniTarget: pulumi.output(2),
            warmIpTarget: pulumi.output(3),
            warmPrefixTarget: pulumi.output(4),
            enablePrefixDelegation: pulumi.output(true),
            logLevel: pulumi.output("INFO"),
            logFile: pulumi.output("/custom/log/file"),
            vethPrefix: pulumi.output("customPrefix"),
            eniMtu: pulumi.output(1500),
            eniConfigLabelDef: pulumi.output("customLabel"),
            pluginLogLevel: pulumi.output("ERROR"),
            pluginLogFile: pulumi.output("/custom/plugin/log/file"),
            enablePodEni: pulumi.output(true),
            disableTcpEarlyDemux: pulumi.output(true),
            cniConfigureRpfilter: pulumi.output(true),
            cniCustomNetworkCfg: pulumi.output(true),
            cniExternalSnat: pulumi.output(true),
        };
        const result = pulumi.output(computeEnv(args));

        await new Promise<pulumi.UnwrappedObject<ComputedEnv>>((resolve) =>
            result!.apply(resolve),
        ).then((result) => {
            expect(result).toMatchSnapshot();
        });
    });

    it("should throw an error if both cniExternalSnat and externalSnat are provided", () => {
        const args = {
            cniExternalSnat: pulumi.output(true),
            externalSnat: pulumi.output(true),
        };

        expect(() => computeEnv(args)).toThrow(
            "Please specify one of `cniExternalSnat` or `externalSnat` in your VpcCniOptions",
        );
    });
});
