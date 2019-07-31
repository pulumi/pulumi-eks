import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { config } from "./config";

// Create a ServiceAccount
export function makeKube2IamServiceAccount(
    provider: k8s.Provider,
    namespace: pulumi.Input<string>): k8s.core.v1.ServiceAccount {
    return new k8s.core.v1.ServiceAccount(
        config.appName,
        {
            metadata: {
                namespace: namespace,
            },
        },
        {
            provider: provider,
        },
    );
}

// Create a ClusterRole
export function makeKube2IamClusterRole(provider: k8s.Provider): k8s.rbac.v1.ClusterRole {
    return new k8s.rbac.v1.ClusterRole(
        config.appName,
        {
            rules: [
                {
                    apiGroups: [""],
                    resources: ["namespaces", "pods"],
                    verbs: ["get", "list", "watch"],
                },
            ],
        },
        {
            provider: provider,
        },
    );
}

// Create a ClusterRoleBinding
export function makeKube2IamClusterRoleBinding(
    provider: k8s.Provider,
    namespace: pulumi.Input<string>,
    serviceAccountName: pulumi.Input<string>,
    clusterRoleName: pulumi.Input<string>): k8s.rbac.v1.ClusterRoleBinding {
    return new k8s.rbac.v1.ClusterRoleBinding(
        config.appName,
        {
            subjects: [
                {
                    kind: "ServiceAccount",
                    name: serviceAccountName,
                    namespace: namespace,
                },
            ],
            roleRef: {
                apiGroup: "rbac.authorization.k8s.io",
                kind: "ClusterRole",
                name: clusterRoleName,
            },
        },
        {
            provider: provider,
        },
    );
}
