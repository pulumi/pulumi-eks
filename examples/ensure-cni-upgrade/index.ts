import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";
import * as userdata from "./userdata";

const projectName = pulumi.getProject();

// IAM roles for the node groups.
const role = iam.createRole(projectName);

const eksVpc = new awsx.ec2.Vpc(projectName, {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
});

const cluster = new eks.Cluster(projectName, {
  skipDefaultNodeGroup: true,
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.API,
  publicSubnetIds: eksVpc.publicSubnetIds,
  privateSubnetIds: eksVpc.privateSubnetIds,
  vpcCniOptions: {
    disableTcpEarlyDemux: true,
    logLevel: "INFO",
    securityContextPrivileged: true,
  },
});

export const kubeconfig = cluster.kubeconfig;
export const clusterName = cluster.core.cluster.name;

// Create a simple AL2023 node group. We cannot use the provider built-ins for that because the node groups didn't support it in v2 of the provider.
const amiId = pulumi.interpolate`/aws/service/eks/optimized-ami/${cluster.core.cluster.version}/amazon-linux-2023/x86_64/standard/recommended/image_id`.apply(name =>
  aws.ssm.getParameter({ name }, { async: true })
).apply(result => result.value);

const customUserData = userdata.createUserData({
  name: cluster.core.cluster.name,
  endpoint: cluster.core.cluster.endpoint,
  certificateAuthority: cluster.core.cluster.certificateAuthority.data,
  serviceCidr: cluster.core.cluster.kubernetesNetworkConfig.serviceIpv4Cidr,
});

const launchTemplate = new aws.ec2.LaunchTemplate(projectName,
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
      imageId: amiId,
  },
);

export const launchTemplateName = launchTemplate.name;

// Create a simple AWS managed node group using a cluster as input and the
// refactored API.
const managedNodeGroup = eks.createManagedNodeGroup(projectName, {
  cluster: cluster,
  nodeRole: role,
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
