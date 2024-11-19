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

/** @internal */
export function getVersion(): string {
    let version = require("./package.json").version;
    // Node allows for the version to be prefixed by a "v", while semver doesn't.
    // If there is a v, strip it off.
    if (version.indexOf("v") === 0) {
        version = version.slice(1);
    }
    return version;
}

export function isObject(obj: any): obj is Record<string, any> {
    return obj !== null && typeof obj === "object" && !Array.isArray(obj);
}

/**
 * Extracts the AWS region from an Amazon Resource Name (ARN).
 *
 * @param arn - The ARN from which to extract the region.
 * @returns The region extracted from the ARN.
 * @throws Will throw an error if the ARN is invalid.
 */
export function getRegionFromArn(arn: string): string {
    const arnParts = arn.split(":");
    if (arnParts.length < 4 || arnParts[0] !== "arn") {
        throw new Error(`Invalid ARN: '${arn}'`);
    }
    return arnParts[3];
}
