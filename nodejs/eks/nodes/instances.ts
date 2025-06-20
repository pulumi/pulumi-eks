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
import * as aws from "@pulumi/aws";

export const DEFAULT_INSTANCE_TYPE = "t3.medium";

export interface GetEfaNetworkInterfacesArgs {
    // The instance types configured for the node group.
    instanceTypes: pulumi.Input<pulumi.Input<string>[]> | undefined;
    // The security group IDs to associate with the network interfaces.
    securityGroupIds: pulumi.Input<pulumi.Input<string>[]>;
    // The property path to use for the instance type in error messages.
    instanceTypePropertyPath: string;
    // Whether to associate a public IP address with the primary network interface.
    associatePublicIpAddress?: pulumi.Input<boolean>;
    // Options for the underlying invokes used to retrieve information about the instance types
    opts: pulumi.InvokeOptions;
}

/**
 * Gets the network interface configurations for EFA-enabled instances.
 *
 * This function configures network interfaces for EFA (Elastic Fabric Adapter) support based on the instance type.
 * For instance types that support multiple network cards, it will configure one EFA interface per network card. For other
 * supported instance types, it will configure a single EFA interface.
 *
 * The primary network interface (index 0) is configured with:
 * - Optional public IP association
 * - Device index 0
 * - Interface type "efa"
 *
 * Any secondary network interfaces are configured with:
 * - No public IP
 * - Device index 1
 * - Interface type "efa-only"
 *
 * @param args - Configuration options for the network interfaces
 * @returns Array of network interface configurations for the launch template
 * @throws {pulumi.InputPropertyError} If the selected instance type does not support EFA
 */
export function getEfaNetworkInterfaces(
    args: GetEfaNetworkInterfacesArgs,
): pulumi.Output<aws.types.input.ec2.LaunchTemplateNetworkInterface[]> {
    const instanceType = getEfaInstanceType(args.instanceTypes);
    const instanceTypeInfo = aws.ec2.getInstanceTypeOutput(
        {
            instanceType,
        },
        args.opts,
    );

    // Instance types that support multiple network cards can be configured with one EFA per network card. All other supported instance types
    // support only one EFA per instance.
    // See https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa.html#efa-limits
    const maximumNetworkCards = pulumi
        .all([instanceTypeInfo.efaSupported, instanceType])
        .apply(([efaSupported, instanceType]) => {
            if (!efaSupported) {
                throw new pulumi.InputPropertyError({
                    propertyPath: args.instanceTypePropertyPath,
                    reason: `The selected instance type '${instanceType}' does not support EFA.`,
                });
            }
            return instanceTypeInfo.maximumNetworkCards.apply((cards) => {
                return cards > 1 ? cards : 1;
            });
        });

    const publicIpAssociation = args.associatePublicIpAddress
        ? pulumi.output(args.associatePublicIpAddress).apply((str) => str.toString())
        : undefined;

    return maximumNetworkCards.apply((cards) => {
        const interfaces: aws.types.input.ec2.LaunchTemplateNetworkInterface[] = [];
        for (let i = 0; i < cards; i++) {
            interfaces.push({
                // The primary interface can have a public IP address, the secondary interfaces do not support IP networking.
                associatePublicIpAddress: i === 0 ? publicIpAssociation : undefined,
                deleteOnTermination: "true",
                networkCardIndex: i,
                // EFA requires the first interface to have device index 0, and all the secondary interfaces to have device index 1.
                // see https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa-start.html#efa-start-tempinstance
                deviceIndex: i === 0 ? 0 : 1,
                // The primary interface must be efa, the secondary interfaces can be efa or efa-only.
                // We choose efa-only because it prevents exhausting the private IP address space and circumvents
                // possibly routing conflicts, like source IP mismatch, or host name mapping problems.
                interfaceType: i === 0 ? "efa" : "efa-only",
                securityGroups: args.securityGroupIds,
            });
        }
        return interfaces;
    });
}

/**
 * Filters the provided subnet IDs by the specified availability zone and instance type.
 *
 * @param subnetIds - An array of subnet IDs to filter.
 * @param placementGroupAvailabilityZone - The availability zone to filter the subnets by.
 * @param instanceTypes - An optional array of instance types to determine supported availability zones.
 * @param opts - Options to control the behavior of the Pulumi invoke operation.
 *
 * @returns A Pulumi Output containing an array of subnet IDs that match the specified availability zone and instance type.
 */
export function filterEfaSubnets(
    subnetIds: pulumi.Input<pulumi.Input<string>[]>,
    placementGroupAvailabilityZone: pulumi.Input<string>,
    instanceTypes: pulumi.Input<pulumi.Input<string>[]> | undefined,
    opts: pulumi.InvokeOptions,
): pulumi.Output<string[]> {
    const instanceType = getEfaInstanceType(instanceTypes);
    const supportedAZs = getSupportedAZs(instanceType, opts);
    // check if the provided availability zone is supported by the instance type
    const zone = pulumi.all([placementGroupAvailabilityZone, supportedAZs]).apply(([zone, azs]) => {
        if (azs.includes(zone)) {
            return zone;
        } else {
            throw new pulumi.InputPropertyError({
                propertyPath: "placementGroupAvailabilityZone",
                reason: `The provided availability zone ('${zone}') is not supported by the instance type. Supported AZs: [${azs.join(
                    ", ",
                )}]`,
            });
        }
    });

    const filteredSubnets = aws.ec2.getSubnetsOutput(
        {
            filters: [
                {
                    name: "availability-zone",
                    values: [zone],
                },
                {
                    name: "subnet-id",
                    values: subnetIds,
                },
            ],
        },
        opts,
    );

    return pulumi.all([filteredSubnets, supportedAZs, zone]).apply(([subnets, azs, zone]) => {
        if (subnets.ids.length === 0) {
            throw new pulumi.InputPropertyError({
                propertyPath: "placementGroupAvailabilityZone",
                reason: `None of the configured subnets are in the provided availability zone ('${zone}'). Choose a different availability zone or change the subnets. Supported AZs: [${azs.join(
                    ", ",
                )}]`,
            });
        }

        return subnets.ids;
    });
}

/**
 * Gets the availability zones that support a specific EC2 instance type.
 * @param instanceType The EC2 instance type to check availability for (e.g. "t3.micro")
 * @param opts Options for the underlying invokes used to retrieve the information
 * @returns A list of availability zone IDs where the instance type is available
 */
function getSupportedAZs(
    instanceType: pulumi.Input<string>,
    opts: pulumi.InvokeOutputOptions,
): pulumi.Output<string[]> {
    return aws.ec2.getInstanceTypeOfferingsOutput(
        {
            filters: [
                {
                    name: "instance-type",
                    values: [instanceType],
                },
            ],
            locationType: "availability-zone",
        },
        opts,
    ).locations;
}

/**
 * Gets the first instance type from a list of instance types, or returns a default instance type if none are provided.
 * This is used to determine which instance type is configured for EFA.
 *
 * @param instanceTypes - list of EC2 instance types
 * @returns The first instance type from the list, or "t3.medium" if no instance types are provided
 */
function getEfaInstanceType(
    instanceTypes: pulumi.Input<pulumi.Input<string>[]> | undefined,
): pulumi.Output<string> {
    return instanceTypes
        ? pulumi.output(instanceTypes).apply((types) => {
              return types.length > 0 ? types[0] : DEFAULT_INSTANCE_TYPE;
          })
        : pulumi.output(DEFAULT_INSTANCE_TYPE);
}
