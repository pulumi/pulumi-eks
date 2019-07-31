import * as aws from "@pulumi/aws;
import * as clusterSvcs from "./aws-cluster-services";

// Launch kube2iam and fluentd-cloudwatch.
const fluentdCloudWatch = clusterSvcs.create({
    clusterName: myCluster.core.cluster.name,
    region: aws.config.region,
    instanceRoleArn: myCluster.core.instanceRoles.apply(r => r[0].arn),
    namespace: namespaceName,
    provider: myCluster.provider,
});
