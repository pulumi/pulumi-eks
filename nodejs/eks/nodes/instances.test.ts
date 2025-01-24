// Copyright 2016-2025, Pulumi Corporation.
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

describe("filterEfaSubnets", () => {
    const callReturnValues = new Map<string, pulumi.runtime.MockCallResult>();

    beforeAll(() => {
        pulumi.runtime.setMocks(
            {
                newResource: function (args: pulumi.runtime.MockResourceArgs): {
                    id: string;
                    state: any;
                } {
                    return {
                        id: args.inputs.name + "_id",
                        state: args.inputs,
                    };
                },
                call: function (args: pulumi.runtime.MockCallArgs): pulumi.runtime.MockCallResult {
                    const callReturnValue = callReturnValues.get(args.token);
                    if (callReturnValue) {
                        return callReturnValue;
                    }

                    return args.inputs;
                },
            },
            "project",
            "stack",
            false, // Sets the flag `dryRun`, which indicates if pulumi is running in preview mode.
        );
    });

    let instances: typeof import("./instances");
    beforeEach(async function () {
        instances = await import("./instances");
        callReturnValues.clear();
    });

    it("should return filtered subnet IDs when the availability zone is supported", async () => {
        callReturnValues.set("aws:ec2/getInstanceTypeOfferings:getInstanceTypeOfferings", {
            locations: pulumi.output(["us-west-2a", "us-west-2b"]),
        });

        const subnetIds = ["subnet-12345", "subnet-67890", "subnet-54321"];

        callReturnValues.set("aws:ec2/getSubnets:getSubnets", {
            ids: pulumi.output([subnetIds[0]]),
        });

        const result = await promisify(
            instances.filterEfaSubnets(subnetIds, "us-west-2a", ["t3.medium"], {}),
        );

        expect(result).toEqual([subnetIds[0]]);
    });
});

describe("getEfaNetworkInterfaces", () => {
    const callReturnValues = new Map<string, pulumi.runtime.MockCallResult>();

    beforeAll(() => {
        pulumi.runtime.setMocks(
            {
                newResource: function (args: pulumi.runtime.MockResourceArgs): {
                    id: string;
                    state: any;
                } {
                    return {
                        id: args.inputs.name + "_id",
                        state: args.inputs,
                    };
                },
                call: function (args: pulumi.runtime.MockCallArgs): pulumi.runtime.MockCallResult {
                    const callReturnValue = callReturnValues.get(args.token);
                    if (callReturnValue) {
                        return callReturnValue;
                    }

                    return args.inputs;
                },
            },
            "project",
            "stack",
            false, // Sets the flag `dryRun`, which indicates if pulumi is running in preview mode.
        );
    });

    let instances: typeof import("./instances");
    beforeEach(async function () {
        instances = await import("./instances");
        callReturnValues.clear();
    });

    it("should return network interfaces for EFA-enabled instance types with a single network card", async () => {
        callReturnValues.set("aws:ec2/getInstanceType:getInstanceType", {
            efaSupported: true,
            maximumNetworkCards: 1,
        });

        const args = {
            instanceTypes: ["g6.8xlarge"],
            securityGroupIds: ["sg-12345"],
            instanceTypePropertyPath: "instanceTypes",
            associatePublicIpAddress: true,
            opts: {},
        };

        const result = await promisify(pulumi.output(instances.getEfaNetworkInterfaces(args)));
        expect(result).toEqual([
            {
                associatePublicIpAddress: "true",
                deleteOnTermination: "true",
                networkCardIndex: 0,
                deviceIndex: 0,
                interfaceType: "efa",
                securityGroups: ["sg-12345"],
            },
        ]);
    });

    it("should return network interfaces for EFA-enabled instance types with multiple network cards", async () => {
        callReturnValues.set("aws:ec2/getInstanceType:getInstanceType", {
            efaSupported: true,
            maximumNetworkCards: 4,
        });

        const args = {
            instanceTypes: ["p4d.24xlarge"],
            securityGroupIds: ["sg-12345"],
            instanceTypePropertyPath: "instanceTypes",
            associatePublicIpAddress: true,
            opts: {},
        };

        const result = await promisify(pulumi.output(instances.getEfaNetworkInterfaces(args)));

        expect(result).toEqual([
            {
                associatePublicIpAddress: "true",
                deleteOnTermination: "true",
                networkCardIndex: 0,
                deviceIndex: 0,
                interfaceType: "efa",
                securityGroups: ["sg-12345"],
            },
            // Secondary interfaces do not get an IP address because they do not support IP networking.
            {
                associatePublicIpAddress: undefined,
                deleteOnTermination: "true",
                networkCardIndex: 1,
                deviceIndex: 1,
                interfaceType: "efa-only",
                securityGroups: ["sg-12345"],
            },
            {
                associatePublicIpAddress: undefined,
                deleteOnTermination: "true",
                networkCardIndex: 2,
                deviceIndex: 1,
                interfaceType: "efa-only",
                securityGroups: ["sg-12345"],
            },
            {
                associatePublicIpAddress: undefined,
                deleteOnTermination: "true",
                networkCardIndex: 3,
                deviceIndex: 1,
                interfaceType: "efa-only",
                securityGroups: ["sg-12345"],
            },
        ]);
    });
});

function promisify<T>(output: pulumi.Output<T> | undefined): Promise<T> {
    expect(output).toBeDefined();
    return new Promise((resolve) => output!.apply(resolve));
}
