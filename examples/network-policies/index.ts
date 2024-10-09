import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as iam from "./iam";
import * as k8s from "@pulumi/kubernetes";
import * as app from "./application";

// IAM roles for the node groups.
const role = iam.createRole("network-policies");

// Create a new VPC
const eksVpc = new awsx.ec2.Vpc("network-policies", {
  enableDnsHostnames: true,
  cidrBlock: "10.0.0.0/16",
});

// Create an EKS cluster.
const cluster = new eks.Cluster("network-policies", {
  skipDefaultNodeGroup: true,
  vpcId: eksVpc.vpcId,
  authenticationMode: eks.AuthenticationMode.Api,
  // Public subnets will be used for load balancers
  publicSubnetIds: eksVpc.publicSubnetIds,
  // Private subnets will be used for cluster nodes
  privateSubnetIds: eksVpc.privateSubnetIds,
  vpcCniOptions: {
    enableNetworkPolicy: true,
    configurationValues: {
      env: {
        // pods that use the VPC CNI start with a default deny policy
        NETWORK_POLICY_ENFORCING_MODE: "strict",
      }
    }
  },
});

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;

const ng = eks.createManagedNodeGroup("network-policies", {
  scalingConfig: {
    minSize: 1,
    maxSize: 2,
    desiredSize: 1,
  },
  cluster: cluster,
  nodeRole: role,
});

const kube = cluster.provider;

// Allow DNS traffic to coredns from all pods in the cluster
const dnsIngressNetworkPolicy = new k8s.networking.v1.NetworkPolicy("dns-ingress", {
  metadata: {
    name: "dns-ingress",
    namespace: "kube-system"
  },
  spec: {
    podSelector: { matchLabels: { "k8s-app": "kube-dns" } },
    ingress: [{
      from: [{
        podSelector: {},
        namespaceSelector: {},
      }],
      ports: [{ port: 53, protocol: "UDP" }],
    }],
  },
}, { provider: kube });

const nginx = app.createApplication("nginx", kube);

// allow access to the nginx service from the caller pod in the jobs namespace
const networkPolicy = new k8s.networking.v1.NetworkPolicy("nginx-ingress", {
  metadata: {
    name: "nginx-ingress",
    namespace: nginx.metadata.namespace
  },
  spec: {
    podSelector: { matchLabels: { app: "nginx" } },
    ingress: [{
      from: [{
        podSelector: { matchLabels: { app: "caller" } },
        namespaceSelector: { matchLabels: { name: "jobs" } },
      }],
      ports: [{ port: 80 }],
    }],
  },
}, { provider: kube });

/*
 * Verify that the Network Policies are working as expected
 */

const jobNamespace = new k8s.core.v1.Namespace("jobs", {
  metadata: {
    name: "jobs",
    labels: {
      name: "jobs",
    }
  },
}, { provider: kube });

// allow all egress traffic for the verification jobs
const jobEgressNetworkPolicy = new k8s.networking.v1.NetworkPolicy("job-egress", {
  metadata: {
    name: "job-egress",
    namespace: jobNamespace.metadata.name,
  },
  spec: {
    podSelector: {},
    policyTypes: ["Egress"],
    egress: [{}],
  },
}, { provider: kube });

// Create a job that is allowed to curl the nginx service. The job will fail if it can't reach the service.
new k8s.batch.v1.Job("caller", {
  metadata: {
    namespace: jobNamespace.metadata.name,
  },
  spec: {
    template: {
      metadata: {
        name: "caller",
        namespace: jobNamespace.metadata.name,
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
}, { provider: kube, dependsOn: [nginx, networkPolicy] });

// Create a job that is not allowed to curl the nginx service. The job will fail if it can reach the service.
new k8s.batch.v1.Job("wrong-caller", {
  metadata: {
    namespace: jobNamespace.metadata.name,
  },
  spec: {
    template: {
      metadata: {
        name: "wrong-caller",
        namespace: jobNamespace.metadata.name,
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
}, { provider: kube, dependsOn: [nginx] });
