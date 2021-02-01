module managed-nodegroups-go

go 1.14

require (
	github.com/pulumi/pulumi-aws/sdk/v3 v3.26.1
	github.com/pulumi/pulumi-eks/sdk v0.21.0
	github.com/pulumi/pulumi-kubernetes/sdk/v2 v2.7.8
	github.com/pulumi/pulumi/sdk/v2 v2.19.0
	github.com/satori/go.uuid v1.2.0 // indirect
)

replace github.com/pulumi/pulumi-eks/sdk => ../../sdk
