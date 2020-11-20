PROJECT_NAME := Pulumi Amazon Web Services (AWS) EKS Components

VERSION         := $(shell pulumictl get version)
TESTPARALLELISM := 12

WORKING_DIR     := $(shell pwd)

build:: build_nodejs build_python build_dotnet

schema::
	cd provider/cmd/pulumi-gen-eks && go run main.go schema ../pulumi-resource-eks

provider::
	rm -rf provider/cmd/pulumi-resource-eks/bin
	cd provider/cmd/pulumi-resource-eks && go build -a -o bin/pulumi-resource-eks main.go

build_nodejs:: VERSION := $(shell pulumictl get version --language javascript)
build_nodejs::
	rm -rf nodejs/eks/bin
	cd nodejs/eks && \
		yarn install && \
		yarn run tsc && \
		yarn run tsc --version && \
		sed -e 's/\$${VERSION}/$(VERSION)/g' < package.json > bin/package.json && \
		cp ../../README.md ../../LICENSE bin/ && \
		cp -R dashboard bin/ && \
		cp -R cni bin/

build_python:: PYPI_VERSION := $(shell pulumictl get version --language python)
build_python:: schema
	rm -rf python
	cd provider/cmd/pulumi-gen-eks && go run main.go python ../../../python ../pulumi-resource-eks/schema.json $(VERSION)
	cd python/ && \
		cp ../README.md . && \
		python3 setup.py clean --all 2>/dev/null && \
		rm -rf ./bin/ ../python.bin/ && cp -R . ../python.bin && mv ../python.bin ./bin && \
		sed -i.bak -e "s/\$${VERSION}/$(PYPI_VERSION)/g" -e "s/\$${PLUGIN_VERSION}/$(VERSION)/g" ./bin/setup.py && \
		rm ./bin/setup.py.bak && \
		cd ./bin && python3 setup.py build sdist

build_dotnet:: DOTNET_VERSION := $(shell pulumictl get version --language dotnet)
build_dotnet:: schema
	rm -rf dotnet
	cd provider/cmd/pulumi-gen-eks && go run main.go dotnet ../../../dotnet ../pulumi-resource-eks/schema.json $(VERSION)
	cd dotnet/ && \
		echo "${DOTNET_VERSION}" >version.txt && \
		dotnet build /p:Version=${DOTNET_VERSION}

lint:
	cd nodejs/eks && \
		yarn install && \
		yarn run tslint -c ../tslint.json -p tsconfig.json

lint_provider::
	cd provider && golangci-lint run -c ../.golangci.yml

install_provider:: PROVIDER_VERSION := latest
install_provider:: provider install_nodejs_sdk
	cd provider/cmd/pulumi-resource-eks	&& \
		rm -rf ../provider.bin/ && \
			cp -R . ../provider.bin && mv ../provider.bin ./bin && \
		sed -e 's/\$${VERSION}/$(PROVIDER_VERSION)/g' < package.json > bin/package.json && \
		cd ./bin && \
			yarn install && \
			yarn link @pulumi/eks

install_nodejs_sdk:: build_nodejs
	cd $(WORKING_DIR)/nodejs/eks/bin && yarn link

install_dotnet_sdk:: build_dotnet
	mkdir -p $(WORKING_DIR)/nuget
	find . -name '*.nupkg' -print -exec cp -p {} ${WORKING_DIR}/nuget \;

# TODO add separate targets for each language.
test_nodejs:: install_nodejs_sdk
	cd examples && go test -tags=nodejs -v -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} .

specific_test:: install_nodejs_sdk
	cd examples && go test -tags=nodejs -v -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . --run=TestAcc$(TestName)

dev:: lint build_nodejs
test:: test_nodejs
