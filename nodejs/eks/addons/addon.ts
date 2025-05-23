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
import { Cluster } from "../cluster";

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

// Sorts the keys of an object to ensure the output is deterministic.
function stringifyReplacer(key: string, value: any) {
    return value instanceof Object &&
        !(value instanceof Array || value instanceof Date || value instanceof Function)
        ? Object.keys(value)
              .sort()
              .reduce((sorted, key) => {
                  sorted[key] = value[key];
                  return sorted;
              }, {} as { [key: string]: any })
        : value;
}

/**
 * Creates the json based addon configuration with deterministic ordering of keys. Returns undefined if no values are provided.
 */
export function stringifyAddonConfiguration(
    values: pulumi.Input<object> | undefined,
): pulumi.Output<string> | undefined {
    return values ? pulumi.jsonStringify(values, stringifyReplacer) : undefined;
}
