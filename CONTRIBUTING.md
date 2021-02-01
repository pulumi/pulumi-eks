# Contributing to `pulumi/eks`

## Building Source

### Requirements

The Makefile makes use of the `pulumictl` binary which isn't part of the pulumi installation itself. The program can
be obtained from the releases page of the [pulumictl repository](https://github.com/pulumi/pulumictl/releases/).

Second build dependency is the yarn package manager which can be found [here](https://yarnpkg.com/getting-started/install).

### Build and Install

Run the following command to build and install the source.

The output will be stored in `/opt/pulumi/node_modules/@pulumi/eks`.

```bash
$ make build_nodejs && make install_nodejs_sdk
```

There is also a helper [build script](./dev/build.sh) that builds and installs the source.

`cd` into your Pulumi program directory.  After `make` has completed, link the recent `@pulumi/eks` build by running the following command:

```bash
$ yarn link @pulumi/eks
```

## Running Integration Tests

The examples and integration tests in this repository will create and destroy EKS clusters and Kubernetes objects while running.

Before submitting PRs, run the integration tests to confirm there are no
errors.

```bash
$ make test
```
