import pulumi
import pulumi_aws as aws
import pulumi_eks as eks

from vpc import Vpc

project_name = pulumi.get_project()

# Create an EKS cluster with the default configuration.
cluster1 = eks.Cluster(f"{project_name}-1")

# Create an EKS cluster with a non-default configuration.
vpc = Vpc(f"{project_name}-2") # TODO specify tags: { "Name": f"{project_name}-2" }

cluster2 = eks.Cluster(f"{project_name}-2",
                       vpc_id=vpc.vpc_id,
                       public_subnet_ids=vpc.public_subnet_ids,
                       desired_capacity=2,
                       min_size=2,
                       max_size=2,
                       enabled_cluster_log_types=[
                           "api",
                           "audit",
                           "authenticator",
                       ])

# Export the clusters' kubeconfig.
pulumi.export("kubeconfig1", cluster1.kubeconfig)
pulumi.export("kubeconfig2", cluster2.kubeconfig)
