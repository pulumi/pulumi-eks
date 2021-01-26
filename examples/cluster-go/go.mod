module cluster-go

go 1.14

require (
	github.com/pulumi/pulumi-eks/sdk v0.21.0 // indirect
	github.com/pulumi/pulumi/sdk/v2 v2.18.2
)

replace github.com/pulumi/pulumi-eks/sdk => ../../sdk
