import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { config } from "./config";

export type FluentdCloudWatchOptions = {
    clusterName: pulumi.Input<string>;
    region: pulumi.Input<string>;
    iamRoleArn: pulumi.Input<string>;
    namespace: pulumi.Input<string>;
    provider: k8s.Provider;
};

export class FluentdCloudWatch extends pulumi.ComponentResource {
    public readonly clusterName: pulumi.Input<string>;
    public readonly helmChart: k8s.helm.v2.Chart;

    constructor(
        name: string,
        args: FluentdCloudWatchOptions,
        opts?: pulumi.ComponentResourceOptions,
    ) {
        super(config.pulumiComponentNamespace, name, args, opts);

        if (args.clusterName === undefined ||
            args.region === undefined ||
            args.iamRoleArn === undefined ||
            args.namespace === undefined ||
            args.provider === undefined
        ) {
            return {} as FluentdCloudWatch;
        }

        this.clusterName = args.clusterName;

        // Helm chart
        this.helmChart = makeFluentdCloudWatch(
            name,
            this.clusterName,
            args.region,
            args.namespace,
            args.iamRoleArn,
            args.provider,
        );
    }
}

// Create a fluentd-cloudwatch helm chart
export function makeFluentdCloudWatch(
    name: string,
    clusterName: pulumi.Input<string>,
    region: pulumi.Input<string>,
    namespace: pulumi.Input<string>,
    iamRoleArn: pulumi.Input<string>,
    provider: k8s.Provider,
): k8s.helm.v2.Chart {
    return new k8s.helm.v2.Chart(
        name,
        {
            namespace: namespace,
            chart: "https://storage.googleapis.com/fluentd-cloudwatch/fluentd-cloudwatch-0.10.2-dev.tgz",
            values: {
                extraVars: [ "{ name: FLUENT_UID, value: '0' }" ],
                podAnnotations: {
                    "iam.amazonaws.com/role": iamRoleArn,
                },
                rbac: {
                    create: true,
                },
                awsRegion: region,
                clusterName: clusterName,
            },
            transformations: [
                (obj: any) => {
                    // Do transformations on the YAML to set the namespace
                    if (obj.metadata) {
                        obj.metadata.namespace = namespace;
                    }
                },
            ],
        },
        {
            providers: { kubernetes: provider },
        },
    );
}
