module github.com/pulumi/pulumi-eks

go 1.12

require (
	github.com/pulumi/pulumi v0.17.8-0.20190418223219-0ede30fdb624
	github.com/stretchr/testify v1.2.2
)

replace (
	github.com/Nvveen/Gotty => github.com/ijc25/Gotty v0.0.0-20170406111628-a8b993ba6abd
	github.com/golang/glog => github.com/pulumi/glog v0.0.0-20180820174630-7eaa6ffb71e4
)
