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
import { ClusterCreationRoleProvider, ClusterInternal } from "../../cluster";

const clusterProvider: pulumi.provider.Provider = {
    construct: (
        name: string,
        type: string,
        inputs: pulumi.Inputs,
        options: pulumi.ComponentResourceOptions,
    ) => {
        try {
            const cluster = new ClusterInternal(name, inputs, options);
            return Promise.resolve({
                urn: cluster.urn,
                state: {
                    kubeconfig: cluster.kubeconfig,
                    kubeconfigJson: cluster.kubeconfigJson,
                    clusterSecurityGroup: cluster.clusterSecurityGroup,
                    instanceRoles: cluster.instanceRoles,
                    nodeSecurityGroup: cluster.nodeSecurityGroup,
                    eksClusterIngressRule: cluster.eksClusterIngressRule,
                    defaultNodeGroup: cluster.defaultNodeGroup,
                    eksCluster: cluster.eksCluster,
                    core: cluster.core,
                    clusterSecurityGroupId: cluster.clusterSecurityGroupId,
                    nodeSecurityGroupId: cluster.nodeSecurityGroupId,
                    clusterIngressRuleId: cluster.clusterIngressRuleId,
                    defaultNodeGroupAsgName: cluster.defaultNodeGroupAsgName,
                    fargateProfileId: cluster.fargateProfileId,
                    fargateProfileStatus: cluster.fargateProfileStatus,
                    oidcProviderArn: cluster.oidcProviderArn,
                    oidcProviderUrl: cluster.oidcProviderUrl,
                    oidcIssuer: cluster.oidcIssuer,
                    autoModeNodeRoleName: cluster.autoModeNodeRoleName,
                },
            });
        } catch (e) {
            return Promise.reject(e);
        }
    },
    version: "", // ignored
};

/** @internal */
export function clusterProviderFactory(): pulumi.provider.Provider {
    return clusterProvider;
}

const clusterCreationRoleProviderProvider: pulumi.provider.Provider = {
    construct: (
        name: string,
        type: string,
        inputs: pulumi.Inputs,
        options: pulumi.ComponentResourceOptions,
    ) => {
        try {
            const roleProvider = new ClusterCreationRoleProvider(name, inputs, options);
            return Promise.resolve({
                urn: roleProvider.urn,
                state: {
                    role: roleProvider.role,
                    provider: roleProvider.provider,
                },
            });
        } catch (e) {
            return Promise.reject(e);
        }
    },
    version: "", // ignored
};

/** @internal */
export function clusterCreationRoleProviderProviderFactory(): pulumi.provider.Provider {
    return clusterCreationRoleProviderProvider;
}
