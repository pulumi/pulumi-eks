[![Build Status](https://travis-ci.com/pulumi/pulumi-eks.svg?token=eHg7Zp5zdDDJfTjY8ejq&branch=master)](https://travis-ci.com/pulumi/pulumi-eks)

# Pulumi Amazon Web Services (AWS) EKS Components

Pulumi's library for easily creating and managing EKS Kubernetes clusters.

* [Introduction](#introduction)
* [References](#references)
* [Pre-Requisites](#pre-requisites)
* [Installing](#installing)
* [Quick Examples](#quick-examples)
  * [Create a default EKS Cluster](#create-a-default-eks-cluster)
  * [Deploying a Workload with native Pulumi](#deploying-a-workload-with-native-pulumi)
  * [Deploying a Helm Chart with Pulumi](#deploying-a-helm-chart-with-pulumi)
* [Contributing](#contributing)
* [Code of Conduct](#code-of-conduct)

## Introduction

`pulumi/eks` provides a Pulumi component that creates and manages the resources necessary to run an EKS Kubernetes cluster in AWS.

This includes:
- The EKS cluster control plane.
- The cluster's worker nodes configured as node groups, which are managed by an auto scaling group.
- The AWS CNI Plugin [`aws-k8s-cni`](https://github.com/aws/amazon-vpc-cni-k8s/) to manage pod networking in Kubernetes.

## References

* [API Documentation](https://pulumi.io/reference/pkg/nodejs/@pulumi/eks/index.html)
* [All Examples](./nodejs/eks/examples)

## Pre-Requisites

1. [Install Pulumi](https://www.pulumi.com/docs/reference/install).
1. Install [Node.js](https://nodejs.org/en/download).
1. Install a package manager for Node.js, such as [NPM](https://www.npmjs.com/get-npm) or [Yarn](https://yarnpkg.com/lang/en/docs/install).
1. [Configure AWS Credentials](https://www.pulumi.com/docs/reference/clouds/aws/setup/).
1. [Install AWS IAM Authenticator for Kubernetes](https://docs.aws.amazon.com/eks/latest/userguide/install-aws-iam-authenticator.html).
1. [Install `kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/#install-kubectl).

## Installing

This package is available in JavaScript/TypeScript for use with Node.js.  Install it using either `npm` or `yarn`

`npm`:

```bash
$ npm install @pulumi/eks
```

`yarn`:

```bash
$ yarn add @pulumi/eks
```

## Quick Examples

### Create a default EKS Cluster

The default configuration targets the AWS account's default VPC, and creates an autoscaling group of two `t2.medium` EC2 instances:

```typescript
import * as eks from "@pulumi/eks";

// Create an EKS cluster with the default configuration.
const cluster = new eks.Cluster("my-cluster");

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
```

Once the cluster is created, you can deploy into the cluster using the [`@pulumi/kubernetes`][pulumi-kubernetes] SDK, kubectl, Helm, etc. as demonstrated below.

### Deploying a Workload with native Pulumi

```typescript
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

// Create an EKS cluster with the default configuration.
const cluster = new eks.Cluster("my-cluster");

// Create a NGINX Deployment and Service.
const appName = "my-app";
const appLabels = { appClass: appName };
const deployment = new k8s.apps.v1.Deployment(`${appName}-dep`, {
    metadata: { labels: appLabels },
    spec: {
        replicas: 2,
        selector: { matchLabels: appLabels },
        template: {
            metadata: { labels: appLabels },
            spec: {
                containers: [{
                    name: appName,
                    image: "nginx",
                    ports: [{ name: "http", containerPort: 80 }]
                }],
            }
        }
    },
}, { provider: cluster.provider });

const service = new k8s.core.v1.Service(`${appName}-svc`, {
    metadata: { labels: appLabels },
    spec: {
        type: "LoadBalancer",
        ports: [{ port: 80, targetPort: "http" }],
        selector: appLabels,
    },
}, { provider: cluster.provider });

// Export the URL for the load balanced service.
export const url = service.status.loadBalancer.ingress[0].hostname;

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
```

### Deploying a Helm Chart with Pulumi

```typescript
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

// Create an EKS cluster.
const cluster = new eks.Cluster("my-cluster");

// Deploy Wordpress into our cluster.
const wordpress = new k8s.helm.v2.Chart("wordpress", {
    repo: "stable",
    chart: "wordpress",
    values: {
        wordpressBlogName: "My Cool Kubernetes Blog!",
    },
}, { providers: { "kubernetes": cluster.provider } });

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
```

### Contributing

If you are interested in contributing, please see the [contributing docs][contributing].

### Code of Conduct

You can read the code of conduct [here][code-of-conduct].

[pulumi-kubernetes]: https://github.com/pulumi/pulumi-kubernetes
[contributing]: CONTRIBUTING.md
[code-of-conduct]: CODE-OF-CONDUCT.md
