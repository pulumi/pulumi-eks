module github.com/pulumi/pulumi-eks/examples

go 1.16

require (
	github.com/imdario/mergo v0.3.11 // indirect
	github.com/pulumi/pulumi-eks v0.20.0
	github.com/pulumi/pulumi/pkg/v2 v2.18.2
	github.com/pulumi/pulumi/sdk/v2 v2.18.2
	github.com/spf13/pflag v1.0.5 // indirect
	github.com/stretchr/testify v1.6.1
	gopkg.in/yaml.v2 v2.3.0
	k8s.io/api v0.0.0-20190313235455-40a48860b5ab
	k8s.io/apimachinery v0.0.0-20190313205120-d7deff9243b1
	k8s.io/client-go v11.0.0+incompatible
)

replace (
	github.com/Azure/go-autorest => github.com/Azure/go-autorest v12.4.3+incompatible
	github.com/pulumi/pulumi-eks/sdk => ../sdk/
)
