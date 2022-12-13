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

// Dynamic providers don't currently work well with multi-language components [1]. To workaround this, the
// dynamic providers in this library have been ported to be custom resources implemented by the new provider
// plugin. Previously, this functionality was implemented using a generic Transform<T, U> dynamic provider, which
// accepted a function that would be called when its `input` property changed and the result would be exported
// as an output. There was only one place in EKS where this was used to append a random suffix to a given input.
// Instead of reimplementing the general Transform resource as a custom resource in this provider, which would
// need to (de)serialize the function, this is a reimplementation of just the random suffix functionality needed
// for EKS. An alias is used and care has been taken in the implementation inside the provider to avoid any diffs
// for any existing stacks that were created using the old dynamic provider-based Transform for this.
// [1] https://github.com/pulumi/pulumi/issues/5455

class RandomSuffix extends pulumi.CustomResource {
    public readonly output!: pulumi.Output<string>;

    constructor(name: string, input: string, opts?: pulumi.CustomResourceOptions) {
        // This was previously implemented as a dynamic provider, so alias the old type.
        const aliasOpts = {
            aliases: [{ type: "pulumi-nodejs:dynamic:Resource" }],
        };
        opts = pulumi.mergeOptions(opts, aliasOpts);
        super(
            "eks:index:RandomSuffix",
            name,
            {
                input: input,
                output: undefined,
            },
            opts
        );
    }
}

/**
 * Appends a random string to the given input if the input's value has changed and returns the result
 * as an output.
 * @internal
 */
export default function randomSuffix(
    name: string,
    input: string,
    opts?: pulumi.CustomResourceOptions
): pulumi.Output<string> {
    return new RandomSuffix(name, input, opts).output;
}
