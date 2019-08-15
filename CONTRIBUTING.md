# Contributing to `pulumi/eks`

## Building Source

### Restore Vendor Dependencies

```bash
$ make ensure
```

### Build and Install

Run the following command to build and install the source.

The output will be stored in `/opt/pulumi/node_modules/@pulumi/eks`.

```bash
$ make only_build
```

There is also a helper [build script](./dev/build.sh) that restores the dependencies, builds, and installs the source.

After `make` has completed, from your Pulumi program directory you must link the recent `@pulumi/eks` build from `/opt/` by running the following command:

```bash
$ yarn link @pulumi/eks
```

## Running Integration Tests

The examples and integration tests in this repository will create and destroy EKS clusters and Kubernetes objects while running.

If possible, run your development PRs against the tests to confirm no errors
before submitting them:

```bash
$ make test_all
```
