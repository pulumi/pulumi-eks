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
import * as aws from "@pulumi/aws";

import { CoreData } from "../cluster";
import { isGravitonInstance } from "./nodegroup";
import { getArchitecture } from "./nodegroup";

const callReturnValues = new Map<string, pulumi.runtime.MockCallResult>();

beforeAll(() => {
    pulumi.runtime.setMocks(
        {
            newResource: function (args: pulumi.runtime.MockResourceArgs): {
                id: string;
                state: any;
            } {
                if (
                    args.type === "aws:ec2/placementGroup:PlacementGroup" ||
                    args.type === "aws:iam/instanceProfile:InstanceProfile"
                ) {
                    return {
                        id: args.inputs.name + "_id",
                        state: {
                            name: args.inputs.name + "_id",
                        },
                    };
                }
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

let ng: typeof import("./nodegroup");
beforeEach(async function () {
    ng = await import("./nodegroup");
    callReturnValues.clear();
});

const gravitonInstances = [
    "c6g.12xlarge",
    "c6g.16xlarge",
    "c6g.large",
    "c6g.medium",
    "c6g.metal",
    "c6g.xlarge",
    "c6gd.12xlarge",
    "c6gd.16xlarge",
    "c6gd.2xlarge",
    "c6gd.4xlarge",
    "c6gd.8xlarge",
    "c6gd.large",
    "c6gd.medium",
    "c6gd.metal",
    "c6gd.xlarge",
    "c6gn.12xlarge",
    "c6gn.16xlarge",
    "c6gn.2xlarge",
    "c6gn.4xlarge",
    "c6gn.8xlarge",
    "c6gn.large",
    "c6gn.medium",
    "c6gn.xlarge",
    "c7gn.large",
    "c7gn.medium",
    "c7gn.xlarge",
    "g5g.8xlarge",
    "g5g.metal",
    "g5g.xlarge",
    "hpc7g.16xlarge",
    "hpc7g.4xlarge",
    "hpc7g.8xlarge",
    "i4g.16xlarge",
    "i4g.xlarge",
    "im4gn.16xlarge",
    "is4gen.2xlarge",
    "m6g.12xlarge",
    "m6gd.medium",
    "m6gd.metal",
    "m6gd.xlarge",
    "m7g-flex.16xlarge",
    "m7g.medium",
    "m7g.metal",
    "t4g.2xlarge",
    "t4g.large",
    "t4g.medium",
    "t4g.micro",
    "t4g.nano",
    "t4g.small",
    "t4g.xlarge",
    "x2gd.large",
];

const nonGravitonInstances = [
    " a1.metal",
    " c5.metal",
    " g4dn.metal",
    " i3.metal",
    " r5.metal",
    "a1.2xlarge",
    "c5.xlarge",
    "c5a.12xlarge",
    "c5ad.xlarge",
    "c5n.large",
    "c5n.metal",
    "c5n.xlarge",
    "c6a.xlarge",
    "c6i.16xlarge",
    "c6id.xlarge",
    "c7a.metal-48xl",
    "c7a.xlarge",
    "c7i.metal-24xl",
    "c7i.metal-48xl",
    "d3en.12xlarge",
    "g2.2xlarge",
    "g2.8xlarge",
    "g3.16xlarge",
    "g3.4xlarge",
    "g3.8xlarge",
    "g4dn.xlarge",
    "g5.12xlarge",
    "g5.16xlarge",
    "g5.24xlarge",
    "g5.2xlarge",
    "g5.48xlarge",
    "g5.4xlarge",
    "g5.8xlarge",
    "g5.xlarge",
    "h1.16xlarge",
    "h1.2xlarge",
    "h1.4xlarge",
    "h1.8xlarge",
    "hpc6a.48xlarge",
    "hpc6id.32xlarge",
    "i2.2xlarge",
    "i2.4xlarge",
    "i2.8xlarge",
    "i2.xlarge",
    "i3.16xlarge",
    "i3.2xlarge",
    "i3.4xlarge",
    "i3.8xlarge",
    "i3.large",
    "i3.metal",
    "i3.xlarge",
    "i3en.12xlarge",
    "inf1.6xlarge",
    "inf1.xlarge",
    "inf2.24xlarge",
    "inf2.48xlarge",
    "m4.4xlarge",
    "m4.large",
    "m4.xlarge",
    "m5.12xlarge",
    "m5.16xlarge",
    "m5.24xlarge",
    "m5.2xlarge",
    "m5.4xlarge",
    "m5.8xlarge",
    "m5.large",
    "m5.metal",
    "m5.xlarge",
    "m5a.12xlarge",
    "m5a.16xlarge",
    "m5a.24xlarge",
    "m5a.2xlarge",
    "m5a.4xlarge",
    "m5a.8xlarge",
    "m5a.large",
    "m5a.xlarge",
    "m5ad.12xlarge",
    "m5ad.16xlarge",
    "m5ad.24xlarge",
    "m5ad.2xlarge",
    "m5ad.4xlarge",
    "m5ad.8xlarge",
    "m5ad.large",
    "m5ad.xlarge",
    "m5d.12xlarge",
    "m5d.16xlarge",
    "m5d.24xlarge",
    "m5d.2xlarge",
    "m5d.4xlarge",
    "m5d.8xlarge",
    "m5d.large",
    "m5d.metal",
    "m5d.xlarge",
    "m5dn.12xlarge",
    "m5dn.16xlarge",
    "m5dn.24xlarge",
    "m5dn.2xlarge",
    "m5dn.4xlarge",
    "m5dn.8xlarge",
    "m5dn.large",
    "m5dn.metal",
    "m5dn.xlarge",
    "m5n.12xlarge",
    "m5n.16xlarge",
    "m5n.24xlarge",
    "m5n.2xlarge",
    "m5n.4xlarge",
    "m5n.8xlarge",
    "m5n.large",
    "m5n.metal",
    "m5n.xlarge",
    "m5zn.12xlarge",
    "m5zn.2xlarge",
    "m5zn.3xlarge",
    "m5zn.6xlarge",
    "m5zn.large",
    "m5zn.metal",
    "m5zn.xlarge",
    "m6a.12xlarge",
    "m6a.16xlarge",
    "m6a.24xlarge",
    "m6a.2xlarge",
    "m6a.32xlarge",
    "m6a.48xlarge",
    "m6a.4xlarge",
    "m6a.8xlarge",
    "m6a.large",
    "m6a.metal",
    "m6a.xlarge",
    "m6i.12xlarge",
    "m6i.16xlarge",
    "m6i.24xlarge",
    "m6i.2xlarge",
    "m6i.32xlarge",
    "m6i.4xlarge",
    "m6i.8xlarge",
    "m6i.large",
    "m6i.metal",
    "m6i.xlarge",
    "m6id.12xlarge",
    "m6id.16xlarge",
    "m6id.24xlarge",
    "m6id.2xlarge",
    "m6id.32xlarge",
    "m6id.4xlarge",
    "m6id.8xlarge",
    "m6id.large",
    "m6id.metal",
    "m6id.xlarge",
    "m6idn.12xlarge",
    "m6idn.16xlarge",
    "m6idn.24xlarge",
    "m6idn.2xlarge",
    "m6idn.32xlarge",
    "m6idn.4xlarge",
    "m6idn.8xlarge",
    "m6idn.large",
    "m6idn.metal",
    "m6idn.xlarge",
    "m6in.12xlarge",
    "m6in.16xlarge",
    "m6in.24xlarge",
    "m6in.2xlarge",
    "m6in.32xlarge",
    "m6in.4xlarge",
    "m6in.8xlarge",
    "m6in.large",
    "m6in.metal",
    "m6in.xlarge",
    "m7a.12xlarge",
    "m7a.16xlarge",
    "m7a.24xlarge",
    "m7a.2xlarge",
    "m7a.32xlarge",
    "m7a.48xlarge",
    "m7a.4xlarge",
    "m7a.8xlarge",
    "m7a.large",
    "m7a.medium",
    "m7a.metal-48xl",
    "m7a.xlarge",
    "m7i-flex.2xlarge",
    "m7i-flex.4xlarge",
    "m7i.xlarge",
    "mac1.metal",
    "mac2-m2.metal",
    "mac2-m2pro.metal",
    "mac2.metal",
    "p3dn.24xlarge",
    "p4d.24xlarge",
    "r5dn.24xlarge",
    "r7iz.metal-32xl",
    "r7iz.xlarge",
    "t1.micro",
    "t2.2xlarge",
    "t2.large",
    "t2.medium",
    "t2.micro",
    "t2.nano",
    "t2.small",
    "t2.xlarge",
    "t3.2xlarge",
    "t3.large",
    "t3.medium",
    "t3.micro",
    "t3.nano",
    "t3.small",
    "t3.xlarge",
    "t3a.2xlarge",
    "t3a.large",
    "t3a.medium",
    "t3a.micro",
    "t3a.nano",
    "t3a.small",
    "t3a.xlarge",
    "trn1n.32xlarge",
    "u-12tb1.112xlarge",
    "u-12tb1.metal",
    "u-18tb1.112xlarge",
    "u-18tb1.metal",
    "u-24tb1.112xlarge",
    "u-24tb1.metal",
    "u-3tb1.56xlarge",
    "u-6tb1.112xlarge",
    "u-6tb1.56xlarge",
    "u-6tb1.metal",
    "u-9tb1.112xlarge",
    "u-9tb1.metal",
];

describe("isGravitonInstance", () => {
    gravitonInstances.forEach((instanceType) => {
        test(`${instanceType} should return true for a Graviton instance`, () => {
            expect(isGravitonInstance(instanceType, "instanceTypes")).toBe(true);
        });
    });

    nonGravitonInstances.forEach((instanceType) => {
        test(`${instanceType} should return false for non-Graviton instance`, () => {
            expect(isGravitonInstance(instanceType, "instanceTypes")).toBe(false);
        });
    });
    describe("getArchitecture", () => {
        test("should return 'x86_64' when only x86_64 instances are provided", () => {
            const instanceTypes = ["c5.large", "m5.large", "t3.large"];
            const architecture = getArchitecture(instanceTypes, "instanceTypes");
            expect(architecture).toBe("x86_64");
        });

        test("should return 'arm64' when only arm64 instances are provided", () => {
            const instanceTypes = ["c6g.large", "m6g.large", "t4g.large"];
            const architecture = getArchitecture(instanceTypes, "instanceTypes");
            expect(architecture).toBe("arm64");
        });

        test("should throw an error when both x86_64 and arm64 instances are provided", () => {
            const instanceTypes = ["c5.large", "c6g.large"];
            expect(() => {
                getArchitecture(instanceTypes, "instanceTypes");
            }).toThrow(
                "Cannot determine architecture of instance types. The provided instance types do not share a common architecture",
            );
        });

        test("should return 'x86_64' when no instance types are provided", () => {
            const instanceTypes: string[] = [];
            const architecture = getArchitecture(instanceTypes, "instanceTypes");
            expect(architecture).toBe("x86_64");
        });
    });
});

describe("createManagedNodeGroup", function () {
    test("should default to the cluster version if no version is provided", async () => {
        const mng = ng.createManagedNodeGroup(
            "test",
            {
                nodeRoleArn: pulumi.output("nodeRoleArn"),
            },
            pulumi.output({
                cluster: {
                    version: pulumi.output("1.30"),
                    accessConfig: pulumi.output({
                        authenticationMode: "API",
                    }),
                } as aws.eks.Cluster,
            } as CoreData),
            undefined as any,
        );

        const configuredVersion = await promisify(mng.nodeGroup.version);

        expect(configuredVersion).toBe("1.30");
    });

    test("should use user defined version if provided", async () => {
        const mng = ng.createManagedNodeGroup(
            "test",
            {
                nodeRoleArn: pulumi.output("nodeRoleArn"),
                version: pulumi.output("1.29"),
            },
            pulumi.output({
                cluster: {
                    version: pulumi.output("1.30"),
                    accessConfig: pulumi.output({
                        authenticationMode: "API",
                    }),
                } as aws.eks.Cluster,
            } as CoreData),
            undefined as any,
        );

        const configuredVersion = await promisify(mng.nodeGroup.version);

        expect(configuredVersion).toBe("1.29");
    });

    test("should not default the version if a custom launch template is configured", async () => {
        const mng = ng.createManagedNodeGroup(
            "test",
            {
                nodeRoleArn: pulumi.output("nodeRoleArn"),
                launchTemplate: {
                    id: pulumi.output("lt-id"),
                    version: pulumi.output("lt-version"),
                },
            },
            pulumi.output({
                cluster: {
                    version: pulumi.output("1.30"),
                    accessConfig: pulumi.output({
                        authenticationMode: "API",
                    }),
                } as aws.eks.Cluster,
            } as CoreData),
            undefined as any,
        );

        const configuredVersion = await promisify(mng.nodeGroup.version);

        expect(configuredVersion).toBeUndefined();
    });

    it("should throw an error if placementGroupAvailabilityZone is not provided when enabling EFA support", async () => {
        expect(() => {
            ng.createManagedNodeGroup(
                "test",
                {
                    nodeRoleArn: pulumi.output("nodeRoleArn"),
                    enableEfaSupport: true,
                },
                pulumi.output({
                    cluster: {
                        version: pulumi.output("1.30"),
                        accessConfig: pulumi.output({
                            authenticationMode: "API",
                        }),
                    } as aws.eks.Cluster,
                } as CoreData),
                undefined as any,
            );
        }).toThrow(
            new pulumi.InputPropertiesError({
                message: "The input properties for the managed node group are invalid.",
                errors: [
                    {
                        propertyPath: "placementGroupAvailabilityZone",
                        reason: "You must specify placementGroupAvailabilityZone when enabling EFA support.",
                    },
                ],
            }),
        );
    });

    it("should return empty string for placement group name if efa support is not enabled", async () => {
        const mng = ng.createManagedNodeGroup(
            "test",
            {
                nodeRoleArn: pulumi.output("nodeRoleArn"),
            },
            pulumi.output({
                cluster: {
                    version: pulumi.output("1.30"),
                    accessConfig: pulumi.output({
                        authenticationMode: "API",
                    }),
                } as aws.eks.Cluster,
            } as CoreData),
            undefined as any,
        );

        const placementGroupName = await promisify(pulumi.output(mng.placementGroupName));
        expect(placementGroupName).toBe("");
    });

    it("should return a placement group name if efa support is enabled", async () => {
        callReturnValues.set("aws:ec2/getInstanceTypeOfferings:getInstanceTypeOfferings", {
            locations: pulumi.output(["us-west-2a", "us-west-2b"]),
        });

        const subnetIds = ["subnet-12345", "subnet-67890", "subnet-54321"];

        callReturnValues.set("aws:ec2/getSubnets:getSubnets", {
            ids: pulumi.output([subnetIds[0]]),
        });
        callReturnValues.set("aws:ec2/getInstanceType:getInstanceType", {
            efaSupported: true,
            maximumNetworkCards: 1,
        });

        const mng = ng.createManagedNodeGroup(
            "test",
            {
                nodeRoleArn: pulumi.output("nodeRoleArn"),
                enableEfaSupport: true,
                placementGroupAvailabilityZone: "us-west-2a",
                subnetIds,
            },
            pulumi.output({
                cluster: {
                    version: pulumi.output("1.30"),
                    accessConfig: pulumi.output({
                        authenticationMode: "API",
                    }),
                    kubernetesNetworkConfig: pulumi.output({
                        serviceIpv4Cidr: "10.100.0.0/16",
                        ipFamily: "ipv4",
                    }),
                } as aws.eks.Cluster,
            } as CoreData),
            undefined as any,
        );

        const nodeGroupId = await promisify(pulumi.output(mng.nodeGroup.id));
        expect(nodeGroupId).not.toBe("");
        const placementGroupName = await promisify(pulumi.output(mng.placementGroupName));
        expect(placementGroupName).not.toBe("");
    });
});

describe("resolveInstanceProfileName", function () {
    test("no args, no c.nodeGroupOptions throws", async () => {
        expect(() =>
            ng.resolveInstanceProfileName({}, {
                nodeGroupOptions: {},
            } as pulumi.UnwrappedObject<CoreData>),
        ).toThrow("an instanceProfile or instanceProfileName is required");
    });

    test("both args.instanceProfile and args.instanceProfileName throws", async () => {
        const instanceProfile = new aws.iam.InstanceProfile("instanceProfile", {});
        const name = "nodegroup-name";
        expect(() =>
            ng.resolveInstanceProfileName(
                {
                    instanceProfile: instanceProfile,
                    instanceProfileName: "instanceProfileName",
                },
                {
                    nodeGroupOptions: {},
                } as pulumi.UnwrappedObject<CoreData>,
            ),
        ).toThrow(`instanceProfile and instanceProfileName are mutually exclusive`);
    });

    test("both c.nodeGroupOptions.instanceProfileName and c.nodeGroupOptions.instanceProfile throws", async () => {
        const instanceProfile = new aws.iam.InstanceProfile("instanceProfile", {});
        const name = "nodegroup-name";
        expect(() =>
            ng.resolveInstanceProfileName({}, {
                nodeGroupOptions: {
                    instanceProfile: instanceProfile,
                    instanceProfileName: "instanceProfileName",
                },
            } as pulumi.UnwrappedObject<CoreData>),
        ).toThrow(`instanceProfile and instanceProfileName are mutually exclusive`);
    });

    test("args.instanceProfile returns passed instanceProfile", async () => {
        const instanceProfile = new aws.iam.InstanceProfile("instanceProfile", {
            name: "passedInstanceProfile",
        });
        const resolvedInstanceProfileName = ng.resolveInstanceProfileName(
            {
                instanceProfile: instanceProfile,
            },
            {
                nodeGroupOptions: {},
            } as pulumi.UnwrappedObject<CoreData>,
        );
        const expected = await promisify(instanceProfile.name);
        const recieved = await promisify(resolvedInstanceProfileName);
        expect(recieved).toEqual(expected);
    });

    test("nodeGroupOptions.instanceProfile returns passed instanceProfile", async () => {
        const instanceProfile = new aws.iam.InstanceProfile("instanceProfile", {
            name: "passedInstanceProfile",
        });
        const resolvedInstanceProfileName = ng.resolveInstanceProfileName({}, {
            nodeGroupOptions: {
                instanceProfile: instanceProfile,
            },
        } as pulumi.UnwrappedObject<CoreData>);
        const expected = await promisify(instanceProfile.name);
        const recieved = await promisify(resolvedInstanceProfileName);
        expect(recieved).toEqual(expected);
    });

    test("args.instanceProfileName returns passed InstanceProfile", async () => {
        const nodeGroupName = "-name";
        const existingInstanceProfileName = "existingInstanceProfileName";
        const resolvedInstanceProfileName = ng.resolveInstanceProfileName(
            {
                instanceProfileName: existingInstanceProfileName,
            },
            {
                nodeGroupOptions: {},
            } as pulumi.UnwrappedObject<CoreData>,
        );
        const expected = existingInstanceProfileName;
        const received = await promisify(resolvedInstanceProfileName);
        expect(received).toEqual(expected);
    });

    test("nodeGroupOptions.instanceProfileName returns existing InstanceProfile", async () => {
        const existingInstanceProfileName = "existingInstanceProfileName";
        const resolvedInstanceProfileName = ng.resolveInstanceProfileName({}, {
            nodeGroupOptions: {
                instanceProfileName: existingInstanceProfileName,
            },
        } as pulumi.UnwrappedObject<CoreData>);
        const expected = existingInstanceProfileName;
        const received = await promisify(resolvedInstanceProfileName);
        expect(received).toEqual(expected);
    });
});

function promisify<T>(output: pulumi.Output<T> | undefined): Promise<T> {
    expect(output).toBeDefined();
    return new Promise((resolve) => output!.apply(resolve));
}
