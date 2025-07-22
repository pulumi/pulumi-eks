package main

import (
	"github.com/pulumi/pulumi-eks/sdk/v4/go/eks"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		authMode := eks.AuthenticationModeApi
		cluster, err := eks.NewCluster(ctx, "example-managed-nodegroups-go", &eks.ClusterArgs{
			AuthenticationMode: &authMode,
		})
		if err != nil {
			return err
		}

		accessEntries := cluster.Core.AccessEntries()
		ctx.Export("accessEntries", accessEntries)

		// Export the kubeconfig for the cluster
		ctx.Export("kubeconfig", cluster.Kubeconfig)

		return nil
	})
}
