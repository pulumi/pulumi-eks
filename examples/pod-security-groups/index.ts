import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";
import * as k8s from "@pulumi/kubernetes";
import * as app from "./application";

// IAM roles for the node groups.
const role = iam.createRole("pod-security-policies");

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("pod-security-policies", {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
});

// Create an EKS cluster.
const cluster = new eks.Cluster("pod-security-policies", {
  skipDefaultNodeGroup: true,
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.Api,
  // Public subnets will be used for load balancers
  publicSubnetIds: eksVpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: eksVpc.privateSubnetIds,
  vpcCniOptions: {
    // required for security groups for pods
    enablePodEni: true,
    // enables  using liveness or readiness probes with security groups for pods
    disableTcpEarlyDemux: true,
    configurationValues: {
      env: {
        // all inbound/outbound traffic from pod with security group will be enforced by security group rules
        POD_SECURITY_GROUP_ENFORCING_MODE: "strict",
      }
    }
  },
});

// Allows the cluster to manage ENIs, required for security groups for pods
new aws.iam.RolePolicyAttachment("eks-vpc-cni-policy", {
  policyArn: "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController",
  role: cluster.core.clusterIamRole.name,
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

const ng = eks.createManagedNodeGroup("pod-security-policies", {
  scalingConfig: {
    minSize: 1,
    maxSize: 2,
    desiredSize: 1,
  },
  // Pod Security Groups require instances that support ENI trunking. See: https://docs.aws.amazon.com/eks/latest/userguide/security-groups-for-pods.html
  instanceTypes: ["c6i.large", "c7i.large"],
  cluster: cluster,
  nodeRole: role,
});

const kube = cluster.provider;

// Create a SecurityGroup for the nginx application
const nginxSg = new aws.ec2.SecurityGroup("nginx", {
  vpcId: eksVpc.vpcId,
});

// Allow all traffic between the cluster and the nginx SecurityGroup
configureClusterAccess("nginx", cluster, nginxSg);

// Create the nginx application (Deployment, Service, SecurityGroupPolicy)
const nginx = app.createApplication("nginx", nginxSg.id, kube);

/*
 * Verify that the SecurityGroupPolicy is working as expected.
 */

// Create a SecurityGroup for the caller job
const callerSg = new aws.ec2.SecurityGroup("caller", {
  vpcId: eksVpc.vpcId,
});

// Allow all traffic between the cluster and the caller SecurityGroup
configureClusterAccess("caller", cluster, callerSg);

// Allow the caller job to access the nginx service
new aws.vpc.SecurityGroupIngressRule("caller-to-nginx", {
  securityGroupId: nginxSg.id,
  ipProtocol: "tcp",
  fromPort: 80,
  toPort: 80,
  referencedSecurityGroupId: callerSg.id,
});

// Assign the caller SecurityGroup to the caller job
const callerSgp = new k8s.apiextensions.CustomResource("caller-sgp", {
  apiVersion: "vpcresources.k8s.aws/v1beta1",
  kind: "SecurityGroupPolicy",
  metadata: {
    name: "caller-sgp",
  },
  spec: {
    podSelector: { matchLabels: { app: "caller" } },
    securityGroups: {
      groupIds: [callerSg.id],
    }
  },
}, { provider: kube });

// Create a job that is allowed to curl the nginx service. The job will fail if it can't reach the service.
new k8s.batch.v1.Job("caller", {
  spec: {
    template: {
      metadata: {
        name: "caller",
        labels: {
          app: "caller",
        },
      },
      spec: {
        containers: [{
          name: "caller",
          image: "curlimages/curl",
          command: ["curl", "--silent", "--show-error", "--fail", pulumi.interpolate`${nginx.metadata.name}.${nginx.metadata.namespace}:80`],
        }],
        restartPolicy: "Never",
      },
    },
    backoffLimit: 3,
  },
}, { provider: kube, dependsOn: [nginx, callerSgp] });

// Create a SecurityGroup for the wrongCaller job
const wrongCallerSg = new aws.ec2.SecurityGroup("wrong-caller", {
  vpcId: eksVpc.vpcId,
});

// Allow all traffic between the cluster and the caller SecurityGroup
configureClusterAccess("wrong-caller", cluster, wrongCallerSg);

// Assign the caller SecurityGroup to the wrongCaller job
const wrongCallerSgp = new k8s.apiextensions.CustomResource("wrong-caller-sgp", {
  apiVersion: "vpcresources.k8s.aws/v1beta1",
  kind: "SecurityGroupPolicy",
  metadata: {
    name: "wrong-caller-sgp",
  },
  spec: {
    podSelector: { matchLabels: { app: "wrong-caller" } },
    securityGroups: {
      groupIds: [wrongCallerSg.id],
    }
  },
}, { provider: kube });

// Create a job that is not allowed to curl the nginx service. The job will fail if it can reach the service.
new k8s.batch.v1.Job("wrong-caller", {
  spec: {
    template: {
      metadata: {
        name: "wrong-caller",
        labels: {
          app: "wrong-caller",
        },
      },
      spec: {
        containers: [{
          name: "caller",
          image: "curlimages/curl",
          command: [
            "sh", "-c",
            pulumi.interpolate`curl --silent --show-error --fail ${nginx.metadata.name}.${nginx.metadata.namespace}:80 && exit 1 || exit 0`,
          ],
        }],
        restartPolicy: "Never",
      },
    },
    backoffLimit: 3,
  },
}, { provider: kube, dependsOn: [nginx, callerSgp] });

function configureClusterAccess(name: string, cluster: eks.Cluster, sg: aws.ec2.SecurityGroup) {
  new aws.vpc.SecurityGroupIngressRule(`${name}-cluster-to-sg`, {
    securityGroupId: sg.id,
    ipProtocol: "-1",
    referencedSecurityGroupId: cluster.core.cluster.vpcConfig.clusterSecurityGroupId,
  });

  new aws.vpc.SecurityGroupIngressRule(`${name}-sg-to-cluster`, {
    securityGroupId: cluster.core.cluster.vpcConfig.clusterSecurityGroupId,
    ipProtocol: "-1",
    referencedSecurityGroupId: sg.id,
  });

  new aws.vpc.SecurityGroupEgressRule(`${name}-all`, {
    securityGroupId: sg.id,
    ipProtocol: "-1",
    cidrIpv4: "0.0.0.0/0",
  });
}
