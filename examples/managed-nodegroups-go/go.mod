module managed-nodegroups-go

go 1.14

require (
	github.com/pulumi/pulumi-aws/sdk/v4 v4.0.0
	github.com/pulumi/pulumi-eks/sdk v0.21.0
	github.com/pulumi/pulumi/sdk/v3 v3.0.0
)

replace github.com/pulumi/pulumi-eks/sdk => ../../sdk
