import os
import pulumi
import pulumi_aws as aws
import pulumi_eks as eks

# TODO[pulumi/pulumi#5455]: To temporarily workaround an issue with dynamic providers
# we need to install the @pulumi/eks Node.js package in our example's directory.
# Once the issue has been addressed, we can remove this.
with open("package.json", "w") as writer:
    writer.write('{ "dependencies": { "@pulumi/eks": "latest" } }')
os.system("yarn install && yarn link @pulumi/eks")

project_name = pulumi.get_project()

# Create an EKS cluster with the default configuration.
cluster1 = eks.Cluster(f"{project_name}-1")

# TODO
# // Create an EKS cluster with a non-default configuration.
# const vpc = new awsx.ec2.Vpc(`${projectName}-2`, {
#     tags: { "Name": `${projectName}-2` },
# });

# const cluster2 = new eks.Cluster(`${projectName}-2`, {
#     vpcId: vpc.id,
#     publicSubnetIds: vpc.publicSubnetIds,
#     desiredCapacity: 2,
#     minSize: 2,
#     maxSize: 2,
#     deployDashboard: false,
#     enabledClusterLogTypes: [
#         "api",
#         "audit",
#         "authenticator",
#     ],
# });

# Export the clusters' kubeconfig.
pulumi.export("kubeconfig1", cluster1.kubeconfig)
# TODO
# pulumi.export("kubeconfig2", cluster2.kubeconfig)
