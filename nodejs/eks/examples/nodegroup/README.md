# examples/nodegroup

Creates an EKS cluster in the default VPC with without worker nodes. Then
create and attach the following node groups to the cluster:

* ondemand t2.large node group with 2 nodes
* spot m4.large node group with 2 nodes
