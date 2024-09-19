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
import { Cluster } from "./cluster";
import deepmerge from "deepmerge";

/**
 * AddonOptions describes the configuration options available for the Amazon VPC CNI plugin for Kubernetes. This is obtained from
 * upstream `aws.eks.AddonArgs` and removes the deprecated `resolveConflicts` field. `clusterName` is also removed as we enable users to
 * pass in the cluster object directly.
 */
export interface AddonOptions
    extends Omit<aws.eks.AddonArgs, "resolveConflicts" | "clusterName" | "configurationValues"> {
    cluster: Cluster;
    configurationValues?: object;
}

/**
 * Addon manages an EKS add-on.
 * For more information about supported add-ons, see: https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html
 */
export class Addon extends pulumi.ComponentResource {
    public readonly addon: pulumi.Input<aws.eks.Addon>;

    constructor(name: string, args: AddonOptions, opts?: pulumi.CustomResourceOptions) {
        const cluster = args.cluster;

        super("eks:index:Addon", name, args, {
            ...opts,
            parent: cluster,
        });

        const addon = new aws.eks.Addon(
            name,
            {
                ...args,
                clusterName: cluster.core.cluster.name,
                configurationValues: JSON.stringify(args.configurationValues),
            },
            { parent: this, provider: opts?.provider },
        );

        this.addon = addon;
    }
}

export type ConfigurationValue = string | number | boolean | undefined | ConfigurationValues;
export type ConfigurationValues = { [key: string]: pulumi.Input<ConfigurationValue> };

/**
 * Deeply merges the provided configuration values with the optional base settings and json stringifies it. Returns undefined if no values and base settings are provided.
 * If a key exists in both the base settings and the provided values, the value from the provided values will be used.
 */
export function createAddonConfiguration(
    values: pulumi.Input<object> | undefined,
    baseSettings?: ConfigurationValues,
): pulumi.Output<string> | undefined {
    if (!values && !baseSettings) {
        return undefined;
    }

    const merged = pulumi.all([values, baseSettings]).apply(([values, base]) => {
        return deepmerge(base ?? {}, values ?? {});
    });

    return pulumi.jsonStringify(merged);
}
