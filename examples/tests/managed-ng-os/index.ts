
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";
import * as userdata from "./userdata";

// IAM roles for the node groups.
const role = iam.createRole("managed-ng-os");

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("managed-ng-os", {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
});

// Create an EKS cluster.
const cluster = new eks.Cluster("managed-ng-os", {
  skipDefaultNodeGroup: true,
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.API,
  // Public subnets will be used for load balancers
  publicSubnetIds: eksVpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: eksVpc.privateSubnetIds,
  accessEntries: {
    instances: {
      principalArn: role.arn,
      type: eks.AccessEntryType.EC2_LINUX,
    }
  },
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

const scalingConfig = {
  scalingConfig: {
    minSize: 1,
    maxSize: 1,
    desiredSize: 1,
  },
}

const increasedPodCapacity = 100;

// Create a simple AL 2023 node group with x64 instances
const managedNodeGroupAL2023 = eks.createManagedNodeGroup("al-2023-mng", {
  ...scalingConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
});

const managedNodeGroupAL2023Taints = eks.createManagedNodeGroup("al-2023-mng-taints", {
  ...scalingConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
  taints: [
    // Taints with values and without values should work
    {
      key: "mySpecialNodes",
      value: "special",
      effect: "NoSchedule",
    },
    {
      key: "withoutValue",
      effect: "NoSchedule",
    },
  ],
  kubeletExtraArgs: `--max-pods=${increasedPodCapacity}`,
});

// Create a simple AL 2023 node group with arm instances
const managedNodeGroupAL2023Arm = eks.createManagedNodeGroup("al-2023-arm-mng", {
  ...scalingConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceTypes: ["t4g.medium"],
  nodeRole: role,
});

// Create an AL 2023 node group with x64 instances and custom user data
const managedNodeGroupAL2023UserData = eks.createManagedNodeGroup("al-2023-mng-userdata", {
  ...scalingConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
  diskSize: 100,
  labels: {
    "increased-pod-capacity": "true",
    "increased-storage-capacity": "true",
  },
  kubeletExtraArgs: `--max-pods=${increasedPodCapacity}`,
});

// Create an AL 2023 node group with arm instances and custom user data
const managedNodeGroupAL2023ArmUserData = eks.createManagedNodeGroup("al-2023-arm-mng-userdata", {
  ...scalingConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceTypes: ["t4g.medium"],
  nodeRole: role,
  diskSize: 100,
  labels: {
    "increased-pod-capacity": "true",
    "increased-storage-capacity": "true",
  },
  kubeletExtraArgs: `--max-pods=${increasedPodCapacity}`,
});

// Create a simple Bottlerocket node group with x64 instances
const managedNodeGroupBottlerocket = eks.createManagedNodeGroup("bottlerocket-mng", {
  ...scalingConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
});

// Create a Bottlerocket node group with GPU support (it's the cheapest GPU instance type)
const managedNodeGroupBottlerocketGpu = eks.createManagedNodeGroup("bottlerocket-mng-gpu", {
  ...scalingConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  instanceTypes: ["g5g.xlarge"],
  nodeRole: role,
  gpu: true,
});

// Create a simple Bottlerocket node group with arm instances
const managedNodeGroupBottlerocketArm = eks.createManagedNodeGroup("bottlerocket-arm-mng", {
  ...scalingConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  instanceTypes: ["t4g.medium"],
  nodeRole: role,
});

// Create a Bottlerocket node group with x64 instances and custom user data
const managedNodeGroupBottlerocketUserData = eks.createManagedNodeGroup("bottlerocket-mng-userdata", {
  ...scalingConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
  diskSize: 100,
  labels: {
    "increased-pod-capacity": "true",
    "increased-storage-capacity": "true",
  },
  bottlerocketSettings: {
    settings: {
      kubernetes: {
        "max-pods": increasedPodCapacity,
      },
    },
  },
});

// Create a Bottlerocket node group with arm instances and custom user data
const managedNodeGroupBottlerocketArmUserData = eks.createManagedNodeGroup("bottlerocket-arm-mng-userdata", {
  ...scalingConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  instanceTypes: ["t4g.medium"],
  nodeRole: role,
  diskSize: 100,
  labels: {
    "increased-pod-capacity": "true",
    "increased-storage-capacity": "true",
  },
  bottlerocketSettings: {
    settings: {
      kubernetes: {
        "max-pods": increasedPodCapacity,
      },
    },
  },
});

const managedNodeGroupBottlerocketTaints = eks.createManagedNodeGroup("bottlerocket-mng-taints", {
  ...scalingConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
  taints: [
    // Taints with values and without values should work
    {
      key: "mySpecialNodes",
      value: "special",
      effect: "NoSchedule",
    },
    {
      key: "withoutValue",
      effect: "NoSchedule",
    },
  ],
  bottlerocketSettings: {
    settings: {
      kubernetes: {
        "max-pods": increasedPodCapacity,
      },
    },
  },
});

// Create a simple AL2023 node group with a custom user data and a custom AMI
const amiId = pulumi.interpolate`/aws/service/eks/optimized-ami/${cluster.core.cluster.version}/amazon-linux-2023/x86_64/standard/recommended/image_id`.apply(name =>
  aws.ssm.getParameter({ name }, { async: true })
).apply(result => result.value);

const customUserData = userdata.createUserData({
  name: cluster.core.cluster.name,
  endpoint: cluster.core.cluster.endpoint,
  certificateAuthority: cluster.core.cluster.certificateAuthority.data,
  serviceCidr: cluster.core.cluster.kubernetesNetworkConfig.serviceIpv4Cidr,
}, `--max-pods=${increasedPodCapacity} --node-labels=increased-pod-capacity=true`);

const managedNodeGroupAL2023CustomUserData = eks.createManagedNodeGroup("al-2023-mng-custom-userdata", {
  ...scalingConfig,
  operatingSystem: eks.OperatingSystem.AL2023,
  cluster: cluster,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
  diskSize: 100,
  userData: customUserData,
  amiId,
});

const managedNodeGroupAL2023NodeadmExtraOptions = eks.createManagedNodeGroup("al-2023-mng-extra-options", {
  ...scalingConfig,
  operatingSystem: eks.OperatingSystem.AL2023,
  cluster: cluster,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
  nodeadmExtraOptions: [
    {
      contentType: "application/node.eks.aws",
      content: userdata.customFlags(`--max-pods=${increasedPodCapacity} --node-labels=increased-pod-capacity=true`),
    },
    {
      contentType: `text/x-shellscript; charset="us-ascii"`,
      content: `#!/bin/bash\necho "Hello Pulumi!"`,
    },
  ]
});
