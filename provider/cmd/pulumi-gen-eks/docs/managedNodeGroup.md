Manages an EKS Node Group, which can provision and optionally update an Auto Scaling Group of Kubernetes worker nodes compatible with EKS. Additional documentation about this functionality can be found in the [EKS User Guide](https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html).


{{% examples %}}
## Example Usage
{{% example %}}
### Basic Managed Node Group
This example demonstrates creating a managed node group with typical defaults. The node group uses the latest EKS-optimized Amazon Linux AMI, creates 2 nodes, and runs on t3.medium instances. Instance security groups are automatically configured.


```yaml
resources:
  eks-vpc:
    type: awsx:ec2:Vpc
    properties:
      enableDnsHostnames: true
      cidrBlock: 10.0.0.0/16
  eks-cluster:
    type: eks:Cluster
    properties:
      vpcId: ${eks-vpc.vpcId}
      authenticationMode: API
      publicSubnetIds: ${eks-vpc.publicSubnetIds}
      privateSubnetIds: ${eks-vpc.privateSubnetIds}
      skipDefaultNodeGroup: true
  node-role:
    type: aws:iam:Role
    properties:
      assumeRolePolicy:
        fn::toJSON:
          Version: 2012-10-17
          Statement:
            - Action: sts:AssumeRole
              Effect: Allow
              Sid: ""
              Principal:
                Service: ec2.amazonaws.com
  worker-node-policy:
    type: aws:iam:RolePolicyAttachment
    properties:
      role: ${node-role.name}
      policyArn: "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  cni-policy:
    type: aws:iam:RolePolicyAttachment
    properties:
      role: ${node-role.name}
      policyArn: "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  registry-policy:
    type: aws:iam:RolePolicyAttachment
    properties:
      role: ${node-role.name}
      policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  node-group:
    type: eks:ManagedNodeGroup
    properties:
      cluster: ${eks-cluster}
      nodeRole: ${node-role}

```

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";

const eksVpc = new awsx.ec2.Vpc("eks-vpc", {
    enableDnsHostnames: true,
    cidrBlock: "10.0.0.0/16",
});
const eksCluster = new eks.Cluster("eks-cluster", {
    vpcId: eksVpc.vpcId,
    authenticationMode: eks.AuthenticationMode.Api,
    publicSubnetIds: eksVpc.publicSubnetIds,
    privateSubnetIds: eksVpc.privateSubnetIds,
    skipDefaultNodeGroup: true,
});
const nodeRole = new aws.iam.Role("node-role", {assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Sid: "",
        Principal: {
            Service: "ec2.amazonaws.com",
        },
    }],
})});
const workerNodePolicy = new aws.iam.RolePolicyAttachment("worker-node-policy", {
    role: nodeRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
});
const cniPolicy = new aws.iam.RolePolicyAttachment("cni-policy", {
    role: nodeRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
});
const registryPolicy = new aws.iam.RolePolicyAttachment("registry-policy", {
    role: nodeRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
});
const nodeGroup = new eks.ManagedNodeGroup("node-group", {
    cluster: eksCluster,
    nodeRole: nodeRole,
});

```

```python
import pulumi
import json
import pulumi_aws as aws
import pulumi_awsx as awsx
import pulumi_eks as eks

eks_vpc = awsx.ec2.Vpc("eks-vpc",
    enable_dns_hostnames=True,
    cidr_block="10.0.0.0/16")
eks_cluster = eks.Cluster("eks-cluster",
    vpc_id=eks_vpc.vpc_id,
    authentication_mode=eks.AuthenticationMode.API,
    public_subnet_ids=eks_vpc.public_subnet_ids,
    private_subnet_ids=eks_vpc.private_subnet_ids,
    skip_default_node_group=True)
node_role = aws.iam.Role("node-role", assume_role_policy=json.dumps({
    "Version": "2012-10-17",
    "Statement": [{
        "Action": "sts:AssumeRole",
        "Effect": "Allow",
        "Sid": "",
        "Principal": {
            "Service": "ec2.amazonaws.com",
        },
    }],
}))
worker_node_policy = aws.iam.RolePolicyAttachment("worker-node-policy",
    role=node_role.name,
    policy_arn="arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy")
cni_policy = aws.iam.RolePolicyAttachment("cni-policy",
    role=node_role.name,
    policy_arn="arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy")
registry_policy = aws.iam.RolePolicyAttachment("registry-policy",
    role=node_role.name,
    policy_arn="arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly")
node_group = eks.ManagedNodeGroup("node-group",
    cluster=eks_cluster,
    node_role=node_role)

```

```go
package main

import (
	"encoding/json"

	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/iam"
	"github.com/pulumi/pulumi-awsx/sdk/v2/go/awsx/ec2"
	"github.com/pulumi/pulumi-eks/sdk/v4/go/eks"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		eksVpc, err := ec2.NewVpc(ctx, "eks-vpc", &ec2.VpcArgs{
			EnableDnsHostnames: pulumi.Bool(true),
			CidrBlock:          "10.0.0.0/16",
		})
		if err != nil {
			return err
		}
		eksCluster, err := eks.NewCluster(ctx, "eks-cluster", &eks.ClusterArgs{
			VpcId:                eksVpc.VpcId,
			AuthenticationMode:   eks.AuthenticationModeApi,
			PublicSubnetIds:      eksVpc.PublicSubnetIds,
			PrivateSubnetIds:     eksVpc.PrivateSubnetIds,
			SkipDefaultNodeGroup: true,
		})
		if err != nil {
			return err
		}
		tmpJSON0, err := json.Marshal(map[string]interface{}{
			"Version": "2012-10-17",
			"Statement": []map[string]interface{}{
				map[string]interface{}{
					"Action": "sts:AssumeRole",
					"Effect": "Allow",
					"Sid":    "",
					"Principal": map[string]interface{}{
						"Service": "ec2.amazonaws.com",
					},
				},
			},
		})
		if err != nil {
			return err
		}
		json0 := string(tmpJSON0)
		nodeRole, err := iam.NewRole(ctx, "node-role", &iam.RoleArgs{
			AssumeRolePolicy: pulumi.String(json0),
		})
		if err != nil {
			return err
		}
		_, err = iam.NewRolePolicyAttachment(ctx, "worker-node-policy", &iam.RolePolicyAttachmentArgs{
			Role:      nodeRole.Name,
			PolicyArn: pulumi.String("arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"),
		})
		if err != nil {
			return err
		}
		_, err = iam.NewRolePolicyAttachment(ctx, "cni-policy", &iam.RolePolicyAttachmentArgs{
			Role:      nodeRole.Name,
			PolicyArn: pulumi.String("arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"),
		})
		if err != nil {
			return err
		}
		_, err = iam.NewRolePolicyAttachment(ctx, "registry-policy", &iam.RolePolicyAttachmentArgs{
			Role:      nodeRole.Name,
			PolicyArn: pulumi.String("arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"),
		})
		if err != nil {
			return err
		}
		_, err = eks.NewManagedNodeGroup(ctx, "node-group", &eks.ManagedNodeGroupArgs{
			Cluster:  eksCluster,
			NodeRole: nodeRole,
		})
		if err != nil {
			return err
		}
		return nil
	})
}

```

```csharp
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using Pulumi;
using Aws = Pulumi.Aws;
using Awsx = Pulumi.Awsx;
using Eks = Pulumi.Eks;

return await Deployment.RunAsync(() => 
{
    var eksVpc = new Awsx.Ec2.Vpc("eks-vpc", new()
    {
        EnableDnsHostnames = true,
        CidrBlock = "10.0.0.0/16",
    });

    var eksCluster = new Eks.Cluster("eks-cluster", new()
    {
        VpcId = eksVpc.VpcId,
        AuthenticationMode = Eks.AuthenticationMode.Api,
        PublicSubnetIds = eksVpc.PublicSubnetIds,
        PrivateSubnetIds = eksVpc.PrivateSubnetIds,
        SkipDefaultNodeGroup = true,
    });

    var nodeRole = new Aws.Iam.Role("node-role", new()
    {
        AssumeRolePolicy = JsonSerializer.Serialize(new Dictionary<string, object?>
        {
            ["Version"] = "2012-10-17",
            ["Statement"] = new[]
            {
                new Dictionary<string, object?>
                {
                    ["Action"] = "sts:AssumeRole",
                    ["Effect"] = "Allow",
                    ["Sid"] = "",
                    ["Principal"] = new Dictionary<string, object?>
                    {
                        ["Service"] = "ec2.amazonaws.com",
                    },
                },
            },
        }),
    });

    var workerNodePolicy = new Aws.Iam.RolePolicyAttachment("worker-node-policy", new()
    {
        Role = nodeRole.Name,
        PolicyArn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    });

    var cniPolicy = new Aws.Iam.RolePolicyAttachment("cni-policy", new()
    {
        Role = nodeRole.Name,
        PolicyArn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    });

    var registryPolicy = new Aws.Iam.RolePolicyAttachment("registry-policy", new()
    {
        Role = nodeRole.Name,
        PolicyArn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    });

    var nodeGroup = new Eks.ManagedNodeGroup("node-group", new()
    {
        Cluster = eksCluster,
        NodeRole = nodeRole,
    });

    return new Dictionary<string, object?>{};
});

```

```java
package generated_program;

import com.pulumi.Context;
import com.pulumi.Pulumi;
import com.pulumi.core.Output;
import com.pulumi.awsx.ec2.Vpc;
import com.pulumi.awsx.ec2.VpcArgs;
import com.pulumi.eks.Cluster;
import com.pulumi.eks.ClusterArgs;
import com.pulumi.aws.iam.Role;
import com.pulumi.aws.iam.RoleArgs;
import com.pulumi.aws.iam.RolePolicyAttachment;
import com.pulumi.aws.iam.RolePolicyAttachmentArgs;
import com.pulumi.eks.ManagedNodeGroup;
import com.pulumi.eks.ManagedNodeGroupArgs;
import static com.pulumi.codegen.internal.Serialization.*;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;

public class App {
    public static void main(String[] args) {
        Pulumi.run(App::stack);
    }

    public static void stack(Context ctx) {
        var eksVpc = new Vpc("eksVpc", VpcArgs.builder()
            .enableDnsHostnames(true)
            .cidrBlock("10.0.0.0/16")
            .build());

        var eksCluster = new Cluster("eksCluster", ClusterArgs.builder()
            .vpcId(eksVpc.vpcId())
            .authenticationMode("API")
            .publicSubnetIds(eksVpc.publicSubnetIds())
            .privateSubnetIds(eksVpc.privateSubnetIds())
            .skipDefaultNodeGroup(true)
            .build());

        var nodeRole = new Role("nodeRole", RoleArgs.builder()
            .assumeRolePolicy(serializeJson(
                jsonObject(
                    jsonProperty("Version", "2012-10-17"),
                    jsonProperty("Statement", jsonArray(jsonObject(
                        jsonProperty("Action", "sts:AssumeRole"),
                        jsonProperty("Effect", "Allow"),
                        jsonProperty("Sid", ""),
                        jsonProperty("Principal", jsonObject(
                            jsonProperty("Service", "ec2.amazonaws.com")
                        ))
                    )))
                )))
            .build());

        var workerNodePolicy = new RolePolicyAttachment("workerNodePolicy", RolePolicyAttachmentArgs.builder()
            .role(nodeRole.name())
            .policyArn("arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy")
            .build());

        var cniPolicy = new RolePolicyAttachment("cniPolicy", RolePolicyAttachmentArgs.builder()
            .role(nodeRole.name())
            .policyArn("arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy")
            .build());

        var registryPolicy = new RolePolicyAttachment("registryPolicy", RolePolicyAttachmentArgs.builder()
            .role(nodeRole.name())
            .policyArn("arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly")
            .build());

        var nodeGroup = new ManagedNodeGroup("nodeGroup", ManagedNodeGroupArgs.builder()
            .cluster(eksCluster)
            .nodeRole(nodeRole)
            .build());
    }
}
```
{{% /example %}}

{{% example %}}
### Enabling EFA Support

Enabling EFA support for a node group will do the following:
- All EFA interfaces supported by the instance will be exposed on the launch template used by the node group
- A `clustered` placement group will be created and passed to the launch template
- Checks will be performed to ensure that the instance type supports EFA and that the specified AZ is supported by the chosen instance type

The GPU optimized AMIs include all necessary drivers and libraries to support EFA. If you're choosing an instance type without GPU acceleration you will need to install the drivers and libraries manually and bake a custom AMI.

You can use the [aws-efa-k8s-device-plugin](https://github.com/aws/eks-charts/tree/master/stable/aws-efa-k8s-device-plugin) Helm chart to expose the EFA interfaces on the nodes as an extended resource, and allow pods to request these interfaces to be mounted to their containers.
Your application container will need to have the necessary libraries and runtimes in order to leverage the EFA interfaces (e.g. libfabric).

```yaml
name: eks-mng-docs
description: A Pulumi YAML program to deploy a Kubernetes cluster on AWS
runtime: yaml
resources:
  eks-vpc:
    type: awsx:ec2:Vpc
    properties:
      enableDnsHostnames: true
      cidrBlock: 10.0.0.0/16
  eks-cluster:
    type: eks:Cluster
    properties:
      vpcId: ${eks-vpc.vpcId}
      authenticationMode: API
      publicSubnetIds: ${eks-vpc.publicSubnetIds}
      privateSubnetIds: ${eks-vpc.privateSubnetIds}
      skipDefaultNodeGroup: true
  k8sProvider:
    type: pulumi:providers:kubernetes
    properties:
      kubeconfig: ${eks-cluster.kubeconfig}
  node-role:
    type: aws:iam:Role
    properties:
      assumeRolePolicy:
        fn::toJSON:
          Version: 2012-10-17
          Statement:
            - Action: sts:AssumeRole
              Effect: Allow
              Sid: ""
              Principal:
                Service: ec2.amazonaws.com
  worker-node-policy:
    type: aws:iam:RolePolicyAttachment
    properties:
      role: ${node-role.name}
      policyArn: "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  cni-policy:
    type: aws:iam:RolePolicyAttachment
    properties:
      role: ${node-role.name}
      policyArn: "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  registry-policy:
    type: aws:iam:RolePolicyAttachment
    properties:
      role: ${node-role.name}
      policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  
  # The node group for running system pods (e.g. coredns, etc.)
  system-node-group:
    type: eks:ManagedNodeGroup
    properties:
      cluster: ${eks-cluster}
      nodeRole: ${node-role}

  # EFA device plugin for exposing EFA interfaces as extended resources
  device-plugin:
    type: kubernetes:helm.sh/v3:Release
    properties:
      version: "0.5.7"
      repositoryOpts:
        repo: "https://aws.github.io/eks-charts"
      chart: "aws-efa-k8s-device-plugin"
      namespace: "kube-system"
      atomic: true
      values:
        tolerations:
          - key: "efa-enabled"
            operator: "Exists"
            effect: "NoExecute"
    options:
      provider: ${k8sProvider}

  # The node group for running EFA enabled workloads
  efa-node-group:
    type: eks:ManagedNodeGroup
    properties:
      cluster: ${eks-cluster}
      nodeRole: ${node-role}
      instanceTypes: ["g6.8xlarge"]
      gpu: true
      scalingConfig:
        minSize: 2
        desiredSize: 2
        maxSize: 4
      enableEfaSupport: true
      placementGroupAvailabilityZone: "us-west-2b"
      # Taint the nodes so that only pods with the efa-enabled label can be scheduled on them
      taints:
        - key: "efa-enabled"
          value: "true"
          effect: "NO_EXECUTE"
      # Instances with GPUs usually have nvme instance store volumes, so we can mount them in RAID-0 for kubelet and containerd
      # These are faster than the regular EBS volumes
      nodeadmExtraOptions:
        - contentType: "application/node.eks.aws"
          content: |
            apiVersion: node.eks.aws/v1alpha1
            kind: NodeConfig
            spec:
              instance:
                localStorage:
                  strategy: RAID0

```

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as kubernetes from "@pulumi/kubernetes";

const eksVpc = new awsx.ec2.Vpc("eks-vpc", {
    enableDnsHostnames: true,
    cidrBlock: "10.0.0.0/16",
});
const eksCluster = new eks.Cluster("eks-cluster", {
    vpcId: eksVpc.vpcId,
    authenticationMode: eks.AuthenticationMode.Api,
    publicSubnetIds: eksVpc.publicSubnetIds,
    privateSubnetIds: eksVpc.privateSubnetIds,
    skipDefaultNodeGroup: true,
});
const k8SProvider = new kubernetes.Provider("k8sProvider", {kubeconfig: eksCluster.kubeconfig});
const nodeRole = new aws.iam.Role("node-role", {assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
        Action: "sts:AssumeRole",
        Effect: "Allow",
        Sid: "",
        Principal: {
            Service: "ec2.amazonaws.com",
        },
    }],
})});
const workerNodePolicy = new aws.iam.RolePolicyAttachment("worker-node-policy", {
    role: nodeRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
});
const cniPolicy = new aws.iam.RolePolicyAttachment("cni-policy", {
    role: nodeRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
});
const registryPolicy = new aws.iam.RolePolicyAttachment("registry-policy", {
    role: nodeRole.name,
    policyArn: "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
});

// The node group for running system pods (e.g. coredns, etc.)
const systemNodeGroup = new eks.ManagedNodeGroup("system-node-group", {
    cluster: eksCluster,
    nodeRole: nodeRole,
});

// The EFA device plugin for exposing EFA interfaces as extended resources
const devicePlugin = new kubernetes.helm.v3.Release("device-plugin", {
    version: "0.5.7",
    repositoryOpts: {
        repo: "https://aws.github.io/eks-charts",
    },
    chart: "aws-efa-k8s-device-plugin",
    namespace: "kube-system",
    atomic: true,
    values: {
        tolerations: [{
            key: "efa-enabled",
            operator: "Exists",
            effect: "NoExecute",
        }],
    },
}, {
    provider: k8SProvider,
});

// The node group for running EFA enabled workloads
const efaNodeGroup = new eks.ManagedNodeGroup("efa-node-group", {
    cluster: eksCluster,
    nodeRole: nodeRole,
    instanceTypes: ["g6.8xlarge"],
    gpu: true,
    scalingConfig: {
        minSize: 2,
        desiredSize: 2,
        maxSize: 4,
    },
    enableEfaSupport: true,
    placementGroupAvailabilityZone: "us-west-2b",

    // Taint the nodes so that only pods with the efa-enabled label can be scheduled on them
    taints: [{
        key: "efa-enabled",
        value: "true",
        effect: "NO_EXECUTE",
    }],

    // Instances with GPUs usually have nvme instance store volumes, so we can mount them in RAID-0 for kubelet and containerd
    // These are faster than the regular EBS volumes
    nodeadmExtraOptions: [{
        contentType: "application/node.eks.aws",
        content: `apiVersion: node.eks.aws/v1alpha1
kind: NodeConfig
spec:
  instance:
    localStorage:
      strategy: RAID0
`,
    }],
});

```

```python
import pulumi
import json
import pulumi_aws as aws
import pulumi_awsx as awsx
import pulumi_eks as eks
import pulumi_kubernetes as kubernetes

eks_vpc = awsx.ec2.Vpc("eks-vpc",
    enable_dns_hostnames=True,
    cidr_block="10.0.0.0/16")
eks_cluster = eks.Cluster("eks-cluster",
    vpc_id=eks_vpc.vpc_id,
    authentication_mode=eks.AuthenticationMode.API,
    public_subnet_ids=eks_vpc.public_subnet_ids,
    private_subnet_ids=eks_vpc.private_subnet_ids,
    skip_default_node_group=True)
k8_s_provider = kubernetes.Provider("k8sProvider", kubeconfig=eks_cluster.kubeconfig)
node_role = aws.iam.Role("node-role", assume_role_policy=json.dumps({
    "Version": "2012-10-17",
    "Statement": [{
        "Action": "sts:AssumeRole",
        "Effect": "Allow",
        "Sid": "",
        "Principal": {
            "Service": "ec2.amazonaws.com",
        },
    }],
}))
worker_node_policy = aws.iam.RolePolicyAttachment("worker-node-policy",
    role=node_role.name,
    policy_arn="arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy")
cni_policy = aws.iam.RolePolicyAttachment("cni-policy",
    role=node_role.name,
    policy_arn="arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy")
registry_policy = aws.iam.RolePolicyAttachment("registry-policy",
    role=node_role.name,
    policy_arn="arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly")

# The node group for running system pods (e.g. coredns, etc.)
system_node_group = eks.ManagedNodeGroup("system-node-group",
    cluster=eks_cluster,
    node_role=node_role)

# The EFA device plugin for exposing EFA interfaces as extended resources
device_plugin = kubernetes.helm.v3.Release("device-plugin",
    version="0.5.7",
    repository_opts={
        "repo": "https://aws.github.io/eks-charts",
    },
    chart="aws-efa-k8s-device-plugin",
    namespace="kube-system",
    atomic=True,
    values={
        "tolerations": [{
            "key": "efa-enabled",
            "operator": "Exists",
            "effect": "NoExecute",
        }],
    },
    opts = pulumi.ResourceOptions(provider=k8_s_provider))

# The node group for running EFA enabled workloads
efa_node_group = eks.ManagedNodeGroup("efa-node-group",
    cluster=eks_cluster,
    node_role=node_role,
    instance_types=["g6.8xlarge"],
    gpu=True,
    scaling_config={
        "min_size": 2,
        "desired_size": 2,
        "max_size": 4,
    },
    enable_efa_support=True,
    placement_group_availability_zone="us-west-2b",

    # Taint the nodes so that only pods with the efa-enabled label can be scheduled on them
    taints=[{
        "key": "efa-enabled",
        "value": "true",
        "effect": "NO_EXECUTE",
    }],

    # Instances with GPUs usually have nvme instance store volumes, so we can mount them in RAID-0 for kubelet and containerd
    # These are faster than the regular EBS volumes
    nodeadm_extra_options=[{
        "content_type": "application/node.eks.aws",
        "content": """apiVersion: node.eks.aws/v1alpha1
kind: NodeConfig
spec:
  instance:
    localStorage:
      strategy: RAID0
""",
    }])

```

```go
package main

import (
	"encoding/json"

	awseks "github.com/pulumi/pulumi-aws/sdk/v6/go/aws/eks"
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/iam"
	"github.com/pulumi/pulumi-awsx/sdk/v2/go/awsx/ec2"
	"github.com/pulumi/pulumi-eks/sdk/v4/go/eks"
	"github.com/pulumi/pulumi-kubernetes/sdk/v4/go/kubernetes"
	helmv3 "github.com/pulumi/pulumi-kubernetes/sdk/v4/go/kubernetes/helm/v3"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		eksVpc, err := ec2.NewVpc(ctx, "eks-vpc", &ec2.VpcArgs{
			EnableDnsHostnames: pulumi.Bool(true),
			CidrBlock:          "10.0.0.0/16",
		})
		if err != nil {
			return err
		}
		eksCluster, err := eks.NewCluster(ctx, "eks-cluster", &eks.ClusterArgs{
			VpcId:                eksVpc.VpcId,
			AuthenticationMode:   eks.AuthenticationModeApi,
			PublicSubnetIds:      eksVpc.PublicSubnetIds,
			PrivateSubnetIds:     eksVpc.PrivateSubnetIds,
			SkipDefaultNodeGroup: true,
		})
		if err != nil {
			return err
		}
		k8SProvider, err := kubernetes.NewProvider(ctx, "k8sProvider", &kubernetes.ProviderArgs{
			Kubeconfig: eksCluster.Kubeconfig,
		})
		if err != nil {
			return err
		}
		tmpJSON0, err := json.Marshal(map[string]interface{}{
			"Version": "2012-10-17",
			"Statement": []map[string]interface{}{
				map[string]interface{}{
					"Action": "sts:AssumeRole",
					"Effect": "Allow",
					"Sid":    "",
					"Principal": map[string]interface{}{
						"Service": "ec2.amazonaws.com",
					},
				},
			},
		})
		if err != nil {
			return err
		}
		json0 := string(tmpJSON0)
		nodeRole, err := iam.NewRole(ctx, "node-role", &iam.RoleArgs{
			AssumeRolePolicy: pulumi.String(json0),
		})
		if err != nil {
			return err
		}
		_, err = iam.NewRolePolicyAttachment(ctx, "worker-node-policy", &iam.RolePolicyAttachmentArgs{
			Role:      nodeRole.Name,
			PolicyArn: pulumi.String("arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"),
		})
		if err != nil {
			return err
		}
		_, err = iam.NewRolePolicyAttachment(ctx, "cni-policy", &iam.RolePolicyAttachmentArgs{
			Role:      nodeRole.Name,
			PolicyArn: pulumi.String("arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"),
		})
		if err != nil {
			return err
		}
		_, err = iam.NewRolePolicyAttachment(ctx, "registry-policy", &iam.RolePolicyAttachmentArgs{
			Role:      nodeRole.Name,
			PolicyArn: pulumi.String("arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"),
		})
		if err != nil {
			return err
		}

        // The node group for running system pods (e.g. coredns, etc.)
		_, err = eks.NewManagedNodeGroup(ctx, "system-node-group", &eks.ManagedNodeGroupArgs{
			Cluster:  eksCluster,
			NodeRole: nodeRole,
		})
		if err != nil {
			return err
		}

        // The EFA device plugin for exposing EFA interfaces as extended resources
		_, err = helmv3.NewRelease(ctx, "device-plugin", &helmv3.ReleaseArgs{
			Version: pulumi.String("0.5.7"),
			RepositoryOpts: &helmv3.RepositoryOptsArgs{
				Repo: pulumi.String("https://aws.github.io/eks-charts"),
			},
			Chart:     pulumi.String("aws-efa-k8s-device-plugin"),
			Namespace: pulumi.String("kube-system"),
			Atomic:    pulumi.Bool(true),
			Values: pulumi.Map{
				"tolerations": pulumi.Any{
					[]map[string]interface{}{
                        {
                            "key":      "efa-enabled",
                            "operator": "Exists",
                            "effect":   "NoExecute",
                        }
					},
				},
			},
		}, pulumi.Provider(k8SProvider))
		if err != nil {
			return err
		}

        // The node group for running EFA enabled workloads
		_, err = eks.NewManagedNodeGroup(ctx, "efa-node-group", &eks.ManagedNodeGroupArgs{
			Cluster:  eksCluster,
			NodeRole: nodeRole,
			InstanceTypes: pulumi.StringArray{
				pulumi.String("g6.8xlarge"),
			},
			Gpu: pulumi.Bool(true),
			ScalingConfig: &eks.NodeGroupScalingConfigArgs{
				MinSize:     pulumi.Int(2),
				DesiredSize: pulumi.Int(2),
				MaxSize:     pulumi.Int(4),
			},
			EnableEfaSupport:               true,
			PlacementGroupAvailabilityZone: pulumi.String("us-west-2b"),

            // Taint the nodes so that only pods with the efa-enabled label can be scheduled on them
			Taints: eks.NodeGroupTaintArray{
				&eks.NodeGroupTaintArgs{
					Key:    pulumi.String("efa-enabled"),
					Value:  pulumi.String("true"),
					Effect: pulumi.String("NO_EXECUTE"),
				},
			},

            // Instances with GPUs usually have nvme instance store volumes, so we can mount them in RAID-0 for kubelet and containerd
            // These are faster than the regular EBS volumes
			NodeadmExtraOptions: eks.NodeadmOptionsArray{
				&eks.NodeadmOptionsArgs{
					ContentType: pulumi.String("application/node.eks.aws"),
					Content: pulumi.String(`apiVersion: node.eks.aws/v1alpha1
kind: NodeConfig
spec:
  instance:
    localStorage:
      strategy: RAID0
`),
				},
			},
		})
		if err != nil {
			return err
		}
		return nil
	})
}

```

```csharp
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using Pulumi;
using Aws = Pulumi.Aws;
using Awsx = Pulumi.Awsx;
using Eks = Pulumi.Eks;
using Kubernetes = Pulumi.Kubernetes;

return await Deployment.RunAsync(() => 
{
    var eksVpc = new Awsx.Ec2.Vpc("eks-vpc", new()
    {
        EnableDnsHostnames = true,
        CidrBlock = "10.0.0.0/16",
    });

    var eksCluster = new Eks.Cluster("eks-cluster", new()
    {
        VpcId = eksVpc.VpcId,
        AuthenticationMode = Eks.AuthenticationMode.Api,
        PublicSubnetIds = eksVpc.PublicSubnetIds,
        PrivateSubnetIds = eksVpc.PrivateSubnetIds,
        SkipDefaultNodeGroup = true,
    });

    var k8SProvider = new Kubernetes.Provider.Provider("k8sProvider", new()
    {
        KubeConfig = eksCluster.Kubeconfig,
    });

    var nodeRole = new Aws.Iam.Role("node-role", new()
    {
        AssumeRolePolicy = JsonSerializer.Serialize(new Dictionary<string, object?>
        {
            ["Version"] = "2012-10-17",
            ["Statement"] = new[]
            {
                new Dictionary<string, object?>
                {
                    ["Action"] = "sts:AssumeRole",
                    ["Effect"] = "Allow",
                    ["Sid"] = "",
                    ["Principal"] = new Dictionary<string, object?>
                    {
                        ["Service"] = "ec2.amazonaws.com",
                    },
                },
            },
        }),
    });

    var workerNodePolicy = new Aws.Iam.RolePolicyAttachment("worker-node-policy", new()
    {
        Role = nodeRole.Name,
        PolicyArn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    });

    var cniPolicy = new Aws.Iam.RolePolicyAttachment("cni-policy", new()
    {
        Role = nodeRole.Name,
        PolicyArn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    });

    var registryPolicy = new Aws.Iam.RolePolicyAttachment("registry-policy", new()
    {
        Role = nodeRole.Name,
        PolicyArn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    });

    // The node group for running system pods (e.g. coredns, etc.)
    var systemNodeGroup = new Eks.ManagedNodeGroup("system-node-group", new()
    {
        Cluster = eksCluster,
        NodeRole = nodeRole,
    });

    // The EFA device plugin for exposing EFA interfaces as extended resources
    var devicePlugin = new Kubernetes.Helm.V3.Release("device-plugin", new()
    {
        Version = "0.5.7",
        RepositoryOpts = new Kubernetes.Types.Inputs.Helm.V3.RepositoryOptsArgs
        {
            Repo = "https://aws.github.io/eks-charts",
        },
        Chart = "aws-efa-k8s-device-plugin",
        Namespace = "kube-system",
        Atomic = true,
        Values = 
        {
            { "tolerations", new[]
            {
                
                {
                    { "key", "efa-enabled" },
                    { "operator", "Exists" },
                    { "effect", "NoExecute" },
                },
            } },
        },
    }, new CustomResourceOptions
    {
        Provider = k8SProvider,
    });

    // The node group for running EFA enabled workloads
    var efaNodeGroup = new Eks.ManagedNodeGroup("efa-node-group", new()
    {
        Cluster = eksCluster,
        NodeRole = nodeRole,
        InstanceTypes = new[]
        {
            "g6.8xlarge",
        },
        Gpu = true,
        ScalingConfig = new Aws.Eks.Inputs.NodeGroupScalingConfigArgs
        {
            MinSize = 2,
            DesiredSize = 2,
            MaxSize = 4,
        },
        EnableEfaSupport = true,
        PlacementGroupAvailabilityZone = "us-west-2b",

        // Taint the nodes so that only pods with the efa-enabled label can be scheduled on them
        Taints = new[]
        {
            new Aws.Eks.Inputs.NodeGroupTaintArgs
            {
                Key = "efa-enabled",
                Value = "true",
                Effect = "NO_EXECUTE",
            },
        },

        // Instances with GPUs usually have nvme instance store volumes, so we can mount them in RAID-0 for kubelet and containerd
        NodeadmExtraOptions = new[]
        {
            new Eks.Inputs.NodeadmOptionsArgs
            {
                ContentType = "application/node.eks.aws",
                Content = @"apiVersion: node.eks.aws/v1alpha1
kind: NodeConfig
spec:
  instance:
    localStorage:
      strategy: RAID0
",
            },
        },
    });

});

```

{{% /example %}}
{{% /examples %}}
