import * as eks from "@pulumi/eks";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export function createUserData(cluster: aws.eks.Cluster, extraArgs: string): pulumi.Output<string> {
    const userdata = pulumi
        .all([
            cluster.name,
            cluster.endpoint,
            cluster.certificateAuthority.data,
        ])
        .apply(([clusterName, clusterEndpoint, clusterCertAuthority]) => {
            return `MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="==MYBOUNDARY=="

--==MYBOUNDARY==
Content-Type: text/x-shellscript; charset="us-ascii"

#!/bin/bash

/etc/eks/bootstrap.sh --apiserver-endpoint "${clusterEndpoint}" --b64-cluster-ca "${clusterCertAuthority}" "${clusterName}" ${extraArgs}
--==MYBOUNDARY==--`;
        });

    // Encode the user data as base64.
    return pulumi
        .output(userdata)
        .apply((ud) => Buffer.from(ud, "utf-8").toString("base64"));
}