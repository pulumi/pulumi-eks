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
import * as crypto from "crypto";

/** @internal */
export function randomSuffixProviderFactory(): pulumi.provider.Provider {
    return {
        check: (urn: pulumi.URN, olds: any, news: any) => {
            let inputs = news;
            // Since this used to be implemented as a dynamic provider, if we have an old `__provider`
            // input, propagate it to the new inputs so the engine doesn't see a diff, to avoid any
            // unnecessary calls to `update`.
            if (olds.__provider && !news.__provider) {
                inputs = {
                    ...news,
                    __provider: olds.__provider,
                };
            }
            return Promise.resolve({ inputs });
        },
        create: (urn: pulumi.URN, inputs: any) => {
            return Promise.resolve({
                id: getName(urn),
                outs: { output: appendRandom(inputs.input) },
            });
        },
        update: (id: pulumi.ID, urn: pulumi.URN, olds: any, news: any) => {
            return Promise.resolve({
                outs: { output: appendRandom(news.input) },
            });
        },
        version: "", // ignored
    };
}

function appendRandom(v: string): string {
    return `${v}-${crypto.randomBytes(4).toString("hex")}`;
}

function getName(urn: pulumi.URN): string {
    return urn.split("::")[3];
}
