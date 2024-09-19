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
import { CniEnvVariables, ComputedEnv, computeEnv, mergeConfigurationValues } from "./cni-addon";

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

describe("mergeConfigurationValues", () => {
    it("should merge configuration values correctly", () => {
        const env = { VAR1: "value1", VAR2: "value2" };
        const initEnv = { INIT_VAR1: "initValue1", INIT_VAR2: "initValue2" };
        const enableNetworkPolicy = true;
        const configurationValues = { existingKey: "existingValue" };

        const result = mergeConfigurationValues(
            env,
            initEnv,
            enableNetworkPolicy,
            configurationValues,
        );

        expect(result).toEqual({
            existingKey: "existingValue",
            enableNetworkPolicy: "true",
            env: { VAR1: "value1", VAR2: "value2" },
            init: { env: { INIT_VAR1: "initValue1", INIT_VAR2: "initValue2" } },
        });
    });

    it("should handle undefined configurationValues", () => {
        const env = { VAR1: "value1" };
        const initEnv = { INIT_VAR1: "initValue1" };
        const enableNetworkPolicy = false;

        const result = mergeConfigurationValues(env, initEnv, enableNetworkPolicy, undefined);

        expect(result).toEqual({
            enableNetworkPolicy: "false",
            env: { VAR1: "value1" },
            init: { env: { INIT_VAR1: "initValue1" } },
        });
    });

    it("should merge env and init.env keys", () => {
        const env = { VAR1: "value1", EXISTING_ENV_VAR: "will be overwritten" };
        const initEnv = { INIT_VAR1: "initValue1", EXISTING_INIT_ENV_VAR: "will be overwritten" };
        const enableNetworkPolicy = true;
        const configurationValues = {
            env: { EXISTING_ENV_VAR: "existingEnvValue", VAR2: "value2" },
            init: {
                env: { EXISTING_INIT_ENV_VAR: "existingInitEnvValue", INIT_VAR2: "initValue2" },
            },
        };

        const result = mergeConfigurationValues(
            env,
            initEnv,
            enableNetworkPolicy,
            configurationValues,
        );

        expect(result).toEqual({
            enableNetworkPolicy: "true",
            env: { VAR1: "value1", EXISTING_ENV_VAR: "existingEnvValue", VAR2: "value2" },
            init: {
                env: {
                    INIT_VAR1: "initValue1",
                    EXISTING_INIT_ENV_VAR: "existingInitEnvValue",
                    INIT_VAR2: "initValue2",
                },
            },
        });
    });

    it("should handle missing enableNetworkPolicy", () => {
        const env = { VAR1: "value1" };
        const initEnv = { INIT_VAR1: "initValue1" };
        const configurationValues = { existingKey: "existingValue" };

        const result = mergeConfigurationValues(env, initEnv, undefined, configurationValues);

        expect(result).toEqual({
            existingKey: "existingValue",
            env: { VAR1: "value1" },
            init: { env: { INIT_VAR1: "initValue1" } },
        });
    });

    it("should allow overwriting enableNetworkPolicy", () => {
        const env = { VAR1: "value1" };
        const initEnv = { INIT_VAR1: "initValue1" };
        const configurationValues = { existingKey: "existingValue", enableNetworkPolicy: "true" };

        const result = mergeConfigurationValues(env, initEnv, false, configurationValues);

        expect(result).toEqual({
            enableNetworkPolicy: "true",
            existingKey: "existingValue",
            env: { VAR1: "value1" },
            init: { env: { INIT_VAR1: "initValue1" } },
        });
    });
});
