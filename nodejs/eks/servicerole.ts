// Copyright 2016-2019, Pulumi Corporation.
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
import * as crypto from "crypto";

// sha1hash returns a partial SHA1 hash of the input string.
function sha1hash(s: string): string {
    const shasum: crypto.Hash = crypto.createHash("sha1");
    shasum.update(s);
    // Limit the size of hashes to ensure we generate shorter/ resource names.
    return shasum.digest("hex").substring(0, 8);
}

/**
 * ServiceRoleArgs describe the parameters to a ServiceRole component.
 */
export interface ServiceRoleArgs {
    /**
     * The service associated with this role.
     */
    readonly service: pulumi.Input<string>;
    /**
     * The description of the role.
     */
    readonly description?: pulumi.Input<string>;
    /**
     * One or more managed policy ARNs to attach to this role.
     */
    readonly managedPolicyArns?: { id: string; arn: pulumi.Input<string> }[];

    /**
     * Tags to apply to the role.
     */
    readonly tags?: pulumi.Input<{ [key: string]: pulumi.Input<string> }>;

    /**
     * The actions to allow in the assume role policy. Defaults to ["sts:AssumeRole"].
     */
    readonly assumeRoleActions?: pulumi.Input<string[]>;
}

/**
 * The ServiceRole component creates an IAM role for a particular service and attaches to it a list of well-known
 * managed policies.
 */
export class ServiceRole extends pulumi.ComponentResource {
    // An output that resolves to the role after all policies have been attached.
    public readonly resolvedRole: pulumi.Output<aws.iam.Role>;
    // The role itself without any dependencies on attached policies
    public readonly directRole: aws.iam.Role;

    /**
     * Create a new ServiceRole.
     *
     * @param name The _unique_ name of this component.
     * @param args The arguments for this cluster.
     * @param opts A bag of options that control this component's behavior.
     */
    constructor(name: string, args: ServiceRoleArgs, opts?: pulumi.ResourceOptions) {
        super("eks:index:ServiceRole", name, args, opts);

        const assumeRolePolicy = pulumi.output(args.service).apply((service) =>
            JSON.stringify({
                Version: "2012-10-17",
                Statement: [
                    {
                        Action: args.assumeRoleActions ?? ["sts:AssumeRole"],
                        Effect: "Allow",
                        Principal: {
                            Service: [service],
                        },
                    },
                ],
            }),
        );
        const role = new aws.iam.Role(
            `${name}-role`,
            {
                description: args.description,
                assumeRolePolicy: assumeRolePolicy,
                tags: args.tags,
            },
            { parent: this },
        );

        const rolePolicyAttachments: aws.iam.RolePolicyAttachment[] = [];
        for (const policy of args.managedPolicyArns || []) {
            rolePolicyAttachments.push(
                new aws.iam.RolePolicyAttachment(
                    `${name}-${sha1hash(policy.id)}`,
                    {
                        policyArn: policy.arn,
                        role: role,
                    },
                    { parent: this },
                ),
            );
        }

        this.directRole = role;
        this.resolvedRole = pulumi
            .all([role.arn, ...rolePolicyAttachments.map((r) => r.id)])
            .apply(() => role);

        this.registerOutputs({
            resolvedRole: this.resolvedRole,
            directRole: this.directRole,
        });
    }
}
