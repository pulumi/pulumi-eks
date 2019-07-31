import * as pulumi from "@pulumi/pulumi";

export const config = {
    appName: "kube2iam",
    appImage: "jtblin/kube2iam:0.10.8",
    pulumiComponentNamespace: "kcloud:lib:Kube2Iam",
};
