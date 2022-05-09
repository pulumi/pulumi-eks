module managed-nodegroups-go

go 1.14

require (
	github.com/pulumi/pulumi-aws/sdk/v4 v4.5.1
	github.com/pulumi/pulumi-eks/sdk v0.30.0
	github.com/pulumi/pulumi/sdk/v3 v3.3.1
)

replace github.com/pulumi/pulumi-eks/sdk => ../../sdk
