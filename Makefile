PROJECT_NAME := Pulumi Amazon Web Services (AWS) EKS Components

VERSION         := $(shell pulumictl get version)
TESTPARALLELISM := 12

PACK            := eks
PROVIDER        := pulumi-resource-${PACK}
CODEGEN         := pulumi-gen-${PACK}

WORKING_DIR     := $(shell pwd)

build:: schema provider build_nodejs build_python build_dotnet

schema::
	cd provider/cmd/$(CODEGEN) && go run main.go schema ../$(PROVIDER)

provider::
	rm -rf provider/cmd/$(PROVIDER)/bin
	cd provider/cmd/$(PROVIDER) && go build -a -o $(WORKING_DIR)/bin/$(PROVIDER) main.go

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
	cd provider/cmd/$(CODEGEN) && go run main.go python ../../../python ../$(PROVIDER)/schema.json $(VERSION)
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
	cd provider/cmd/$(CODEGEN) && go run main.go dotnet ../../../dotnet ../$(PROVIDER)/schema.json $(VERSION)
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
	cd provider/cmd/$(PROVIDER)	&& \
		rm -rf ../provider.bin/ && \
			cp -R . ../provider.bin && mv ../provider.bin ./bin && \
			cp ../../../bin/$(PROVIDER) ./bin && \
		sed -e 's/\$${VERSION}/$(PROVIDER_VERSION)/g' < package.json > bin/package.json && \
		cd ./bin && \
			yarn install && \
			yarn link @pulumi/eks

install_nodejs_sdk:: build_nodejs
	yarn link --cwd $(WORKING_DIR)/nodejs/eks/bin

install_dotnet_sdk:: build_dotnet
	mkdir -p $(WORKING_DIR)/nuget
	find . -name '*.nupkg' -print -exec cp -p {} ${WORKING_DIR}/nuget \;

install_go_sdk::
	#Intentionally empty for CI / CD templating

install_python_sdk::
	#Intentionall empty for CI / CD templating

test_build::
	cd utils/testvpc && yarn install && yarn run tsc

test_nodejs:: install_nodejs_sdk
	cd examples && go test -tags=nodejs -v -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} .

test_python:: install_provider test_build
	cd examples && go test -tags=python -v -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} .

test_dotnet:: install_provider
	cd examples && go test -tags=dotnet -v -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} .

specific_test:: install_nodejs_sdk test_build
	cd examples && go test -tags=$(LanguageTags) -v -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . --run=TestAcc$(TestName)

dev:: lint build_nodejs
test:: test_nodejs
