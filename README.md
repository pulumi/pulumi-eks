[![Build Status](https://github.com/pulumi/pulumi-eks/actions/workflows/master.yml/badge.svg)](https://github.com/pulumi/pulumi-eks/actions/workflows/master.yml)
[![Slack](http://www.pulumi.com/images/docs/badges/slack.svg)](https://slack.pulumi.com)
[![npm version](https://badge.fury.io/js/@pulumi%2Feks.svg)](https://badge.fury.io/js/@pulumi%2Feks)
[![Python version](https://badge.fury.io/py/pulumi-eks.svg)](https://pypi.org/project/pulumi-eks)
[![NuGet version](https://badge.fury.io/nu/pulumi.eks.svg)](https://badge.fury.io/nu/pulumi.eks)
[![PkgGoDev](https://pkg.go.dev/badge/github.com/pulumi/pulumi-eks/sdk/go/eks)](https://pkg.go.dev/github.com/pulumi/pulumi-eks/sdk/go/eks)

# Pulumi Amazon Web Services (AWS) EKS Components

The Pulumi EKS library provides a Pulumi component that creates and manages the resources necessary to run an EKS Kubernetes cluster in AWS. This component exposes the Crosswalk for AWS functionality documented in the [Pulumi Elastic Kubernetes Service guide](https://www.pulumi.com/docs/guides/crosswalk/aws/eks/) as a package available in all Pulumi languages.


This includes:
- The EKS cluster control plane.
- The cluster's worker nodes configured as node groups, which are managed by an auto scaling group.
- The AWS CNI Plugin [`aws-k8s-cni`](https://github.com/aws/amazon-vpc-cni-k8s/) to manage pod networking in Kubernetes.


<div>
    <a href="https://www.pulumi.com/templates/kubernetes/aws/" title="Get Started">
       <img src="https://www.pulumi.com/images/get-started.svg?" width="120">
    </a>
</div>

## Installing

This package is available in many languages in the standard packaging formats.

### Node.js (JavaScript/TypeScript)

To use from JavaScript or TypeScript in Node.js, install it using either `npm`:

```bash
$ npm install @pulumi/eks
```

 or `yarn`:

```bash
$ yarn add @pulumi/eks
```

### Python

To use from Python, install using `pip`:

    $ pip install pulumi_eks

### Go

To use from Go, use `go get` to grab the latest version of the library

    $ go get github.com/pulumi/pulumi-eks/sdk/go

### .NET

To use from .NET, install using `dotnet add package`:

    $ dotnet add package Pulumi.Eks

## References

* [Tutorial](https://www.pulumi.com/blog/easily-create-and-manage-aws-eks-kubernetes-clusters-with-pulumi/)
* [Reference Documentation](https://www.pulumi.com/registry/packages/eks/api-docs/)
* [Examples](./examples)
* [Crosswalk for AWS - EKS Guide](https://www.pulumi.com/docs/guides/crosswalk/aws/eks/)

## Contributing

If you are interested in contributing, please see the [contributing docs][contributing].

## Code of Conduct

Please follow the [code of conduct][code-of-conduct].

[contributing]: CONTRIBUTING.md
[code-of-conduct]: CODE-OF-CONDUCT.md
