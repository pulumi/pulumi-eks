[![Build Status](https://travis-ci.com/pulumi/pulumi-eks.svg?token=eHg7Zp5zdDDJfTjY8ejq&branch=master)](https://travis-ci.com/pulumi/pulumi-eks)

# Pulumi Amazon Web Services (AWS) EKS Components

Pulumi's library for easily creating and managing EKS Kubernetes clusters.

This package is meant for use with the Pulumi CLI. Please visit [pulumi.com](https://www.pulumi.com) for
installation instructions.

## Links

* [API Documentation](https://pulumi.io/reference/pkg/nodejs/@pulumi/eks/index.html)
* [Examples](./nodejs/eks/examples)

## Pre-Requisites

1. [Install Pulumi](https://www.pulumi.com/docs/reference/install).
1. Install [Node.js](https://nodejs.org/en/download).
1. Install a package manager for Node.js, such as [NPM](https://www.npmjs.com/get-npm) or [Yarn](https://yarnpkg.com/lang/en/docs/install).
1. [Configure AWS Credentials](https://www.pulumi.com/docs/reference/clouds/aws/setup/).
1. [Install AWS IAM Authenticator for Kubernetes](https://docs.aws.amazon.com/eks/latest/userguide/install-aws-iam-authenticator.html).
1. [Install `kubectl`](https://kubernetes.io/docs/tasks/tools/install-kubectl/#install-kubectl).

## Installing

This package is available in JavaScript/TypeScript for use with Node.js.  Install it using either `npm`:

```bash
$ npm install @pulumi/eks
```

or `yarn`:

```bash
$ yarn add @pulumi/eks
```

This package requires `aws-iam-authenticator` for Amazon EKS in order to deploy resources to EKS clusters. Install this
tool using the [official instructions](https://docs.aws.amazon.com/eks/latest/userguide/install-aws-iam-authenticator.html).

## Concepts

This package provides a Pulumi component that creates and manages the resource necessary to run an EKS Kubernetes
cluster in AWS. This includes:
- The EKS cluster
- The cluster's worker nodes, and node groups which are managed by an autoscaling group
- The Kubernetes resources needed to allow the worker nodes to access the cluster

The default configuration targets the AWS account's default VPC, and creates an autoscaling group of two `t2.medium` EC2 instances:

```typescript
import * as eks from "@pulumi/eks";

// Create an EKS cluster with the default configuration.
const cluster = new eks.Cluster("my-cluster");

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;
```

Once the cluster is created, you can deploy to the cluster using the [`@pulumi/kubernetes`][pulumi-kubernetes] SDK, kubectl, Helm, etc.

## Examples

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

[pulumi-kubernetes]: https://github.com/pulumi/pulumi-kubernetes
