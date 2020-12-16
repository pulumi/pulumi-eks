import pulumi
import pulumi_eks as eks

from vpc import Vpc

project_name = pulumi.get_project()

# Create an EKS cluster with the fargate configuration.
vpc = Vpc(project_name)
cluster = eks.Cluster(project_name,
                      vpc_id=vpc.vpc_id,
                      private_subnet_ids=vpc.private_subnet_ids,
                      fargate=True)

# Export the cluster kubeconfig.
pulumi.export("kubeconfig", cluster.kubeconfig)
