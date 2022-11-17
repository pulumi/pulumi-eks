// Copyright 2016-2022, Pulumi Corporation.
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
import { ManagedNodeGroupInternal, NodeGroup, NodeGroupV2Internal } from "../../nodegroup";

const nodeGroupProvider: pulumi.provider.Provider = {
    construct: (name: string, type: string, inputs: pulumi.Inputs, options: pulumi.ComponentResourceOptions) => {
        try {
            const nodegroup = new NodeGroup(name, <any>inputs, options);
            return Promise.resolve({
                urn: nodegroup.urn,
                state: {
                    nodeSecurityGroup: nodegroup.nodeSecurityGroup,
                    extraNodeSecurityGroups: nodegroup.extraNodeSecurityGroups,
                    cfnStack: nodegroup.cfnStack,
                    autoScalingGroupName: nodegroup.autoScalingGroupName,
                },
            });
        } catch (e) {
            return Promise.reject(e);
        }
    },
    version: "", // ignored
};

/** @internal */
export function nodeGroupProviderFactory(): pulumi.provider.Provider {
    return nodeGroupProvider;
}

const managedNodeGroupProvider: pulumi.provider.Provider = {
    construct: (name: string, type: string, inputs: pulumi.Inputs, options: pulumi.ComponentResourceOptions) => {
        try {
            const nodegroup = new ManagedNodeGroupInternal(name, <any>inputs, options);
            return Promise.resolve({
                urn: nodegroup.urn,
                state: {
                    nodeGroup: nodegroup.nodeGroup,
                },
            });
        } catch (e) {
            return Promise.reject(e);
        }
    },
    version: "", // ignored
};

/** @internal */
export function managedNodeGroupProviderFactory(): pulumi.provider.Provider {
    return managedNodeGroupProvider;
}


const nodeGroupV2Provider: pulumi.provider.Provider = {
    construct: (name: string, type: string, inputs: pulumi.Inputs, options: pulumi.ComponentResourceOptions) => {
        try {
            const nodegroup = new NodeGroupV2Internal(name, <any>inputs, options);
            return Promise.resolve({
                urn: nodegroup.urn,
                state: {
                    nodeSecurityGroup: nodegroup.nodeSecurityGroup,
                    extraNodeSecurityGroups: nodegroup.extraNodeSecurityGroups,
                    autoScalingGroup: nodegroup.autoScalingGroup,
                },
            });
        } catch (e) {
            return Promise.reject(e);
        }
    },
    version: "", // ignored
};

/** @internal */
export function nodeGroupV2ProviderFactory(): pulumi.provider.Provider {
    return nodeGroupV2Provider;
}
