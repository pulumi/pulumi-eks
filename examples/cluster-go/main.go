package main

import (
	"github.com/pulumi/pulumi-eks/sdk/v2/go/eks"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		// Create cluster with default settings
		cluster1, err := eks.NewCluster(ctx, "example-cluster-go-1", nil)
		if err != nil {
			return err
		}

		// Create cluster with non-default settings
		cluster2, err := eks.NewCluster(ctx, "example-cluster-2", &eks.ClusterArgs{
			DesiredCapacity: pulumi.IntPtr(2),
			MinSize:         pulumi.IntPtr(2),
			MaxSize:         pulumi.IntPtr(2),
			EnabledClusterLogTypes: pulumi.StringArray{
				pulumi.String("api"),
				pulumi.String("audit"),
				pulumi.String("authenticator"),
			},
		})
		if err != nil {
			return err
		}

		cluster3, err := eks.NewCluster(ctx, "example-cluster-3", &eks.ClusterArgs{
			NodeGroupOptions: &eks.ClusterNodeGroupOptionsArgs{
				DesiredCapacity: pulumi.IntPtr(2),
				MinSize:         pulumi.IntPtr(2),
				MaxSize:         pulumi.IntPtr(2),
			},
		})
		if err != nil {
			return err
		}

		// Export the kubeconfig for clusters
		ctx.Export("kubeconfig1", cluster1.Kubeconfig)
		ctx.Export("kubeconfig2", cluster2.Kubeconfig)
		ctx.Export("kubeconfig3", cluster3.Kubeconfig)
		return nil
	})
}
