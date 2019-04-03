# examples/nodegroup

Demonstrates how to use IAM in differnt ways with Node Groups.

For each case, it will create an EKS cluster in the default VPC without worker nodes.

Then, create and attach the following node groups to the cluster:
* Simple case - all node groups share the same role of their instance profile:
  * ondemand t2.large node group with 1 node, shared instanceRole, and labels.
  * spot m4.large node group with 1 node, shared instanceRole, labels, and
    taints.
* Advanced case - per node group instance profiles:
  * ondemand t2.large node group with 1 node, using specific instanceRole, labels, and taints.
  * spot m4.large node group with 1 node, using specific instanceRole, labels, and taints.
