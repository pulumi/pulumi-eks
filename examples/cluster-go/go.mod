module cluster-go

go 1.14

require (
	github.com/pulumi/pulumi-eks/sdk v0.30.0
	github.com/pulumi/pulumi/sdk/v3 v3.0.0

)

replace github.com/pulumi/pulumi-eks/sdk => ../../sdk
