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
import { AccessEntry, ClusterOptions, RoleMapping, UserMapping } from "./cluster";

export const AuthModeConfigMap = "CONFIG_MAP"
export const AuthModeApiAndConfigMap = "API_AND_CONFIG_MAP"
export const AuthModeApi = "API"


export function validateAuthenticationMode(args: ClusterOptions) {
    if (args.authenticationMode && args.authenticationMode !== AuthModeConfigMap && args.authenticationMode !== AuthModeApiAndConfigMap && args.authenticationMode !== AuthModeApi) {
        throw new Error(`Invalid value for authenticationMode: ${args.authenticationMode}. Allowed values are: ${AuthModeConfigMap}, ${AuthModeApiAndConfigMap}, ${AuthModeApi}.`);
    }

    // If authenticationMode is not provided, EKS defaults to CONFIG_MAP
    const authMode = args.authenticationMode || AuthModeConfigMap;

    const configMapOnlyProperties: (keyof ClusterOptions)[] = ["roleMappings", "userMappings", "instanceRoles", "instanceRole"];
    const apiOnlyProperties: (keyof ClusterOptions)[] = ["accessEntries"];

    if (!supportsConfigMap(args.authenticationMode)) {
        configMapOnlyProperties.forEach((prop) => {
            if (args[prop]) {
                throw new Error(`The '${prop}' property is not supported when 'authenticationMode' is set to '${authMode}'.`);
            }
        })
    }

    if (!supportsAccessEntries(args.authenticationMode)) {
        apiOnlyProperties.forEach((prop) => {
            if (args[prop]) {
                throw new Error(`The '${prop}' property is not supported when 'authenticationMode' is set to '${authMode}'.`);
            }
        })
    }
}

export function supportsConfigMap(authenticationMode: string | undefined) {
    // If authenticationMode is not provided, it defaults to CONFIG_MAP
    return !authenticationMode || authenticationMode === AuthModeConfigMap || authenticationMode === AuthModeApiAndConfigMap;
}

export function supportsAccessEntries(authenticationMode: string | undefined) {
    return authenticationMode === AuthModeApi || authenticationMode === AuthModeApiAndConfigMap;
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

export function createAccessEntries(clusterName: pulumi.Input<string>, accessEntries: { [key: string]: AccessEntry }, opts: pulumi.CustomResourceOptions): aws.eks.AccessEntry[] {
    return Object.entries(accessEntries).map(([name, accessEntry]) => {
        const entry = new aws.eks.AccessEntry(name, {
            ...accessEntry,
            clusterName,
            userName: accessEntry.username,
        }, opts);

        Object.entries(accessEntry.accessPolicies || {}).map(([associationName, association]) => {
            const associationOutput = pulumi.output(association);
            new aws.eks.AccessPolicyAssociation(associationName, {
                accessScope: associationOutput.accessScope,
                principalArn: accessEntry.principalArn,
                policyArn: associationOutput.policyArn,
                clusterName,
            }, {
                ...opts,
                dependsOn: [entry]
            });
        });

        return entry;
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