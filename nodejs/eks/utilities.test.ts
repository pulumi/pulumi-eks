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

import { getRegionFromArn } from "./utilities";

describe("getRegionFromArn", () => {
    test.each([
        ["arn:aws:eks:us-east-1:123456789012:cluster/my-awesome-cluster", "us-east-1"],
        ["arn:aws:eks:us-west-2:123456789012:cluster/my-awesome-cluster", "us-west-2"],
        ["arn:aws-cn:eks:cn-north-1:123456789012:cluster/my-awesome-cluster", "cn-north-1"],
        [
            "arn:aws-us-gov:eks:us-gov-west-1:123456789012:cluster/my-awesome-cluster",
            "us-gov-west-1",
        ],
    ])("should extract the region from the ARN", (arn, expected) => {
        const region = getRegionFromArn(arn);
        expect(region).toEqual(expected);
    });

    it("should throw an error for an ARN with less than 4 parts", () => {
        const arn = "arn:aws:service";
        expect(() => getRegionFromArn(arn)).toThrow("Invalid ARN: 'arn:aws:service'");
    });

    it("should throw an error for an ARN not starting with 'arn'", () => {
        const arn = "invalid:aws:service:region:account-id:resource";
        expect(() => getRegionFromArn(arn)).toThrow(
            "Invalid ARN: 'invalid:aws:service:region:account-id:resource'",
        );
    });

    it("should throw an error for an empty ARN", () => {
        const arn = "";
        expect(() => getRegionFromArn(arn)).toThrow("Invalid ARN: ''");
    });
});
