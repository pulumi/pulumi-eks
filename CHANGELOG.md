## Unreleased

### Improvements

- fix(tags): change map types used in all tags to pulumi.Inputs of the map
  [#157](https://github.com/pulumi/pulumi-eks/pull/157)
- fix(cluster): expose instanceRoles
  [#155](https://github.com/pulumi/pulumi-eks/pull/155)
- tests(cluster): enable test to replace cluster by adding more subnets
  [#150](https://github.com/pulumi/pulumi-eks/pull/150)
- update(aws-k8s-cni): move from 1.4.1 -> 1.5.0
  [#148](https://github.com/pulumi/pulumi-eks/pull/148)

## 0.18.6 (Released June 04, 2019)

### Improvements

- fix(cluster): rm dupe default storage class
  [#136](https://github.com/pulumi/pulumi-eks/pull/136)
- Expand nodejs SDK tests coverage, and add Kubernetes Smoke Tests for examples
  & tests [#130](https://github.com/pulumi/pulumi-eks/pull/130)
- update(aws-k8s-cni): move from 1.3.0 -> 1.4.1
  [#134](https://github.com/pulumi/pulumi-eks/pull/134)
- fix(cluster): export missing instanceRoles in the cluster's CoreData
  [#133](https://github.com/pulumi/pulumi-eks/pull/133)

## 0.18.5 (Released May 09, 2019)

### Improvements

- fix(nodeSecurityGroupTags): only expose option through Cluster class
  [#126](https://github.com/pulumi/pulumi-eks/pull/126)
- fix(secgroups): do not null out ingress & egress
  [#128](https://github.com/pulumi/pulumi-eks/pull/128)
    - Note: This PR reverses the default null values used for the
      ingress and egress in-line rules of the secgroups, introduced in `v0.18.3`.
      The null default was required to move to standalone secgroup rules, but it
      has introduced [issues](https://github.com/pulumi/pulumi-eks/issues/127), and thus is being removed in this PR.
    - Upgrade Path - This is a breaking change **unless** you do the following steps:
      - If using >= `v0.18.3`: update using the typical package update path.
      - If using <= `v0.18.2`:
        1. First, update your cluster from using your current version to `v0.18.4`.
        1. Next, update your cluster from `v0.18.4` to `v0.18.5` (or higher) using the typical package update path.

## 0.18.4 (Released May 02, 2019)

### Improvements

- feat(tags): Set default tags & add opts: tags, and other resource tags
  [#122](https://github.com/pulumi/pulumi-eks/pull/122)
- feat(control plane logging): Enable control plane logging to cloudwatch.
  [#100](https://github.com/pulumi/pulumi-eks/pull/117).
- fix(ami): only apply AMI smart-default selection on creation
  [#114](https://github.com/pulumi/pulumi-eks/pull/114)

## 0.18.3 (Released April 25, 2019)

### Improvements

- fix(secgroups): use standalone secgroup rules instead of in-line rules
  [#109](https://github.com/pulumi/pulumi-eks/pull/109). Note, because we are
  replacing existing in-line secgroup rules with standalone rules,
  there may be a brief period of outage where the security group rules are
  removed before they get added back. This update happens in a matter of
  seconds (~5 sec), so any interruptions are short-lived.

## 0.18.2 (Released April 24, 2019)

### Improvements

- fix(nodegroup): filter on x86_64 arch for node AMI
  [#112](https://github.com/pulumi/pulumi-eks/pull/112)

## 0.18.1 (Released April 08, 2019)

### Improvements

- feat(nodePools): support per-nodegroup IAM instance roles
  [#98](https://github.com/pulumi/pulumi-eks/pull/98)

## 0.18.0 (Released March 30, 2019)

### Improvements

- Moves to the new 0.18.0 version of `@pulumi/aws`.  Version 0.18.0 of `pulumi-aws` is now based on
  v2.2.0 of the AWS Terraform Provider, which has a variety of breaking changes from the previous
  version. See documentation in `@pulumi/aws` repo for more details.

## 0.17.4 (Released March 29, 2019)

### Improvements

- Fix a bug where the regex used to retrieve Worker Node AMIs was not
  returning correct AMIs when either: specifying the master / control plane
  version, or relying on smart defaults of the lastest available image. [#92](https://github.com/pulumi/pulumi-eks/pull/92)

## 0.17.3 (Released March 28, 2019)

### Improvements

- feat(workers): add 'nodeAssociatePublicIpAddress' to toggle public IPs
  [#81](https://github.com/pulumi/pulumi-eks/pull/81)
- fix(getAmi): allow setting master version & explicitly filter Linux AMIs
  [#85](https://github.com/pulumi/pulumi-eks/pull/85)
  - Fix a bug where the wrong AMI was being returned due to a loosely defined
    regex.
  - Add support for setting the master / control plane version of the cluster.

## 0.17.2 (Released March 19, 2019)

### Improvements

- Re-cut 0.17.1 as 0.17.2, due to a broken master branch caused by a pushed tag
publishing the NPM package before master was able to.

## 0.17.1 (Released March 19, 2019)

### Improvements

- Support for `taints` on `NodeGroups`. [#63](https://github.com/pulumi/pulumi-eks/pull/63)

## 0.17.0 (Released March 6th, 2019)

### Improvements

- Depend on latest version of `@pulumi/pulumi` to get more precise delete before create semantics [#46](https://github.com/pulumi/pulumi-eks/issues/46)

## 0.16.6 (Released January 29th, 2019)

### Improvements

- Expose the AutoScalingGroup on NodeGroups. [#53](https://github.com/pulumi/pulumi-eks/pull/53)
- Fix a bug where `desiredCapacity` was not being handled correctly. [#55](https://github.com/pulumi/pulumi-eks/pull/55)

## 0.16.5 (Released January 21st, 2019)

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
