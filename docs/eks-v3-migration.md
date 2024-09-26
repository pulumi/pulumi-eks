# EKS v3 Migration Guide

AWS recently announced the deprecation of two features used by default in Pulumi EKS: the aws-auth ConfigMap and the AL2 operating system. EKS v3 tries to address the recent deprecations in EKS by AWS, improve maintainability of the provider and align it with EKS best practices.

## New Features

- **Custom AMI, GPU Node, and User Data Support for `ManagedNodeGroup`**  
  `ManagedNodeGroup` now allows greater customization of node groups by supporting custom Amazon Machine Images (AMIs). This feature is particularly useful for users who require specific configurations or optimizations in their node images.  
  Additionally, you can now automatically select the right AMIs for nodes with GPUs by setting the `gpu` flag.  
  You can now also configure custom user data, giving more flexibility to users who need to run specific scripts or commands on node startup.  
    
- **Default Instance Type Update: t3.medium**  
  The default instance type for node groups has been updated from `t2.medium` to `t3.medium`. The `t3.medium` instance type provides several advantages:  
    
  - **Higher Availability**: `t2.medium` is an older instance type that is becoming less common in AWS regions, which can lead to capacity issues during scaling. The newer `t3.medium` instance type offers better availability.  
  - **Improved Cost Efficiency**: `t3.medium` is marginally cheaper than `t2.medium` ($0.0416 vs $0.0464 per hour), providing better performance at a lower cost.


- **New `operatingSystem` Property for Node Groups**  
  A new `operatingSystem` property has been introduced for node groups, giving users the flexibility to choose which OS their nodes should run. Supported options include Amazon Linux 2023 (AL2023) and Bottlerocket, allowing you to select the OS that best fits your workloads and compliance needs.  
    
  - **`RECOMMENDED` Default Setting**: By default, the `RECOMMENDED` option will be used, which ensures your nodes are always running the OS recommended by AWS for optimal security and performance. This default setting will be kept in sync with AWS’s updates.


- **EKS Cluster Addon Management: `vpc-cni` and `coredns`**  
  The EKS cluster components `vpc-cni` and `coredns` are now configured as EKS managed addons. This change eliminates the dependency on `kubectl` for managing these components and automates their updates, ensuring that clusters stay up to date without manual intervention.  
  This also simplifies management of clusters with private API endpoints because those components are managed via AWS APIs.  
    
- **Support for Cluster Autoscaler and External Scaling**  
  Pulumi-EKS v3 introduces support for integrating with the Kubernetes cluster-autoscaler, which allows your cluster to scale dynamically based on resource needs. A new `ignoreScalingChanges` parameter has been added for node groups. This parameter allows Pulumi to ignore external scaling changes (e.g., changes to the desired size made by the cluster-autoscaler).  
    
- **Cluster Version Tracking in `ManagedNodeGroup`**  
  `ManagedNodeGroup` now automatically tracks the EKS cluster version, ensuring smoother version upgrades and preventing version mismatches. Since EKS only allows one minor version skew between the cluster control plane and the nodes, this automatic tracking helps prevent upgrade failures due to version incompatibility.

# Migration

## VPC CNI Component changes

The VPC CNI cluster component is now configured as an EKS addon as mentioned in the “New Features” section above. This brings the following changes:

- Removed `enableIpv6` input property. The component automatically configures the IP version now depending on whether the cluster is running in IPv4 or IPv6 mode.  
- Removed `image`, `initImage`, `nodeAgentImage` input properties. The component now automatically selects an image registry in the cluster’s region to pull the images from.

## Node Group Updates

### `NodeGroup` component deprecation

The `NodeGroup` component uses the deprecated AWS Launch Configuration (see [AWS docs](https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html)). Launch Configurations do not support new instance types released after December 31, 2022 and starting on October 1, 2024, new AWS accounts will not be able to create launch configurations.
Its successor, the `NodeGroupV2` component is functionally equivalent and easier to operate because it does not use CloudFormation templates under the hood like `NodeGroup` did.

The default node group of the `Cluster` component was updated to use the `NodeGroupV2` component as well.  
Updates to the default node group will be done by first creating the new replacement nodes and then shutting down the old ones which will move pods to the new nodes. If you need to perform the update gracefully, please have a look at [Gracefully upgrading node groups](#gracefully-upgrading-node-groups).

### Default OS of node groups updated to AL2023

AWS recently deprecated the Amazon Linux 2 (AL2) operating system. It will reach end of life in June 2025, after which it will receive no more security and maintenance updates.  
Up until now this was the OS of node groups created with the pulumi-eks provider.  
To align the provider with EKS best practices we’ve updated the default operating system to the new AWS-recommended option, Amazon Linux 2023 (AL2023).

You can either upgrade the OS right away, or intentionally configure AL2 as the desired operating system by using the `operatingSystem` parameter that’s available on all node groups.

Have a look at [Gracefully upgrading node groups](#gracefully-upgrading-node-groups) for more information around the upgrade procedure.

### Gracefully upgrading node groups

The `ManagedNodeGroup` component gracefully handles updates by default. For them EKS will:

- boot the updated replacement nodes  
- cordon the old nodes to ensure no new pods get launched onto them  
- one-by-one drain the old nodes  
- shut down the empty old nodes

The detailed update procedure can be seen in the [AWS docs](https://docs.aws.amazon.com/eks/latest/userguide/managed-node-update-behavior.html).

For self-managed node groups (i.e. the `NodeGroup` and `NodeGroupV2` components) you have two options:

1. Update the node group in place. Pulumi does this by first creating the new replacement nodes and then shutting down the old ones which will move pods to the new nodes forcibly. This is the default behavior when node groups are updated.  
2. Create a new node group and move your Pods to that group. Migrating to a new node group is more graceful than simply updating the node group in place. This is because the migration process taints the old node group as `NoSchedule` and drains the nodes gradually.

The second option involves the following steps:

1. Create the replacement node group side-by-side with the existing node group. When doing this you need to make sure that the two node groups are allowed to communicate with each other. You can achieve this the following way:

```ts
const oldNG = new eks.NodeGroupV2("old", {
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2,
  instanceProfile: instanceProfile,
});
const export oldAsgName = oldNG.autoScalingGroup.name;

const newNG = new eks.NodeGroupV2("new", {
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceProfile: instanceProfile,
});

// Allow all traffic between the old & new NG
const oldToNew = new aws.vpc.SecurityGroupIngressRule("oldToNew", {
    securityGroupId: oldNG.nodeSecurityGroup.id,
    referencedSecurityGroupId: newNG.nodeSecurityGroup.id,
    fromPort: 0,
    ipProtocol: "-1",
    toPort: 0,
});
const newToOld = new aws.vpc.SecurityGroupIngressRule("newToOld", {
    securityGroupId: newNG.nodeSecurityGroup.id,
    referencedSecurityGroupId: oldNG.nodeSecurityGroup.id,
    fromPort: 0,
    ipProtocol: "-1",
    toPort: 0,
});
```

2. Find the nodes of the old node group. First take a note of the name of the auto scaling group associated with that node group and then run the following AWS CLI command, replacing `$ASG_GROUP_NAME` with the actual name of the auto scaling group:

```bash
aws ec2 describe-instances --filter "Name=tag:aws:autoscaling:groupName,Values=$ASG_GROUP_NAME" \
    | jq -r '.Reservations[].Instances[].PrivateDnsName'
```

3. Drain each of the nodes of the old node group one by one. This will mark the nodes as unschedulable and gracefully move pods to other nodes. For more information have a look at this article in the [kubernetes documentation](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/).

```bash
kubectl drain $NODE_NAME --ignore-daemonsets --delete-emptydir-data
```

4. The old nodes are now empty and can be safely shut down. Remove them from your pulumi program and run `pulumi up`

## aws-auth ConfigMap Deprecation

AWS introduced a new method for granting IAM principals access to Kubernetes resources called [Access Entries](https://docs.aws.amazon.com/eks/latest/userguide/grant-k8s-access.html#authentication-modes). In contrast to the existing approach using the aws-auth ConfigMap, this solely relies on AWS resources for managing Kubernetes auth.  
Recently the aws-auth ConfigMap has been deprecated in favor of Access Entries.  
You can start using Access Entries with your cluster by changing the `authenticationMode` to `API`.  
A step-by-step migration guide can be found [here](https://github.com/pulumi/pulumi-eks/blob/master/docs/authentication-mode-migration.md).

At this time we recommend users to create all new clusters with the authentication mode `API.`  
More details about this can be found [here](https://docs.aws.amazon.com/eks/latest/userguide/grant-k8s-access.html).

## Nodejs SDK breaking changes

Up until this point the provider exposed a hand-written nodejs SDK instead of using the multi-language-component approach that was used for the other SDKs like Python. This caused inaccurate documentation as well as an increased maintenance effort.

As part of this release we’re aligning the nodejs SDK with the rest of the SDKs and leverage the multi-language-component to auto-generate it.  
We’ve worked hard to minimize breaking changes this causes for nodejs users. These are the changes users see in their programs:

- Properties of the components are now outputs instead of plain types. Notable cases were you need to change your program are:  
  - The [`Cluster::getKubeConfig`](https://www.pulumi.com/registry/packages/eks/api-docs/cluster/#method_GetKubeconfig) method now returns an output.  
  - Creating an IRSA based IAM role now requires you to use `apply` for accessing the OIDC provider ARN and URL. An example of how this works can be found [here](https://github.com/pulumi/pulumi-eks/blob/release-3.x.x/examples/oidc-iam-sa/index.ts).  
  - `k8s.Provider` will be deleted if you are not referencing it (no impact, just will show up in the diff)  
  - `clusterOidcProvider` is an output now. `getKubeConfig` returns an output now  
- The deprecated input property `deployDashboard` of the `Cluster` component has been removed from the nodejs SDK. This has already been removed from the other SDKs in the past. If you’d like to continue using it, you can adopt the existing code into your own program from [here](https://github.com/pulumi/pulumi-eks/blob/bcc170e72b802a78e7f0a99bc92316a5f8a62b0e/nodejs/eks/dashboard.ts).
