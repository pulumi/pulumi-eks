package main

import (
	"fmt"

	"github.com/pulumi/pulumi-eks/sdk/v2/go/eks"
	"github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes"
	appsv1 "github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes/apps/v1"
	corev1 "github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes/core/v1"
	metav1 "github.com/pulumi/pulumi-kubernetes/sdk/v3/go/kubernetes/meta/v1"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		cluster, err := eks.NewCluster(ctx, fmt.Sprintf("%s-1", ctx.Project()), nil)
		if err != nil {
			return err
		}

		// Export the kubeconfig for the cluster
		ctx.Export("kubeconfig", cluster.Kubeconfig)

		output := cluster.AwsProvider.ApplyT(func(p *kubernetes.Provider) (string, error) {
			// Create a Kubernetes Namespace
			namespace, err := corev1.NewNamespace(ctx, "app-ns", &corev1.NamespaceArgs{
				Metadata: &metav1.ObjectMetaArgs{
					Name: pulumi.String("joe-duffy"),
				},
			}, pulumi.Provider(p))
			if err != nil {
				return "", err
			}

			appLabels := pulumi.StringMap{
				"app": pulumi.String("iac-workshop"),
			}

			_, err = appsv1.NewDeployment(ctx, "app-dep", &appsv1.DeploymentArgs{
				Metadata: &metav1.ObjectMetaArgs{
					Namespace: namespace.Metadata.Elem().Name(),
				},
				Spec: appsv1.DeploymentSpecArgs{
					Selector: &metav1.LabelSelectorArgs{
						MatchLabels: appLabels,
					},
					Replicas: pulumi.Int(3),
					Template: &corev1.PodTemplateSpecArgs{
						Metadata: &metav1.ObjectMetaArgs{
							Labels: appLabels,
						},
						Spec: &corev1.PodSpecArgs{
							Containers: corev1.ContainerArray{
								corev1.ContainerArgs{
									Name:  pulumi.String("iac-workshop"),
									Image: pulumi.String("jocatalin/kubernetes-bootcamp:v2"),
								}},
						},
					},
				},
			}, pulumi.Provider(p))
			if err != nil {
				return "", err
			}

			service, err := corev1.NewService(ctx, "app-service", &corev1.ServiceArgs{
				Metadata: &metav1.ObjectMetaArgs{
					Namespace: namespace.Metadata.Elem().Name(),
					Labels:    appLabels,
				},
				Spec: &corev1.ServiceSpecArgs{
					Ports: corev1.ServicePortArray{
						corev1.ServicePortArgs{
							Port:       pulumi.Int(80),
							TargetPort: pulumi.Int(8080),
						},
					},
					Selector: appLabels,
					Type:     pulumi.String("LoadBalancer"),
				},
			}, pulumi.Provider(p))
			if err != nil {
				return "", err
			}

			ctx.Export("url", service.Status.LoadBalancer().Ingress().Index(pulumi.Int(0)).ApplyT(func(ingress corev1.LoadBalancerIngress) string {
				if ingress.Hostname != nil {
					return *ingress.Hostname
				}
				return *ingress.Ip
			}))
			return "", nil
		}).(pulumi.StringOutput)
		ctx.Export("output", output)
		return nil
	})

}
