PROJECT_NAME := Pulumi Amazon Web Services (AWS) EKS Components

VERSION         := $(shell pulumictl get version)
TESTPARALLELISM := 12

PACK            := eks
PROVIDER        := pulumi-resource-${PACK}
CODEGEN         := pulumi-gen-${PACK}
GZIP_PREFIX		:= pulumi-resource-${PACK}-v${VERSION}

WORKING_DIR     := $(shell pwd)

JAVA_GEN 		 := pulumi-java-gen
JAVA_GEN_VERSION := v0.9.7

EKS_SRC 		:= $(wildcard nodejs/eks/*.*) $(wildcard nodejs/eks/*/*.ts) $(wildcard nodejs/eks/*/*/*.ts)

LOCAL_PLAT		?= ""

PKG_ARGS 		:= --no-bytecode --public-packages "*" --public
PKG_TARGET		:= ./bin/cmd/provider/index.js

build:: schema provider build_nodejs build_python build_go build_dotnet build_java

schema::
	(cd provider/cmd/$(CODEGEN) && go run main.go schema ../$(PROVIDER))

provider:: bin/${PROVIDER}

build_nodejs:: VERSION := $(shell pulumictl get version --language javascript)
build_nodejs::
	rm -rf nodejs/eks/bin/*
	cd nodejs/eks && \
		yarn install && \
		yarn run tsc && \
		yarn run tsc --version && \
		sed -e 's/\$${VERSION}/$(VERSION)/g' < package.json > bin/package.json && \
		cp ../../README.md ../../LICENSE bin/ && \
		cp -R dashboard bin/ && \
		cp -R cni bin/ && \
		cp ../../provider/cmd/pulumi-resource-eks/schema.json bin/cmd/provider/

bin/pulumi-java-gen::
	mkdir -p bin/
	pulumictl download-binary -n pulumi-language-java -v $(JAVA_GEN_VERSION) -r pulumi/pulumi-java

build_java:: PACKAGE_VERSION := $(shell pulumictl get version --language generic)
build_java:: bin/pulumi-java-gen schema
	rm -rf sdk/java
	$(WORKING_DIR)/bin/$(JAVA_GEN) generate --schema provider/cmd/$(PROVIDER)/schema.json --out sdk/java --build gradle-nexus
	cd sdk/java && \
		echo "module fake_java_module // Exclude this directory from Go tools\n\ngo 1.17" > go.mod && \
		gradle --console=plain build

build_python:: PYPI_VERSION := $(shell pulumictl get version --language python)
build_python:: schema
	rm -rf sdk/python
	cd provider/cmd/$(CODEGEN) && go run main.go python ../../../sdk/python ../$(PROVIDER)/schema.json $(VERSION)
	cd sdk/python/ && \
		echo "module fake_python_module // Exclude this directory from Go tools\n\ngo 1.17" > go.mod && \
		cp ../../README.md . && \
		python3 setup.py clean --all 2>/dev/null && \
		rm -rf ./bin/ ../python.bin/ && cp -R . ../python.bin && mv ../python.bin ./bin && \
		sed -i.bak -e 's/^VERSION = .*/VERSION = "$(PYPI_VERSION)"/g' -e 's/^PLUGIN_VERSION = .*/PLUGIN_VERSION = "$(VERSION)"/g' ./bin/setup.py && \
		rm ./bin/setup.py.bak && \
		cd ./bin && python3 setup.py build sdist

build_go:: VERSION := $(shell pulumictl get version --language generic)
build_go:: schema
	rm -rf sdk/go
	cd provider/cmd/$(CODEGEN) && go run main.go go ../../../sdk/go ../$(PROVIDER)/schema.json $(VERSION)

build_dotnet:: DOTNET_VERSION := $(shell pulumictl get version --language dotnet)
build_dotnet:: schema
	rm -rf sdk/dotnet
	cd provider/cmd/$(CODEGEN) && go run main.go dotnet ../../../sdk/dotnet ../$(PROVIDER)/schema.json $(VERSION)
	cd sdk/dotnet/ && \
		echo "module fake_dotnet_module // Exclude this directory from Go tools\n\ngo 1.17" > go.mod && \
		echo "${DOTNET_VERSION}" >version.txt && \
		dotnet build /p:Version=${DOTNET_VERSION}

lint:
	cd nodejs/eks && \
		yarn install && \
		yarn format && \
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

generate_schema:: schema

install_nodejs_sdk:: build_nodejs
	yarn link --cwd $(WORKING_DIR)/nodejs/eks/bin

install_dotnet_sdk:: build_dotnet
	mkdir -p $(WORKING_DIR)/nuget
	find . -name '*.nupkg' -print -exec cp -p {} ${WORKING_DIR}/nuget \;

install_go_sdk::
	#Intentionally empty for CI / CD templating

install_python_sdk::
	#Intentionally empty for CI / CD templating

install_java_sdk::
	#Intentionally empty for CI / CD templating

nodejs/eks/node_modules: nodejs/eks/package.json nodejs/eks/yarn.lock
	yarn install --cwd nodejs/eks --no-progress
	@touch nodejs/eks/node_modules

nodejs/eks/bin: nodejs/eks/node_modules ${EKS_SRC}
	@cd nodejs/eks && \
		yarn tsc && \
		sed -e 's/\$${VERSION}/$(VERSION)/g' < package.json > bin/package.json && \
		cp -R dashboard bin/ && \
		cp -R cni bin/ && \
		cp ../../provider/cmd/pulumi-resource-eks/schema.json bin/cmd/provider/
	@touch nodejs/eks/bin

# Re-use the local platform if provided (e.g. `make provider LOCAL_PLAT=linux-amd64`)
ifneq ($(LOCAL_PLAT),"")
bin/${PROVIDER}:: bin/provider/$(LOCAL_PLAT)/${PROVIDER}
	cp bin/provider/$(LOCAL_PLAT)/${PROVIDER} bin/${PROVIDER}
else 
bin/${PROVIDER}: nodejs/eks/bin nodejs/eks/node_modules
	cd nodejs/eks && yarn run pkg ${PKG_TARGET} ${PKG_ARGS} --target node18 --output $(WORKING_DIR)/bin/${PROVIDER}
endif

bin/provider/linux-amd64/${PROVIDER}:: TARGET := node18-linuxstatic-x64
bin/provider/linux-arm64/${PROVIDER}:: TARGET := node18-linuxstatic-arm64
bin/provider/darwin-amd64/${PROVIDER}:: TARGET := node18-macos-x64
bin/provider/darwin-arm64/${PROVIDER}:: TARGET := node18-macos-arm64
bin/provider/windows-amd64/${PROVIDER}.exe:: TARGET := node18-win-x64
bin/provider/%:: nodejs/eks/bin nodejs/eks/node_modules
	test ${TARGET}
	cd nodejs/eks && \
		yarn run pkg ${PKG_TARGET} ${PKG_ARGS} --target ${TARGET} --output ${WORKING_DIR}/$@

dist/${GZIP_PREFIX}-linux-amd64.tar.gz:: bin/provider/linux-amd64/${PROVIDER}
dist/${GZIP_PREFIX}-linux-arm64.tar.gz:: bin/provider/linux-arm64/${PROVIDER}
dist/${GZIP_PREFIX}-darwin-amd64.tar.gz:: bin/provider/darwin-amd64/${PROVIDER}
dist/${GZIP_PREFIX}-darwin-arm64.tar.gz:: bin/provider/darwin-arm64/${PROVIDER}
dist/${GZIP_PREFIX}-windows-amd64.tar.gz:: bin/provider/windows-amd64/${PROVIDER}.exe

dist/${GZIP_PREFIX}-%.tar.gz:: 
	@mkdir -p dist
	@# $< is the last dependency (the binary path from above)
	tar --gzip -cf $@ README.md LICENSE -C $$(dirname $<) .

dist:: dist/${GZIP_PREFIX}-linux-amd64.tar.gz
dist:: dist/${GZIP_PREFIX}-linux-arm64.tar.gz
dist:: dist/${GZIP_PREFIX}-darwin-amd64.tar.gz
dist:: dist/${GZIP_PREFIX}-darwin-arm64.tar.gz
dist:: dist/${GZIP_PREFIX}-windows-amd64.tar.gz

test_build::
	cd examples/utils/testvpc && yarn install && yarn run tsc

test_nodejs:: install_nodejs_sdk
	cd examples && go test -tags=nodejs -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_python:: install_provider test_build
	cd examples && go test -tags=python -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_dotnet:: install_provider
	cd examples && go test -tags=dotnet -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_java:: install_provider
	cd examples && go test -tags=java -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

specific_test:: install_nodejs_sdk test_build
	cd examples && go test -tags=$(LanguageTags) -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . --run=TestAcc$(TestName) 2>&1 | tee /tmp/gotest.log | gotestfmt

specific_test_local:: install_nodejs_sdk test_build
	cd examples && go test -tags=$(LanguageTags) -v -count=1 -cover -timeout 3h . --run=TestAcc$(TestName)

dev:: lint build_nodejs
test:: test_nodejs
