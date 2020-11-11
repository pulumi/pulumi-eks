PROJECT_NAME := Pulumi Amazon Web Services (AWS) EKS Components

VERSION         := $(shell pulumictl get version)
TESTPARALLELISM := 12

WORKING_DIR     := $(shell pwd)

build_nodejs:: VERSION := $(shell pulumictl get version --language javascript)
build_nodejs::
	cd nodejs/eks && \
		yarn install && \
		tsc && \
		tsc --version && \
		sed -e 's/\$${VERSION}/$(VERSION)/g' < package.json > bin/package.json && \
		cp ../../README.md ../../LICENSE bin/ && \
		cp -R dashboard bin/ && \
        cp -R cni bin/

lint:
	yarn global add tslint typescript
	cd nodejs/eks && \
		yarn install && \
		tslint -c ../tslint.json -p tsconfig.json

install_nodejs_sdk::
	cd $(WORKING_DIR)/nodejs/eks/bin && yarn install
	yarn link --cwd $(WORKING_DIR)/nodejs/eks/bin

test_nodejs::
	cd nodejs/eks/examples && go test -v -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} .

dev:: lint build_nodejs
test:: install_nodejs_sdk test_nodejs
