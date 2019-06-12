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

import * as pulumi from "@pulumi/pulumi";
import * as dynamic from "@pulumi/pulumi/dynamic";

/**
 * Transform is a dynamic resource that evaluates a function when its inputs change and exports the result.
 */
class Transform<T, U> extends dynamic.Resource {
    public readonly output: pulumi.Output<U>;

    constructor(name: string, input: T, func: (v: T) => U, opts?: pulumi.CustomResourceOptions) {
        const provider = {
            check: (olds: any, news: any) => Promise.resolve({ inputs: news, failedChecks: [] }),
            diff: (id: pulumi.ID, olds: any, news: any) => Promise.resolve({}),
            create: (inputs: any) => Promise.resolve({
                id: name,
                outs: { output: func(inputs.input as T) },
            }),
            update: (id: pulumi.ID, olds: any, news: any) => Promise.resolve({
                outs: { output: func(news.input as T) },
            }),
            read: (id: pulumi.ID, state: any) => Promise.resolve({id: id, props: state}),
            delete: (id: pulumi.ID, props: any) => Promise.resolve(),
        };

        super(provider, name, { input: input, output: undefined }, opts);
    }
}

/**
 * transform evaluates the given function on the given input iff the input's value has changed and returns the result
 * as an output.
 */
export default function transform<T, U>(name: string, input: T, func: (v: T) => U, opts?: pulumi.CustomResourceOptions): pulumi.Output<U> {
    return (new Transform(name, input, func, opts)).output;
}
