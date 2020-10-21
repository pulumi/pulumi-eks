# examples/modify-default-eks-sg

EKS cluster example that [imports][pulumi-import] and modifies the default EKS cluster security group.

[pulumi-import]: https://www.pulumi.com/docs/guides/adopting/import/#adopting-existing-resources

## Initialize the Pulumi Project

1.  Clone the repo:

    ```bash
    git clone https://github.com/metral/modify-default-eks-sg
    cd modify-default-eks-sg
    ```

1.  Install the dependencies.

    ```bash
    npm install
    ```

1.  Create a new Pulumi stack e.g. `dev`.

    ```bash
    pulumi stack init dev
    ```

1. Set the Pulumi configuration variables for the project.

    > **Note:** Select any valid Kubernetes regions for the providers.

    ```bash
    pulumi config set aws:region us-west-2
    ```

## Run the initial update

Create the cluster and import the default cluster security group created
automatically by EKS.

```bash
pulumi up
```

## Run a follow-up update

With the cluster created and the default security group imported in the initial
update, modify the security group properties and run another update.

An example to remove the ingress and egress rules from the default security
group is in `step1.ts`.

Use the example to remove the rules.

```bash
mv index.ts index.ts.bak
cp step1.ts index.ts
pulumi up
```

Both sets of rules should now be removed from the default security group.

> Note: Not all security group properties are patchable, some require a replace.
>
> Since EKS [creates][eks-default-sec-group] this security group
> and attaches ENIs to it for the control plane, an attempt to replace or delete the security group 
> will be held up by the ENIs  to be deleted first. For easier cluster management and
> teardown, it's best to only update patchable properties of this security group,
> instead of deleting the security group resource.

[eks-default-sec-group]: https://docs.aws.amazon.com/eks/latest/userguide/sec-group-reqs.html

## Using the cluster

Once the update is complete, you can use the cluster.

```bash
pulumi stack output kubeconfig > kubeconfig.json
export KUBECONFIG=`pwd`/kubeconfig.json
```

Example: query the cluster's nodes and pods.

```bash
kubectl get nodes -o wide --show-labels
kubectl get pods --all-namespaces -o wide --show-labels
```

## Clean Up

Run the following command to tear down the resources that are part of our
stack.

1. Run `pulumi destroy` to tear down all resources.  You'll be prompted to make
   sure you really want to delete these resources.

   ```bash
   pulumi destroy
   ```

1. To delete the stack, run the following command.

   ```bash
   pulumi stack rm
   ```
   > **Note:** This command deletes all deployment history from the Pulumi
   > Console and cannot be undone.
