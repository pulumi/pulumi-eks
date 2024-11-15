
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";

const role1 = iam.createRole("scalar-types-1");
const role2 = iam.createRole("scalar-types-2");

const eksVpc = new awsx.ec2.Vpc("scalar-types", {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
});

export const cluster1 = new eks.Cluster("scalar-types-1", {
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.Api,
  publicSubnetIds: eksVpc.publicSubnetIds,
  privateSubnetIds: eksVpc.privateSubnetIds,
  createOidcProvider: true,
});

export const kubeconfig1 = cluster1.kubeconfig;

export const cluster2 = new eks.Cluster("scalar-types-2", {
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.Api,
  fargate: {
    selectors: [{ namespace: "kube-system" }],
  },
  skipDefaultSecurityGroups: true,
  publicSubnetIds: eksVpc.publicSubnetIds,
  privateSubnetIds: eksVpc.privateSubnetIds,
});

export const kubeconfig2 = cluster2.kubeconfig;
