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
import * as pulumi from "@pulumi/pulumi";

import * as jsyaml from "js-yaml";
import { RoleMapping, UserMapping } from "./cluster";

export const AuthModeConfigMap = "CONFIG_MAP"
export const AuthModeApiAndConfigMap = "API_AND_CONFIG_MAP"
export const AuthModeApi = "API"


export function validateAuthenticationMode(authenticationMode: string | undefined) {
    if (!authenticationMode) {
        // AuthenticationMode is an optional parameter, it defaults to CONFIG_MAP
        return;
    }

    if (authenticationMode !== AuthModeConfigMap && authenticationMode !== AuthModeApiAndConfigMap && authenticationMode !== AuthModeApi) {
        throw new Error(`Invalid value for authenticationMode: ${authenticationMode}. Allowed values are: ${AuthModeConfigMap}, ${AuthModeApiAndConfigMap}, ${AuthModeApi}.`);
    }
}

export function supportsConfigMap(authenticationMode: string | undefined) {
    // If authenticationMode is not provided, it defaults to CONFIG_MAP
    return !authenticationMode || authenticationMode === AuthModeConfigMap || authenticationMode === AuthModeApiAndConfigMap;
}

/**
 * Creates the AWS authentication data for the aws-auth ConfigMap.
 * 
 * @param instanceRoles - The instance roles to be mapped.
 * @param roleMappings - The IAM role mappings to be included.
 * @param userMappings - The IAM user mappings to be included.
 * @returns The AWS authentication data for the aws-auth ConfigMap.
 * @throws Error if the IAM role mappings or user mappings are invalid or cannot be serialized to YAML.
 */
export function createAwsAuthData(instanceRoles: pulumi.Output<aws.iam.Role[]>, roleMappings: pulumi.Input<pulumi.Input<RoleMapping>[]> | undefined,
    userMappings: pulumi.Input<pulumi.Input<UserMapping>[]> | undefined): pulumi.Input<{ [key: string]: pulumi.Input<string> }> {
    const instanceRoleMappings = instanceRoles.apply((roles) => roles.map(role => createInstanceRoleMapping(role.arn)));

    const mapRoles = pulumi
        .all([pulumi.output(roleMappings || []), instanceRoleMappings])
        .apply(([mappings, instanceMappings]) => {
            if (mappings.some(m => m.accessPolicies && m.accessPolicies.length > 0)) {
                throw new Error(`The provided IAM role mappings must not include access policies. Access policies are not supported with authentication mode ${AuthModeConfigMap}.`)
            }
            if (mappings.some(m => !m.groups || m.groups.length === 0)) {
                throw new Error(`The provided IAM role mappings must include at least one group. Groups are required for IAM role mappings with authentication mode ${AuthModeConfigMap}.`)
            }

            let mappingYaml = "";
            try {
                mappingYaml = jsyaml.dump(
                    [...mappings, ...instanceMappings].map((m) => ({
                        rolearn: m.roleArn,
                        username: m.username,
                        groups: m.groups,
                    })),
                );
            } catch (e) {
                throw new Error(
                    `The IAM role mappings provided could not be properly serialized to YAML for the aws-auth ConfigMap`,
                );
            }
            return mappingYaml;
        });

    const nodeAccessData: any = {
        mapRoles: mapRoles,
    };
    if (userMappings) {
        nodeAccessData.mapUsers = pulumi.output(userMappings).apply((mappings) => {
            if (mappings.some(m => m.accessPolicies && m.accessPolicies.length > 0)) {
                throw new Error(`The provided IAM user mappings must not include access policies. Access policies are not supported with authentication mode ${AuthModeConfigMap}.`)
            }
            if (mappings.some(m => !m.groups || m.groups.length === 0)) {
                throw new Error(`The provided IAM user mappings must include at least one group. Groups are required for IAM user mappings with authentication mode ${AuthModeConfigMap}.`)
            }

            let mappingYaml = "";
            try {
                mappingYaml = jsyaml.dump(
                    mappings.map((m) => ({
                        userarn: m.userArn,
                        username: m.username,
                        groups: m.groups,
                    })),
                );
            } catch (e) {
                throw new Error(
                    `The IAM user mappings provided could not be properly serialized to YAML for the aws-auth ConfigMap`,
                );
            }
            return mappingYaml;
        });
    }
    return nodeAccessData;
}

export function createAccessEntries(clusterName: pulumi.Input<string>, instanceRoles: pulumi.Output<aws.iam.Role[]>, roleMappings: pulumi.Input<pulumi.Input<RoleMapping>[]> | undefined,
    userMappings: pulumi.Input<pulumi.Input<UserMapping>[]> | undefined, opts: pulumi.CustomResourceOptions | undefined): pulumi.Output<aws.eks.AccessEntry[]> {

    const nodeEntries = instanceRoles.apply((roles) => {
        return pulumi.output(roles.map(role => { return { id: role.id, arn: role.arn } })).apply((roles) => {
            // instance roles have the type EC2_LINUX, and are associated with the nodegroup's IAM role.
            return roles.map(role => new aws.eks.AccessEntry(role.id, {
                clusterName,
                type: "EC2_LINUX",
                principalArn: role.arn,
            }, opts));
        });
    });

    const principalEntries = pulumi.all([pulumi.output(roleMappings || []), pulumi.output(userMappings || [])]).apply(([roles, users]) => {
        return roles.map(m => {
            return {
                arn: m.roleArn,
                username: m.username,
                groups: m.groups,
                accessPolicies: m.accessPolicies,
            }
        }).concat(users.map(m => {
            return {
                arn: m.userArn,
                username: m.username,
                groups: m.groups,
                accessPolicies: m.accessPolicies,
            }
        })).map((m) => {
            if ((m.accessPolicies?.length ?? 0) == 0 && (m.groups?.length ?? 0) == 0) {
                throw new Error(`At least one of 'accessPolicies' or 'groups' must be specified for the IAM role or user mapping with ARN '${m.arn}'.`);
            }
            const roleName = m.arn.split('/')[-1];
            const accessEntry = new aws.eks.AccessEntry(roleName, {
                clusterName,
                type: "STANDARD",
                principalArn: m.arn,
                userName: m.username,
                kubernetesGroups: m.groups,
            }, opts);

            const policyAssociations = m.accessPolicies?.map(policy => new aws.eks.AccessPolicyAssociation(`${m.arn}-access-policy`, {
                accessScope: policy.accessScope,
                principalArn: m.arn,
                policyArn: policy.policyArn,
                clusterName,
            }, {
                ...opts,
                dependsOn: [accessEntry]
            }));

            return accessEntry;
        });
    });

    return pulumi.all([nodeEntries, principalEntries]).apply(([nodeEntries, principalEntries]) => {
        return [...nodeEntries, ...principalEntries];
    });
}

/**
 * Enable access to the EKS cluster for worker nodes, by creating an
 * instance role mapping to the k8s username and groups of aws-auth.
 */
function createInstanceRoleMapping(arn: pulumi.Input<string>): RoleMapping {
    return {
        roleArn: arn,
        username: "system:node:{{EC2PrivateDNSName}}",
        groups: ["system:bootstrappers", "system:nodes"],
    };
}
