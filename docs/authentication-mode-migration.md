# Authentication Mode Migration

AWS introduced a new method for granting IAM principals access to Kubernetes resources called [Access Entries](https://docs.aws.amazon.com/eks/latest/userguide/grant-k8s-access.html#authentication-modes).
In contrary to the existing approach using the `aws-auth` ConfigMap, this solely relies on AWS resources for managing Kubernetes auth.

Previously, the aws-auth ConfigMap was the sole method for mapping IAM principals to Kubernetes RBAC. Now, users can choose between using the ConfigMap (access mode `CONFIG_MAP`), Access Entries (access mode `API`), or both (access mode `API_AND_CONFIG_MAP`).
If no authentication mode is configured for a cluster it defaults to using the `aws-auth` ConfigMap.

> [!CAUTION]
> Once the access entry method is enabled, it cannot be disabled. If the ConfigMap method is not enabled during cluster creation, it cannot be enabled later. All clusters created before the introduction of access entries have the ConfigMap method enabled.

## Migrate to Access Entries

Before attempting to migrate the authentication mode to access entries you need to ensure your EKS cluster's platform version is compatible with that authentication mode. To do that you can follow the "Prerequisites" section in the [AWS Docs](https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html).

After confirming your cluster supports Access Entries you need to perform the following steps to migrate:

### 1. Switch the Authentication Mode to `API_AND_CONFIG_MAP`
To do this, you need to set the `authenticationMode` parameter of your cluster to `API_AND_CONFIG_MAP`. This step does not modify the cluster's existing authentication configuration. It only enables using the `CONFIG_MAP` and `API` in parallel.

```ts
const clusterBoth = new eks.Cluster(`cluster`, {
    ...
    authenticationMode: "API_AND_CONFIG_MAP",
    ...
});
```

### 2. Add Access Entries for all entries in the `aws-auth` ConfigMap
The `aws-auth` ConfigMap gets populated based on the following parameters:
- `roleMappings`
- `userMappings`
- `instanceRoles`

To create Access Entries for those you need to choose the right Access Entry type.

#### `roleMappings` & `userMappings`
These map to Access Entries of type `STANDARD`, which is the default.

The following shows how you'd add access entries for the role and user mappings:
```
const cluster = new eks.Cluster(`${projectName}-cluster`, {
    ...
    authenticationMode: "API_AND_CONFIG_MAP",
    roleMappings: [
        {
            roleArn: iamRole.arn,
            groups: ["test-group"],
            username: "test-role",
        }
    ],
    userMappings: [
        {
            userArn: iamUser.arn,
            groups: ["user-group"],
            username: "test-user",
        }
    ]
    accessEntries: {
        myRole: {
            principalArn: iamRole.arn,
            kubernetesGroups: ["test-group"],
            username: "test-role",
            type: "STANDARD"
        },
        myUser: {
            principalArn: iamUser.arn,
            kubernetesGroups: ["user-group"],
            username: "test-user",
            type: "STANDARD"
        }
    }
    ...
});
```

#### `instanceRoles`
These map to Access Entries of type `EC2_LINUX`.

The following shows how you'd add access entries for the instance roles:
```
const cluster = new eks.Cluster(`${projectName}-cluster`, {
    ...
    authenticationMode: "API_AND_CONFIG_MAP",
    instanceRoles: [
        ec2IamRole
    ],
    accessEntries: {
        myEC2InstanceRole: {
            principalArn: iamRole.arn,
            type: "EC2_LINUX"
        }
    }
    ...
});
```

### 3. Confirm all entries of the `aws-auth` ConfigMap have corresponding access entries
You can either inspect the `aws-auth` ConfigMap in the `kube-system` namespace directly or use the [eksctl](https://eksctl.io/installation/) command line utility to analyze it by running `eksctl get iamidentitymapping --cluster my-cluster`.

### 4. Remove all entries of the `aws-auth` ConfigMap
After you've confirmed that all entries of the `aws-auth` ConfigMap have corresponding access entries you can remove these parameters:
- `roleMappings`
- `userMappings`
- `instanceRoles`

> [!CAUTION]
> This can cause disruptions if any of the parameters are not represented as Access Entries.

#### 5. Switch the Authentication Mode to `API`
Now that the authentication is fully driven by access entries you can switch to the `API` authentication mode. This will delete the `aws-auth` ConfigMap.

```ts
const clusterBoth = new eks.Cluster(`cluster`, {
    ...
    authenticationMode: "API",
    ...
});
```
