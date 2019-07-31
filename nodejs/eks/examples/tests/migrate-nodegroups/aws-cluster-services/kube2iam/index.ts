import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { config } from "./config";
import * as kube2iamRbac from "./rbac";

export type Kube2IamOptions = {
    provider: k8s.Provider;
    namespace: pulumi.Input<string>;
    primaryContainerArgs: pulumi.Input<any>;
    ports: pulumi.Input<any>;
};

export class Kube2Iam extends pulumi.ComponentResource {
    public readonly serviceAccount: k8s.core.v1.ServiceAccount;
    public readonly serviceAccountName: pulumi.Output<string>;
    public readonly clusterRole: k8s.rbac.v1.ClusterRole;
    public readonly clusterRoleName: pulumi.Output<string>;
    public readonly clusterRoleBinding: k8s.rbac.v1.ClusterRoleBinding;
    public readonly daemonSet: k8s.apps.v1.DaemonSet;

    constructor(
        name: string,
        args: Kube2IamOptions,
        opts?: pulumi.ComponentResourceOptions,
    ) {
        super(config.pulumiComponentNamespace, name, args, opts);

        if (args.provider === undefined ||
            args.namespace === undefined ||
            args.primaryContainerArgs === undefined ||
            args.ports === undefined
        ) {
            return {} as Kube2Iam;
        }

        // ServiceAccount
        this.serviceAccount = kube2iamRbac.makeKube2IamServiceAccount(args.provider, args.namespace);
        this.serviceAccountName = this.serviceAccount.metadata.apply(m => m.name);

        // RBAC ClusterRole
        this.clusterRole = kube2iamRbac.makeKube2IamClusterRole(args.provider);
        this.clusterRoleName = this.clusterRole.metadata.apply(m => m.name);
        this.clusterRoleBinding = kube2iamRbac.makeKube2IamClusterRoleBinding(
            args.provider, args.namespace, this.serviceAccountName, this.clusterRoleName);

        // DaemonSet
        this.daemonSet = makeKube2IamDaemonSet(
            args.provider, args.namespace, this.serviceAccountName,
            args.primaryContainerArgs, args.ports);
    }
}

const appLabels = { app: config.appName };

// Create a Deployment
export function makeKube2IamDaemonSet(
    provider: k8s.Provider,
    namespace: pulumi.Input<string>,
    serviceAccountName: pulumi.Input<string>,
    primaryContainerArgs: pulumi.Input<any>,
    ports: pulumi.Input<any>): k8s.apps.v1.DaemonSet {
    return new k8s.apps.v1.DaemonSet(
        config.appName,
        {
            metadata: {
                labels: appLabels,
                namespace: namespace,
            },
            spec: {
                selector: { matchLabels: appLabels},
                template: {
                    metadata: {
                        labels: appLabels,
                    },
                    spec: {
                        affinity: {
                            nodeAffinity: {
                                requiredDuringSchedulingIgnoredDuringExecution: {
                                    nodeSelectorTerms: [
                                        {
                                            matchExpressions: [
                                                {
                                                    key: "beta.kubernetes.io/os",
                                                    operator: "In",
                                                    values: ["linux"],
                                                },
                                                {
                                                    key: "beta.kubernetes.io/arch",
                                                    operator: "In",
                                                    values: ["amd64"],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                        tolerations: [
                            {operator: "Exists"},
                        ],
                        serviceAccountName: serviceAccountName,
                        hostNetwork: true,
                        containers: [
                            {
                                name: config.appName,
                                image: config.appImage,
                                args: primaryContainerArgs,
                                ports: ports,
                                securityContext: {
                                    privileged: true,
                                },
                                // Use k8s Downward API
                                env: [
                                    {
                                        name: "POD_NAME",
                                        valueFrom: {
                                            fieldRef: {
                                                fieldPath: "metadata.name",
                                            },
                                        },
                                    },
                                    {
                                        name: "POD_NAMESPACE",
                                        valueFrom: {
                                            fieldRef: {
                                                fieldPath: "metadata.namespace",
                                            },
                                        },
                                    },
                                    {
                                        name: "HOST_IP",
                                        valueFrom: {
                                            fieldRef: {
                                                fieldPath: "status.podIP",
                                            },
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                },
            },
        },
        {
            provider: provider,
        },
    );
}
