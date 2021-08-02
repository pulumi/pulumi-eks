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
import { VpcCni } from "../../cni";
import { clusterCreationRoleProviderProviderFactory, clusterProviderFactory } from "./cluster";
import { vpcCniProviderFactory } from "./cni";
import { managedNodeGroupProviderFactory, nodeGroupProviderFactory } from "./nodegroup";
import { randomSuffixProviderFactory } from "./randomSuffix";
import { nodeGroupSecurityGroupProviderFactory } from "./securitygroup";

class Provider implements pulumi.provider.Provider {
    readonly version = getVersion();

    // A map of types to provider factories. Calling a factory may return a new instance each
    // time or return the same provider instance.
    private readonly typeToProviderFactoryMap: Record<string, () => pulumi.provider.Provider> = {
        "eks:index:Cluster": clusterProviderFactory,
        "eks:index:ClusterCreationRoleProvider": clusterCreationRoleProviderProviderFactory,
        "eks:index:ManagedNodeGroup": managedNodeGroupProviderFactory,
        "eks:index:NodeGroup": nodeGroupProviderFactory,
        "eks:index:NodeGroupSecurityGroup": nodeGroupSecurityGroupProviderFactory,
        "eks:index:RandomSuffix": randomSuffixProviderFactory,
        "eks:index:VpcCni": vpcCniProviderFactory,
    };

    constructor() {
        // Register any resources that can come back as resource references that need to be rehydrated.
        pulumi.runtime.registerResourceModule("eks", "index", {
            version: getVersion(),
            construct: (name, type, urn) => {
                switch (type) {
                    case "eks:index:VpcCni":
                        return new VpcCni(name, undefined, undefined, { urn });
                    default:
                        throw new Error(`unknown resource type ${type}`);
                }
            },
        });
    }

    check(urn: pulumi.URN, olds: any, news: any): Promise<pulumi.provider.CheckResult> {
        const provider = this.getProviderForURN(urn);
        if (!provider) { return unknownResourceRejectedPromise(urn); }
        return provider.check
            ? provider.check(urn, olds, news)
            : Promise.resolve({ inputs: news, failures: [] });
    }

    diff(id: pulumi.ID, urn: pulumi.URN, olds: any, news: any): Promise<pulumi.provider.DiffResult> {
        const provider = this.getProviderForURN(urn);
        if (!provider) { return unknownResourceRejectedPromise(urn); }
        return provider.diff
            ? provider.diff(id, urn, olds, news)
            : Promise.resolve({});
    }

    create(urn: pulumi.URN, inputs: any): Promise<pulumi.provider.CreateResult> {
        const provider = this.getProviderForURN(urn);
        return provider?.create
            ? provider.create(urn, inputs)
            : unknownResourceRejectedPromise(urn);
    }

    read(id: pulumi.ID, urn: pulumi.URN, props?: any): Promise<pulumi.provider.ReadResult> {
        const provider = this.getProviderForURN(urn);
        if (!provider) { return unknownResourceRejectedPromise(urn); }
        return provider.read
            ? provider.read(id, urn, props)
            : Promise.resolve({ id, props });
    }

    update(id: pulumi.ID, urn: pulumi.URN, olds: any, news: any): Promise<pulumi.provider.UpdateResult> {
        const provider = this.getProviderForURN(urn);
        if (!provider) { return unknownResourceRejectedPromise(urn); }
        return provider.update
            ? provider.update(id, urn, olds, news)
            : Promise.resolve({ outs: news });
    }

    delete(id: pulumi.ID, urn: pulumi.URN, props: any): Promise<void> {
        const provider = this.getProviderForURN(urn);
        if (!provider) { return unknownResourceRejectedPromise(urn); }
        return provider.delete
            ? provider.delete(id, urn, props)
            : Promise.resolve();
    }

    construct(name: string, type: string, inputs: pulumi.Inputs,
              options: pulumi.ComponentResourceOptions): Promise<pulumi.provider.ConstructResult> {
        const provider = this.getProviderForType(type);
        return provider?.construct
            ? provider.construct(name, type, inputs, options)
            : unknownResourceRejectedPromise(type);
    }

    /**
     * Returns a provider for the URN or undefined if not found.
     */
    private getProviderForURN(urn: pulumi.URN): pulumi.provider.Provider | undefined {
        const type = getType(urn);
        return this.getProviderForType(type);
    }

    /**
     * Returns a provider for the type or undefined if not found.
     */
    private getProviderForType(type: string): pulumi.provider.Provider | undefined {
        const factory = this.typeToProviderFactoryMap[type];
        return factory ? factory() : undefined;
    }
}

function unknownResourceRejectedPromise<T>(type: string): Promise<T> {
    return Promise.reject(new Error(`unknown resource type ${type}`));
}

function getType(urn: pulumi.URN): string {
    const qualifiedType = urn.split("::")[2];
    const types = qualifiedType.split("$");
    const lastType = types[types.length - 1];
    return lastType;
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
