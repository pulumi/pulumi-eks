module cluster-go

go 1.14

require (
	// TODO - need a replace to run the test against the local version of the sdk
	github.com/pulumi/pulumi-eks/sdk https://github.com/pulumi/pulumi-eks
	github.com/pulumi/pulumi/sdk/v3 v3.0.0

)