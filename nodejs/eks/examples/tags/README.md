# examples/tags

Demonstrates how to use cluster and resource tags in differnt ways with Node Groups.

For each case, it will create an EKS cluster in the default VPC without worker nodes.

Then, create the following clusters:
* Simple case - apply tags to all cluster managed resources, as well as apply specific resource tags.
* Advanced case:
  * ondemand node group on the Cluster, using node group specific resource tags.
  * spot price node group, using the Cluster, and node group specific resource tags.
