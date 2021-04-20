module github.com/pulumi/pulumi-eks/examples

go 1.16

require (
	github.com/googleapis/gnostic v0.5.4 // indirect
	github.com/pulumi/pulumi-eks v0.20.0
	github.com/pulumi/pulumi/pkg/v3 v3.0.0
	github.com/pulumi/pulumi/sdk/v3 v3.0.0
	github.com/stretchr/testify v1.6.1
	gopkg.in/airbrake/gobrake.v2 v2.0.9 // indirect
	gopkg.in/gemnasium/logrus-airbrake-hook.v2 v2.1.2 // indirect
	gopkg.in/inf.v0 v0.9.1 // indirect
	gopkg.in/yaml.v2 v2.3.0
	k8s.io/api v0.0.0-20190313235455-40a48860b5ab
	k8s.io/apimachinery v0.0.0-20190313205120-d7deff9243b1
	k8s.io/client-go v11.0.0+incompatible
	k8s.io/klog v1.0.0 // indirect
	k8s.io/utils v0.0.0-20210305010621-2afb4311ab10 // indirect
	sigs.k8s.io/yaml v1.2.0 // indirect
)

replace (
	github.com/pulumi/pulumi-eks => ./
	github.com/pulumi/pulumi-eks/sdk => ../sdk/
)
