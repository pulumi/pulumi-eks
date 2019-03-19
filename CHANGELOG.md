## Unreleased

### Improvements

## 0.17.1 (Release March 19, 2019)

- Support for `taints` on `NodeGroups`. [#63](https://github.com/pulumi/pulumi-eks/pull/63)

## 0.17.0 (Release March 6th, 2019)

### Improvements

- Depend on latest version of `@pulumi/pulumi` to get more precise delete before create semantics [#46](https://github.com/pulumi/pulumi-eks/issues/46)

## 0.16.6 (Release January 29th, 2019)

### Improvements

- Expose the AutoScalingGroup on NodeGroups. [#53](https://github.com/pulumi/pulumi-eks/pull/53)
- Fix a bug where `desiredCapacity` was not being handled correctly. [#55](https://github.com/pulumi/pulumi-eks/pull/55)

## 0.16.5 (Release January 21st, 2019)

### Improvements

- Support for multiple Worker `NodeGroup`s connected to a single EKS cluster. [#39](https://github.com/pulumi/pulumi-eks/issues/39)
- Support for Spot instances in `NodeGroup`s. [#49](https://github.com/pulumi/pulumi-eks/pull/49)
- Support for adding cutom policies to node `InstanceRole`. [#49](https://github.com/pulumi/pulumi-eks/pull/49)
- Support for adding labels to each instance in a `NodeGroup`. [#49](https://github.com/pulumi/pulumi-eks/pull/49)

## 0.16.4 (Released December 13th, 2018)

### Improvements

- Expose underlying EKS `cluster`. [#31](https://github.com/pulumi/pulumi-eks/pull/31)
- Support custom worker node AMI. [#34](https://github.com/pulumi/pulumi-eks/pull/34)
- Update CNI to 1.3. [#37](https://github.com/pulumi/pulumi-eks/pull/37)

## 0.16.3 (Released November 21st, 2018)

### Improvements

- Allow configuring the subnets that worker nodes use.
- Improve detection of public vs. private subnets.
