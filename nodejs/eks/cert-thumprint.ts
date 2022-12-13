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
import * as http from "http";
import * as https from "https";
import * as tls from "tls";
import * as url from "url";

const THUMBPRINT_MAX_RETRIES: number = 12;
const THUMBPRINT_SLEEP_MILLISECOND_INTERVAL: number = 5000;

/**
 * Get the certificate thumprint of the issuing CA for the TLS enabled URL.
 *
 * This is used for OIDC provider configuration.
 *
 * See for more details:
 * - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
 * - https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
 * - https://aws.amazon.com/blogs/opensource/introducing-fine-grained-iam-roles-service-accounts/
 * - https://medium.com/@marcincuber/amazon-eks-with-oidc-provider-iam-roles-for-kubernetes-services-accounts-59015d15cb0c
 * - https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/aws/eks/#enabling-iam-roles-for-service-accounts
 */
export function getIssuerCAThumbprint(
    issuerUrl: pulumi.Input<string>,
    agent: http.Agent
): pulumi.Output<string> {
    return pulumi.output(issuerUrl).apply((issUrl) => {
        return getThumbprint(
            issUrl,
            THUMBPRINT_MAX_RETRIES,
            THUMBPRINT_SLEEP_MILLISECOND_INTERVAL,
            agent
        );
    });
}

// Thumbprint retrieval below adapted from https://git.io/JvGHB.

// Find the intermediate root CA cert in a chain of certs by traversing the
// chain starting from the end user cert, and moving up to it's issuer.
//
// See for more details: https://knowledge.digicert.com/solution/SO4261.html
function findIntRootCACertificate(
    certificate: tls.DetailedPeerCertificate
): tls.DetailedPeerCertificate {
    let cert = certificate;
    let prevCert = cert?.issuerCertificate;

    // The trusted root cert is the last cert in the chain, and it repeats itself as the issuer.
    // The intermediate root CA cert is the second to last cert in the chain.
    while (cert?.fingerprint !== cert?.issuerCertificate?.fingerprint) {
        prevCert = cert;
        cert = cert.issuerCertificate;
    }
    return prevCert;
}

//  See: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
//  > IAM requires the thumbprint for the root certificate authority (CA) that
//  > signed the certificate used by the external identity provider (IdP). The
//  > thumbprint is a signature for the CA's certificate that was used to issue
//  > the certificate for the OIDC-compatible IdP.
async function getThumbprint(
    issuerUrl: string,
    retriesLeft: number,
    interval: number,
    agent: http.Agent
): Promise<string> {
    // For up to 60 seconds (12 retries @ 5000 ms), try to contact the issuer URL.
    try {
        return await new Promise((resolve, reject) => {
            const options = {
                ...url.parse(issuerUrl),
                agent: agent,
            };
            const req = https
                .get(options)
                .on("error", reject)
                .on("socket", socket => {
                    if (!(socket instanceof tls.TLSSocket)) {
                        req.emit("error", new Error("socket is not of type TLSSocket"));
                        return;
                    }
                    socket.on("secureConnect", () => {
                        const certificate: tls.DetailedPeerCertificate =
                            socket.getPeerCertificate(true);
                        const fingerprint = findIntRootCACertificate(certificate).fingerprint;
                        // Check if certificate is valid
                        if (socket.authorized === false) {
                            req.emit("error", socket.authorizationError);
                            req.destroy();
                            return;
                        }
                        resolve(
                            // Ref: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
                            fingerprint.split(":").join("").toLowerCase() // Ref: https://github.com/terraform-providers/terraform-provider-aws/issues/10104#issuecomment-551079323
                        );
                    });
                });
            req.end();
        });
    } catch (e) {
        if (retriesLeft) {
            pulumi.log.info(
                `Waiting for cert issuer URL(${THUMBPRINT_MAX_RETRIES - retriesLeft})`,
                undefined,
                undefined,
                true
            );
            await new Promise((resolve) => setTimeout(resolve, interval));
            return getThumbprint(issuerUrl, retriesLeft - 1, interval, agent);
        }
    }
    throw new Error("Cannot retrieve the certificate fingerprint at the issuer URL: " + issuerUrl);
}
