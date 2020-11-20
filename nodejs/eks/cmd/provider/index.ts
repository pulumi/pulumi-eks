// Copyright 2016-2020, Pulumi Corporation.
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
import { Cluster } from "../../cluster";

class Provider implements pulumi.provider.Provider {
    readonly version = getVersion();

    construct(name: string, type: string, inputs: pulumi.Inputs,
              options: pulumi.ComponentResourceOptions): Promise<pulumi.provider.ConstructResult> {
        if (type !== "eks:index:Cluster") {
            return Promise.reject(new Error(`unknown resource type ${type}`));
        }

        const cluster = new Cluster(name, inputs, options);
        return Promise.resolve({
            urn: cluster.urn,
            state: {
                kubeconfig: cluster.kubeconfig,
            },
        });
    }
}

function getVersion(): string {
    const version: string = require("../../package.json").version;
    // Node allows for the version to be prefixed by a "v", while semver doesn't.
    // If there is a v, strip it off.
    return version.startsWith("v") ? version.slice(1) : version;
}

/** @internal */
export function main(args: string[]) {
    return pulumi.provider.main(new Provider(), args);
}

main(process.argv.slice(2));
