# test-awsx-network-and-subnetIds

EKS cluster examples using the previous `awsx.Network` API and cluster network setups.

Tests two types of clusters that use the previous network API setup:
- One cluster uses a VPC from the `awsx.Network` API, and cluster `subnetIds`.
- One cluster uses a VPC from the `awsx.Network` API, cluster `subnetIds`, and a node group with the `nodeSubnetIds` override option.
