[![Build Status](https://travis-ci.com/pulumi/eks.svg?token=eHg7Zp5zdDDJfTjY8ejq&branch=master)](https://travis-ci.com/pulumi/eks)

# Pulumi Amazon Web Services (AWS) EKS Components

Pulumi's library for easily creating and managing EKS Kubernetes clusters.

This package is meant for use with the Pulumi CLI.  Please visit [pulumi.io](https://pulumi.io) for
installation instructions.

## Installing

This package is available in JavaScript/TypeScript for use with Node.js.  Install it using either `npm`:

    $ npm install @pulumi/eks

or `yarn`:

    $ yarn add @pulumi/eks

## Concepts

This package provides a Pulumi component that creates and manages the resource necessary to run an EKS Kubernetes
cluster in AWS. This includes:
- The EKS cluster itself
- The cluster's worker nodes, which are managed by an autoscaling group
- The Kubernetes resources needed to allow the worker nodes to access the cluster
- Any Kubernetes StorageClasses needed for applications that will be deployed to the cluster
- An optional deployment of the Kubernetes Dashboard

The default configuration targets the default VPC and creates an autoscaling group of 2 "t2.medium" EC2 instances, a
"gp2" default StorageClass, and a deployment of the Kubernetes Dashboard:

```typescript
import * as eks from "@pulumi/eks";

const cluster = new eks.Cluster("cluster");

export const kubeconfig = cluster.kubeconfig;
```

Once the cluster is created, you can deploy into the cluster using "@pulumi/kubernetes", kubectl, helm, etc.

```typescript
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

const cluster = new eks.Cluster("cluster");

const hackmd = new k8s.helm.v2.Chart("hackmd", {
    repo: "stable",
    chart: "hackmd",
    version: "0.1.1",
    values: {
        service: {
            type: "LoadBalancer",
            port: 80,
        },
    },
}, { providers: { kubernetes: cluster.provider } });
```

## Reference

For detailed reference documentation, please visit [the API docs](https://pulumi.io/reference/pkg/nodejs/@pulumi/eks/index.html).
