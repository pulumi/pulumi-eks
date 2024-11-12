import os
import pulumi
import pulumi_aws as aws
import pulumi_eks as eks

project_name = pulumi.get_project()

# For CI testing only: used to set profileName to alternate AWS_PROFILE envvar.
if not os.getenv("ALT_AWS_PROFILE"):
    raise Exception("ALT_AWS_PROFILE must be set")

if not os.getenv("AWS_REGION"):
    raise Exception("AWS_REGION must be set")

# AWS named profile to use.
profile_name = os.getenv("ALT_AWS_PROFILE")

# Create an AWS provider instance using the named profile creds
# and current region.
aws_provider = aws.Provider("aws-provider",
                            profile=profile_name,
                            region=os.getenv("AWS_REGION"))

# Define the AWS provider credential opts to configure the cluster's
# kubeconfig auth.
kubeconfig_opts = eks.KubeconfigOptionsArgs(profile_name=profile_name)

# Create the cluster using the AWS provider and credential opts.
cluster = eks.Cluster(project_name,
                      provider_credential_opts=kubeconfig_opts,
                      authentication_mode=eks.AuthenticationMode.API,
                      opts=pulumi.ResourceOptions(provider=aws_provider))

# Export the cluster kubeconfig.
pulumi.export("kubeconfig", cluster.kubeconfig)

# Export the cluster kubeconfig with the AWS_PROFILE set.
pulumi.export("kubeconfig_with_profile", cluster.get_kubeconfig(profile_name=profile_name))
