# examples/aws-profile-role

Creates an EKS cluster using a named profile. Additionally, creates a new
cluster admin IAM role that gets mapped into the cluster's RBAC on creation for
usage. Then, use the named profile and cluster role to deploy a Pod.
