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
import { createAddonConfiguration, ConfigurationValues } from "./addon";

describe("createAddonConfiguration", () => {
    it("should return undefined if both values and baseSettings are undefined", async () => {
        const result = createAddonConfiguration(undefined, undefined);
        expect(result).toBeUndefined();
    });

    it("should return JSON stringified values if baseSettings is undefined", async () => {
        const values = { key1: "value1", key2: 2 };
        const result = createAddonConfiguration(values, undefined);
        expect(result).toBeDefined();
        await promisify(result).then((r) => {
            expect(JSON.parse(r)).toStrictEqual(values);
        });
    });

    it("should return JSON stringified baseSettings if values is undefined", async () => {
        const baseSettings = { key1: "value1", key2: 2 };
        const result = createAddonConfiguration(undefined, baseSettings);
        expect(result).toBeDefined();
        await promisify(result).then((r) => {
            expect(JSON.parse(r)).toStrictEqual(baseSettings);
        });
    });

    it("should deeply merge values and baseSettings", async () => {
        const values = { deeply: { nested: { key1: "val1" } }, nested: { key1: "other-val1" } };
        const baseSettings: ConfigurationValues = {
            deeply: { nested: { key2: "val2" } },
            nested: { key2: "other-val2" },
        };
        const expectedMerged = {
            deeply: { nested: { key2: "val2", key1: "val1" } },
            nested: { key2: "other-val2", key1: "other-val1" },
        };

        const result = createAddonConfiguration(values, baseSettings);
        expect(result).toBeDefined();
        await promisify(result).then((r) => {
            expect(JSON.parse(r)).toStrictEqual(expectedMerged);
        });
    });

    it("should allow overwriting baseSettings", async () => {
        const values = { key1: "newValue1", key3: true };
        const baseSettings: ConfigurationValues = { key1: "will be overwritten", key2: 2 };
        const expectedMerged = { key1: "newValue1", key2: 2, key3: true };

        const result = createAddonConfiguration(values, baseSettings);
        expect(result).toBeDefined();
        await promisify(result!).then((r) => {
            expect(JSON.parse(r)).toStrictEqual(expectedMerged);
        });
    });

    it("should handle pulumi.Input values correctly", async () => {
        const values = new Promise((resolve) =>
            resolve({
                regular: "someVal",
                input: new Promise((resolve) => resolve("input1")),
                deeply: new Promise((resolve) => resolve({ nested: { input: "input1" } })),
            }),
        );
        const baseSettings: ConfigurationValues = {
            deeply: new Promise((resolve) =>
                resolve({ nested: { key1: "val1", input: "will be overwritten" } }),
            ),
            nested: new Promise((resolve) => resolve({ key2: "other-val2", key1: "other-val1" })),
        };
        const expectedMerged = {
            regular: "someVal",
            input: "input1",
            deeply: { nested: { key1: "val1", input: "input1" } },
            nested: { key2: "other-val2", key1: "other-val1" },
        };

        const result = createAddonConfiguration(values, baseSettings);
        expect(result).toBeDefined();
        await promisify(result!).then((r) => {
            expect(JSON.parse(r)).toStrictEqual(expectedMerged);
        });
    });
});

function promisify<T>(output: pulumi.Output<T> | undefined): Promise<T> {
    expect(output).toBeDefined();
    return new Promise((resolve) => output!.apply(resolve));
}
