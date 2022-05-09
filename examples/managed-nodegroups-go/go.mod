module managed-nodegroups-go

go 1.16

replace github.com/pulumi/pulumi-eks/sdk => ../../sdk

require (
	github.com/pulumi/pulumi-aws/sdk/v5 v5.1.2
	github.com/pulumi/pulumi-eks/sdk v0.0.0-00010101000000-000000000000
	github.com/pulumi/pulumi/sdk/v3 v3.27.0
)
