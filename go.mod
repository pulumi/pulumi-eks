module github.com/pulumi/pulumi-eks

go 1.12

require (
	github.com/Nvveen/Gotty v0.0.0-20170406111628-a8b993ba6abd // indirect
	github.com/apache/thrift v0.12.0 // indirect
	github.com/docker/docker v1.13.1 // indirect
	github.com/docker/spdystream v0.0.0-20160310174837-449fdfce4d96 // indirect
	github.com/elazarl/goproxy v0.0.0-20170405201442-c4fc26588b6e // indirect
	github.com/evanphx/json-patch v0.0.0-20190203023257-5858425f7550 // indirect
	github.com/go-ini/ini v1.31.0 // indirect
	github.com/golang/groupcache v0.0.0-20160516000752-02826c3e7903 // indirect
	github.com/google/gofuzz v1.0.0 // indirect
	github.com/googleapis/gnostic v0.2.0 // indirect
	github.com/imdario/mergo v0.3.7 // indirect
	github.com/json-iterator/go v1.1.6 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.1 // indirect
	github.com/mxk/go-flowrate v0.0.0-20140419014527-cca7078d478f // indirect
	github.com/openzipkin/zipkin-go v0.1.6 // indirect
	github.com/prometheus/client_golang v0.9.3-0.20190127221311-3c4408c8b829 // indirect
	github.com/pulumi/pulumi v1.4.0
	github.com/smartystreets/goconvey v0.0.0-20190330032615-68dc04aab96a // indirect
	github.com/stretchr/testify v1.3.0
	golang.org/x/build v0.0.0-20190314133821-5284462c4bec // indirect
	gopkg.in/ini.v1 v1.42.0 // indirect
	gopkg.in/yaml.v2 v2.2.2
	k8s.io/api v0.0.0-20190313235455-40a48860b5ab
	k8s.io/apimachinery v0.0.0-20190313205120-d7deff9243b1
	k8s.io/client-go v11.0.0+incompatible
	k8s.io/klog v0.3.0 // indirect
	k8s.io/kube-openapi v0.0.0-20190228160746-b3a7cee44a30 // indirect
	k8s.io/kubernetes v1.14.1 // indirect
	k8s.io/utils v0.0.0-20190308190857-21c4ce38f2a7 // indirect
	sigs.k8s.io/yaml v1.1.0 // indirect
)

replace (
	github.com/Nvveen/Gotty => github.com/ijc25/Gotty v0.0.0-20170406111628-a8b993ba6abd
	github.com/golang/glog => github.com/pulumi/glog v0.0.0-20180820174630-7eaa6ffb71e4
)
