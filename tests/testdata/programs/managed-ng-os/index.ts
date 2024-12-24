
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
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
  authenticationMode: eks.AuthenticationMode.Api,
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

const baseConfig = {
  scalingConfig: {
    minSize: 1,
    maxSize: 1,
    desiredSize: 1,
  },
  subnetIds: eksVpc.privateSubnetIds,
}

const increasedPodCapacity = 100;

// Create a simple AL 2023 node group with x64 instances
const managedNodeGroupAL2023 = eks.createManagedNodeGroup("al-2023-mng", {
  ...baseConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
});

// Create a node group with a launch template and custom AMI
const managedNodeGroup = new eks.ManagedNodeGroup("al-2023-mng-amitype-launch-template", {
  ...baseConfig,
  cluster: cluster,
  nodeRole: role,
  amiType: "AL2023_ARM_64_STANDARD",
  instanceTypes: ["t4g.medium"],
  kubeletExtraArgs: "--max-pods=110",
});

const managedNodeGroupAL2023Taints = eks.createManagedNodeGroup("al-2023-mng-taints", {
  ...baseConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
  taints: [
    // Taints with values and without values should work
    {
      key: "mySpecialNodes",
      value: "special",
      effect: "NO_SCHEDULE",
    },
    {
      key: "withoutValue",
      effect: "NO_SCHEDULE",
    },
  ],
  labels: {
    "increased-pod-capacity": "true",
  },
  kubeletExtraArgs: `--max-pods=${increasedPodCapacity}`,
});

// Create a simple AL 2023 node group with arm instances
const managedNodeGroupAL2023Arm = eks.createManagedNodeGroup("al-2023-arm-mng", {
  ...baseConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceTypes: ["t4g.medium"],
  nodeRole: role,
});

// Create an AL 2023 node group with x64 instances and custom user data
const managedNodeGroupAL2023UserData = eks.createManagedNodeGroup("al-2023-mng-userdata", {
  ...baseConfig,
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
  ...baseConfig,
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

const managedNodeGroupAL2023NvidiaGpu = eks.createManagedNodeGroup("al-2023-mng-nvidia-gpu", {
  ...baseConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.AL2023,
  instanceTypes: ["g4dn.xlarge"],
  nodeRole: role,
  gpu: true,
  labels: {
    "nvidia-device-plugin-enabled": "true",
  },
});

// Create a DaemonSet for the NVIDIA device plugin. The accelerated Amazon Linux AMIs come with the NVIDIA drivers
// installed, but without the device plugin. Without it, kubernetes will not be aware of the GPUs.
const nvidiaDevicePlugin = new k8s.apps.v1.DaemonSet("nvidia-device-plugin", {
    metadata: {
        name: "nvidia-device-plugin-daemonset",
        namespace: "kube-system",
    },
    spec: {
        selector: {
            matchLabels: {
                name: "nvidia-device-plugin-ds",
            },
        },
        updateStrategy: {
            type: "RollingUpdate",
        },
        template: {
            metadata: {
                labels: {
                    name: "nvidia-device-plugin-ds",
                },
            },
            spec: {
                tolerations: [{
                    key: "nvidia.com/gpu",
                    operator: "Exists",
                    effect: "NoSchedule",
                }],
                nodeSelector: {
                    "nvidia-device-plugin-enabled": "true",
                },
                priorityClassName: "system-node-critical",
                containers: [{
                    name: "nvidia-device-plugin-ctr",
                    image: "nvcr.io/nvidia/k8s-device-plugin:v0.17.0",
                    env: [{
                        name: "FAIL_ON_INIT_ERROR",
                        value: "false",
                    }],
                    securityContext: {
                        allowPrivilegeEscalation: false,
                        capabilities: {
                            drop: ["ALL"],
                        },
                    },
                    volumeMounts: [{
                        name: "device-plugin",
                        mountPath: "/var/lib/kubelet/device-plugins",
                    }],
                }],
                volumes: [{
                    name: "device-plugin",
                    hostPath: {
                        path: "/var/lib/kubelet/device-plugins",
                    },
                }],
            },
        },
    },
}, {
    provider: cluster.provider,
});



// Create a simple Bottlerocket node group with x64 instances
const managedNodeGroupBottlerocket = eks.createManagedNodeGroup("bottlerocket-mng", {
  ...baseConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
});

// Create a Bottlerocket node group with GPU support (it's the cheapest GPU instance type)
const managedNodeGroupBottlerocketGpu = eks.createManagedNodeGroup("bottlerocket-mng-gpu", {
  ...baseConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  instanceTypes: ["g5g.xlarge"],
  nodeRole: role,
  gpu: true,
});

// Create a simple Bottlerocket node group with arm instances
const managedNodeGroupBottlerocketArm = eks.createManagedNodeGroup("bottlerocket-arm-mng", {
  ...baseConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  instanceTypes: ["t4g.medium"],
  nodeRole: role,
});

// Create a Bottlerocket node group with x64 instances and custom user data
const managedNodeGroupBottlerocketUserData = eks.createManagedNodeGroup("bottlerocket-mng-userdata", {
  ...baseConfig,
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
  ...baseConfig,
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
  ...baseConfig,
  cluster: cluster,
  operatingSystem: eks.OperatingSystem.Bottlerocket,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
  labels: {
    "increased-pod-capacity": "true",
  },
  taints: [
    // Taints with values and without values should work
    {
      key: "mySpecialNodes",
      value: "special",
      effect: "NO_SCHEDULE",
    },
    {
      key: "withoutValue",
      effect: "NO_SCHEDULE",
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

// Fetch the previous minor version. This way we test that the user specified AMI is used instead of the default one.
// MNGs tolerate a skew of 1 minor version
export const customAmiId = pulumi.all([cluster.eksCluster.version]).apply(([version]) => {
  const versionParts = version.split('.');
  const majorVersion = parseInt(versionParts[0], 10);
  const minorVersion = parseInt(versionParts[1], 10) - 1;
  const versionString = `${majorVersion}.${minorVersion}`;
  return pulumi.interpolate`/aws/service/eks/optimized-ami/${versionString}/amazon-linux-2023/x86_64/standard/recommended/image_id`;
}).apply(name =>
  aws.ssm.getParameter({ name }, { async: true })
).apply(result => result.value);

const customUserData = userdata.createUserData({
  name: cluster.core.cluster.name,
  endpoint: cluster.core.cluster.endpoint,
  certificateAuthority: cluster.core.cluster.certificateAuthority.data,
  serviceCidr: cluster.core.cluster.kubernetesNetworkConfig.serviceIpv4Cidr,
}, `--max-pods=${increasedPodCapacity} --node-labels=increased-pod-capacity=true`);

// Create a simple AL2023 node group with a custom user data and a custom AMI
const managedNodeGroupAL2023CustomUserData = eks.createManagedNodeGroup("al-2023-mng-custom-userdata", {
  ...baseConfig,
  operatingSystem: eks.OperatingSystem.AL2023,
  cluster: cluster,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
  diskSize: 100,
  userData: customUserData,
  amiId: customAmiId,
});

const managedNodeGroupAL2023CustomAmi = eks.createManagedNodeGroup("al-2023-mng-custom-ami", {
  ...baseConfig,
  operatingSystem: eks.OperatingSystem.AL2023,
  cluster: cluster,
  instanceTypes: ["t3.medium"],
  nodeRole: role,
  amiId: customAmiId,
});

const managedNodeGroupAL2023NodeadmExtraOptions = eks.createManagedNodeGroup("al-2023-mng-extra-options", {
  ...baseConfig,
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
