import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export function createApplication(name: string, sgId: pulumi.Output<string>, provider: k8s.Provider): k8s.core.v1.Service {
    const ns = new k8s.core.v1.Namespace(name, {
        metadata: { name: name },
    }, { provider: provider });

    const sgp = new k8s.apiextensions.CustomResource(name, {
        apiVersion: "vpcresources.k8s.aws/v1beta1",
        kind: "SecurityGroupPolicy",
        metadata: {
            name: name,
            namespace: ns.metadata.name
        },
        spec: {
            podSelector: { matchLabels: { app: name } },
            securityGroups: {
                groupIds: [sgId],
            }
        },
    }, { provider: provider });

    const deployment = new k8s.apps.v1.Deployment(name, {
        metadata: {
            name: name,
            namespace: ns.metadata.name
        },
        spec: {
            selector: { matchLabels: { app: name } },
            replicas: 1,
            template: {
                metadata: { labels: { app: name } },
                spec: {
                    containers: [{
                        name: name,
                        image: "nginx",
                        ports: [{ containerPort: 80 }],
                    }],
                },
            },
        },
    }, { provider: provider });

    return new k8s.core.v1.Service(name, {
        metadata: {
            name: name,
            namespace: ns.metadata.name
        },
        spec: {
            selector: { app: name },
            ports: [{ port: 80, targetPort: 80 }],
        },
    }, { provider: provider, dependsOn: [deployment, sgp] });
}