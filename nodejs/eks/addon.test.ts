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
import { stringifyAddonConfiguration } from "./addon";

describe("stringifyAddonConfiguration", () => {
    it("should return undefined if the configuration values are undefined", async () => {
        const result = stringifyAddonConfiguration(undefined);
        expect(result).toBeUndefined();
    });

    it("should return JSON stringified configuration values", async () => {
        const values = { key1: "value1", key2: 2 };
        const result = stringifyAddonConfiguration(values);
        expect(result).toBeDefined();
        await promisify(result).then((r) => {
            expect(JSON.parse(r)).toStrictEqual(values);
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
        const expectedMerged = {
            regular: "someVal",
            input: "input1",
            deeply: { nested: { input: "input1" } },
        };

        const result = stringifyAddonConfiguration(values);
        expect(result).toBeDefined();
        await promisify(result).then((r) => {
            expect(JSON.parse(r)).toStrictEqual(expectedMerged);
        });
    });

    it("should filter out undefined values", async () => {
        const values = {
            existing: true,
            root: undefined,
            nested: { input: undefined, existing: true },
            rootInput: new Promise((resolve) => resolve(undefined)),
            nestedInput: new Promise((resolve) => resolve({ key: undefined, existing: true })),
        };
        const expectedMerged = {
            existing: true,
            nested: { existing: true },
            nestedInput: { existing: true },
        };

        const result = stringifyAddonConfiguration(values);
        expect(result).toBeDefined();
        await promisify(result).then((r) => {
            expect(JSON.parse(r)).toStrictEqual(expectedMerged);
        });
    });

    it("should order keys deterministically", async () => {
        const values = {
            a: "aVal",
            b: "bVal",
            c: "cVal",
            d: "dVal",
            arr: [1, 2, 3, 4, 5],
        };
        const reverse = {
            arr: [1, 2, 3, 4, 5],
            d: "dVal",
            c: "cVal",
            b: "bVal",
            a: "aVal",
        };

        const result = stringifyAddonConfiguration(values);
        const reverseResult = stringifyAddonConfiguration(reverse);
        expect(result).toBeDefined();
        expect(reverseResult).toBeDefined();
        await promisify(pulumi.all([result, reverseResult])).then(([result, reverseResult]) => {
            expect(result).toBe(reverseResult);
        });
    });

    it("should order nested inputs deterministically", async () => {
        const values = {
            a: new Promise((resolve) =>
                resolve({
                    nested: {
                        inputs: {
                            a: "aVal",
                            b: "bVal",
                            c: "cVal",
                            d: "dVal",
                            arr: [1, 2, 3, 4, 5],
                        },
                    },
                }),
            ),
            b: new Promise((resolve) =>
                resolve({
                    nested: {
                        inputs: {
                            arr: [1, 2, 3, 4, 5],
                            d: "dVal",
                            c: "cVal",
                            b: "bVal",
                            a: "aVal",
                        },
                    },
                }),
            ),
        };

        const reverse = {
            b: new Promise((resolve) =>
                resolve({
                    nested: {
                        inputs: {
                            a: "aVal",
                            b: "bVal",
                            c: "cVal",
                            d: "dVal",
                            arr: [1, 2, 3, 4, 5],
                        },
                    },
                }),
            ),
            a: new Promise((resolve) =>
                resolve({
                    nested: {
                        inputs: {
                            arr: [1, 2, 3, 4, 5],
                            d: "dVal",
                            c: "cVal",
                            b: "bVal",
                            a: "aVal",
                        },
                    },
                }),
            ),
        };

        const result = stringifyAddonConfiguration(values);
        const reverseResult = stringifyAddonConfiguration(reverse);
        expect(result).toBeDefined();
        expect(reverseResult).toBeDefined();
        await promisify(pulumi.all([result, reverseResult])).then(([result, reverseResult]) => {
            expect(result).toBe(reverseResult);
        });
    });
});

function promisify<T>(output: pulumi.Output<T> | undefined): Promise<T> {
    expect(output).toBeDefined();
    return new Promise((resolve) => output!.apply(resolve));
}
