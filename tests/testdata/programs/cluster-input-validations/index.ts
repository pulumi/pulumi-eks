import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";

const cfg = new pulumi.Config();

const property: string = cfg.require("property");
const n: number = cfg.requireNumber("n");

const testRole = new aws.iam.Role("test_role", {
    name: "test_role",
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Sid: "",
            Principal: {
                Service: "ec2.amazonaws.com",
            },
        }],
    })
});

function asOutput<T>(x: T): pulumi.Output<T> {
    const p = new Promise<number>(resolve => setTimeout(() => resolve(0), 10));
    return pulumi.output(p).apply(_ => x);
}

const opts: eks.ClusterOptions = {
    nodeAmiId: "ami-0384725f0d30527c7",
    authenticationMode: "API",
};

const testARN: string = "arn";

if (property === "instanceRoles") {
    if (n === 0) {
        opts.instanceRoles = asOutput([]);
    } else if (n == 1) {
        opts.instanceRoles = asOutput([testRole]);
    }
} else if (property == "userMappings") {
    if (n == 0) {
        opts.userMappings = asOutput([]);
    } else if (n == 1) {
        opts.userMappings = asOutput([{userArn: testARN, username: "u", groups: []}]);
    }
} else if (property == "roleMappings") {
    if (n == 0) {
        opts.roleMappings = asOutput([]);
    } else if (n == 1) {
        opts.roleMappings = asOutput([{roleArn: testARN, username: "u", groups: []}]);
    }
}

const cluster = new eks.Cluster("c", opts);

export const kubeconfigJson = cluster.kubeconfigJson
