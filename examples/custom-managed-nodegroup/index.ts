import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as pulumi from "@pulumi/pulumi";
import * as iam from "./iam";
import * as userdata from "./userdata";

// IAM roles for the node groups.
const instanceRole = iam.createRole("example-instance-role");

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("eks-vpc", {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
});

// Create an EKS cluster.
const cluster = new eks.Cluster("example-managed-nodegroup", {
  skipDefaultNodeGroup: true,
  vpcId: eksVpc.vpcId,
  // Public subnets will be used for load balancers
  publicSubnetIds: eksVpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: eksVpc.privateSubnetIds,
  authenticationMode: eks.AuthenticationMode.Api,
  accessEntries: {
    instanceRole: {
      principalArn: instanceRole.arn,
      type: eks.AccessEntryType.EC2Linux,
    }
  }
});

export const defaultInstanceRoles = cluster.instanceRoles;

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

const ami = pulumi.interpolate`/aws/service/eks/optimized-ami/${cluster.core.cluster.version}/amazon-linux-2023/x86_64/standard/recommended/image_id`.apply(name =>
  aws.ssm.getParameter({ name }, { async: true })
).apply(result => result.value);

const customUserData = userdata.createUserData({
  name: cluster.core.cluster.name,
  endpoint: cluster.core.cluster.endpoint,
  certificateAuthority: cluster.core.cluster.certificateAuthority.data,
  serviceCidr: cluster.core.cluster.kubernetesNetworkConfig.serviceIpv4Cidr,
});

const launchTemplate = new aws.ec2.LaunchTemplate("managed-ng-launchTemplate",
  {
      blockDeviceMappings: [
          {
              deviceName: "/dev/xvda",
              ebs: {
                  volumeSize: 20,
                  volumeType: "gp3",
                  deleteOnTermination: "true",
                  encrypted: "true",
              },
          },
      ],
      userData: customUserData,
      // We need to always supply an imageId, otherwise AWS will attempt to merge the user data which will result in
      // nodes failing to join the cluster.
      imageId: ami
  },
);

export const launchTemplateName = launchTemplate.name;

// Create a simple AWS managed node group using a cluster as input and the
// refactored API.
const managedNodeGroup = eks.createManagedNodeGroup("example-managed-ng", {
  cluster: cluster,
  nodeRole: instanceRole,
  scalingConfig: {
    minSize: 1,
    maxSize: 2,
    desiredSize: 1,
  },
  launchTemplate: {
    id: launchTemplate.id,
    version: pulumi.interpolate`${launchTemplate.latestVersion}`,
  }
});
