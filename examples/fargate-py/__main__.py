import pulumi
import pulumi_eks as eks
import pulumi_awsx as awsx

project_name = pulumi.get_project()

# Create an EKS cluster with the fargate configuration.
vpc = awsx.ec2.Vpc(project_name,
    tags={"Name": project_name}
)
cluster = eks.Cluster(project_name,
                      vpc_id=vpc.vpc_id,
                      private_subnet_ids=vpc.private_subnet_ids,
                      fargate=True)

# Export the cluster kubeconfig.
pulumi.export("kubeconfig", cluster.kubeconfig)
