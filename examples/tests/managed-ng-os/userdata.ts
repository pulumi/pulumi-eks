import * as pulumi from "@pulumi/pulumi";

interface ClusterMetadata {
    name: pulumi.Input<string>;
    endpoint: pulumi.Input<string>;
    certificateAuthority: pulumi.Input<string>;
    serviceCidr: pulumi.Input<string>;
}

export function createUserData(cluster: ClusterMetadata, kubeletFlags: string): pulumi.Output<string> {
    return pulumi.interpolate`MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="BOUNDARY"

--BOUNDARY
Content-Type: application/node.eks.aws

---
apiVersion: node.eks.aws/v1alpha1
kind: NodeConfig
spec:
  cluster:
    name: ${cluster.name}
    apiServerEndpoint: ${cluster.endpoint}
    certificateAuthority: >-
      ${cluster.certificateAuthority}
    cidr: ${cluster.serviceCidr}

--BOUNDARY
Content-Type: application/node.eks.aws

---
apiVersion: node.eks.aws/v1alpha1
kind: NodeConfig
spec:
  kubelet:
    flags:
      - '${kubeletFlags}'

--BOUNDARY--
`.apply((ud) => Buffer.from(ud, "utf-8").toString("base64"));
}
