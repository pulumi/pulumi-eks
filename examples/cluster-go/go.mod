module cluster-go

go 1.14

require (
	github.com/pulumi/pulumi-eks/sdk v0.21.0
	github.com/pulumi/pulumi/sdk/v3 v3.0.0
)

// TODO: remove and update pulumi-eks/sdk dependency above
// once the new module is available on master.
replace github.com/pulumi/pulumi-eks/sdk => ../../sdk
