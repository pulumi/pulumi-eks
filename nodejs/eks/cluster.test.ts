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

import * as aws from "@pulumi/aws";
import { ClusterOptions, createCore } from "./cluster";

describe("createCore", () => {
    const name = "test-cluster";

    it("should throw an error if both instanceRole and instanceRoles are set", () => {
        const rawArgs = {
            instanceRole: new aws.iam.Role("test-role", { assumeRolePolicy: "{}" }),
            instanceRoles: [new aws.iam.Role("test-role-1", { assumeRolePolicy: "{}" })],
        };

        expect(() => createCore(name, rawArgs, undefined as any)).toThrow(
            "instanceRole and instanceRoles are mutually exclusive, and cannot both be set.",
        );
    });

    it("should throw an error if both subnetIds and publicSubnetIds/privateSubnetIds are set", () => {
        const rawArgs = {
            subnetIds: ["subnet-123"],
            publicSubnetIds: ["subnet-456"],
        };

        expect(() => createCore(name, rawArgs, undefined as any)).toThrow(
            "subnetIds, and the use of publicSubnetIds and/or privateSubnetIds are mutually exclusive. Choose a single approach.",
        );
    });

    it("should throw an error if both nodeGroupOptions and singular node group options are set", () => {
        const rawArgs = {
            nodeGroupOptions: {},
            nodeSubnetIds: ["subnet-123"],
        };

        expect(() => createCore(name, rawArgs, undefined as any)).toThrow(
            "Setting nodeGroupOptions, and any set of singular node group option(s) on the cluster, is mutually exclusive. Choose a single approach.",
        );
    });

    it("should throw an error if autoMode is enabled and authentication mode does not support access entries", () => {
        const rawArgs = {
            autoMode: { enabled: true },
            authenticationMode: "CONFIG_MAP",
        } satisfies ClusterOptions;

        expect(() => createCore(name, rawArgs, undefined as any)).toThrow(
            "Access entries are required when using EKS Auto Mode. Use the authentication mode 'API' or 'API_AND_CONFIG_MAP'.",
        );
    });
});
