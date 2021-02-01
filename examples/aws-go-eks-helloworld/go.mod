module aws-go-eks-helloworld

go 1.15

require (
	github.com/pulumi/pulumi-eks/sdk v0.22.0
	github.com/pulumi/pulumi-kubernetes/sdk/v2 v2.7.8
	github.com/pulumi/pulumi/sdk/v2 v2.19.0
)
replace (
	github.com/pulumi/pulumi-eks/sdk => ../../sdk
)

