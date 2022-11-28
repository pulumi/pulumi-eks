PROJECT_NAME	:= Pulumi Amazon Web Services (AWS) EKS Components

VERSION			:= $(shell pulumictl get version)
TESTPARALLELISM	:= 12

PACK			:= eks
PROVIDER		:= pulumi-resource-${PACK}
GZIP_PREFIX		:= pulumi-resource-${PACK}-v${VERSION}

WORKING_DIR		:= $(shell pwd)

JAVA_GEN		:= pulumi-java-gen
JAVA_GEN_VERSION := v0.5.2

EKS_SRC			:= $(wildcard eks/*.*) $(wildcard eks/*/*.ts) $(wildcard eks/*/*/*.ts)
NODE_VERSION	:= node18

LOCAL_PLAT		?= ""

PKG_ARGS		:= --no-bytecode --public-packages "*" --public

build: schema provider build_nodejs build_python build_go build_dotnet build_java

build_dotnet: sdk/dotnet
build_go: sdk/go
build_java: sdk/java
build_nodejs: sdk/nodejs
build_python: sdk/python

generate_schema: eks/schema.json
schema: eks/schema.json

dev: lint build_nodejs

test: lint test_nodejs

clean:
	rm -rf bin dist eks/bin eks/node_modules sdk/dotnet sdk/go sdk/java sdk/nodejs sdk/python

bin/schemagen: schemagen/*
	cd schemagen && go build -o $(WORKING_DIR)/bin/schemagen .

eks/schema.json: bin/schemagen
	./bin/schemagen schema eks

provider: bin/${PROVIDER}

bin/pulumi-java-gen:
	@mkdir -p bin/
	pulumictl download-binary -n pulumi-language-java -v $(JAVA_GEN_VERSION) -r pulumi/pulumi-java

sdk/nodejs: eks/schema.json bin/schemagen
	rm -rf sdk/nodejs/*
	./bin/schemagen nodejs sdk/nodejs eks/schema.json $(VERSION)
	@touch sdk/nodejs

sdk/nodejs/bin: NODE_VERSION := $(shell pulumictl get version --language javascript)
sdk/nodejs/bin: sdk/nodejs sdk/nodejs/node_modules
	cd sdk/nodejs && \
		yarn run tsc --version && \
		yarn run tsc && \
		sed -e 's/\$${VERSION}/$(NODE_VERSION)/g' < ../../eks/package.json > package.json && \
		cp ../../README.md ../../LICENSE .

sdk/nodejs/node_modules: sdk/nodejs sdk/nodejs/package.json
	cd sdk/nodejs && \
		yarn install --no-progress

sdk/java: PACKAGE_VERSION := $(shell pulumictl get version --language generic)
sdk/java: bin/pulumi-java-gen eks/schema.json
	rm -rf sdk/java/*
	$(WORKING_DIR)/bin/$(JAVA_GEN) generate --schema eks/schema.json --out sdk/java --build gradle-nexus
	cd sdk/java && \
		echo "module fake_java_module // Exclude this directory from Go tools\n\ngo 1.17" > go.mod && \
		gradle --console=plain build
	@touch sdk/java

sdk/python: PYPI_VERSION := $(shell pulumictl get version --language python)
sdk/python: eks/schema.json bin/schemagen
	rm -rf sdk/python/*
	./bin/schemagen python sdk/python eks/schema.json $(VERSION)
	cd sdk/python/ && \
		echo "module fake_python_module // Exclude this directory from Go tools\n\ngo 1.17" > go.mod && \
		cp ../../README.md . && \
		python3 setup.py clean --all 2>/dev/null && \
		rm -rf ./bin/ ../python.bin/ && cp -R . ../python.bin && mv ../python.bin ./bin && \
		sed -i.bak -e 's/^VERSION = .*/VERSION = "$(PYPI_VERSION)"/g' -e 's/^PLUGIN_VERSION = .*/PLUGIN_VERSION = "$(VERSION)"/g' ./bin/setup.py && \
		rm ./bin/setup.py.bak && \
		cd ./bin && python3 setup.py build sdist
	@touch sdk/python

sdk/go: VERSION := $(shell pulumictl get version --language generic)
sdk/go: eks/schema.json bin/schemagen
	rm -rf sdk/go/*
	./bin/schemagen go sdk/go eks/schema.json $(VERSION)
	@touch sdk/go

sdk/dotnet: DOTNET_VERSION := $(shell pulumictl get version --language dotnet)
sdk/dotnet: eks/schema.json bin/schemagen
	rm -rf sdk/dotnet/*
	bin/schemagen dotnet sdk/dotnet eks/schema.json $(VERSION)
	cd sdk/dotnet/ && \
		echo "module fake_dotnet_module // Exclude this directory from Go tools\n\ngo 1.17" > go.mod && \
		echo "${DOTNET_VERSION}" >version.txt
	@touch sdk/dotnet

sdk/dotnet/bin:: DOTNET_VERSION := $(shell pulumictl get version --language dotnet)
sdk/dotnet/bin:: eks/schema.json
	cd sdk/dotnet/ && \
		dotnet build /p:Version=${DOTNET_VERSION}

lint:
	cd eks && \
		yarn install && \
		yarn run tslint -c ./tslint.json -p tsconfig.json

install_provider: PROVIDER_VERSION := latest
install_provider: provider install_nodejs_sdk
	cd provider/cmd/$(PROVIDER)	&& \
		rm -rf ../provider.bin/ && \
			cp -R . ../provider.bin && mv ../provider.bin ./bin && \
			cp ../../../bin/$(PROVIDER) ./bin && \
		sed -e 's/\$${VERSION}/$(PROVIDER_VERSION)/g' < package.json > bin/package.json && \
		cd ./bin && \
			yarn install && \
			yarn link @pulumi/eks

install_nodejs_sdk: sdk/nodejs/bin
	yarn link --cwd $(WORKING_DIR)/sdk/nodejs/bin

install_dotnet_sdk:: sdk/dotnet/bin
	mkdir -p $(WORKING_DIR)/nuget
	find sdk/dotnet/bin -name '*.nupkg' -print -exec cp -p {} ${WORKING_DIR}/nuget \;
	@if ! dotnet nuget list source | grep ${WORKING_DIR}; then \
		dotnet nuget add source ${WORKING_DIR}/nuget --name ${WORKING_DIR} \
	; fi\

install_go_sdk:
	#Intentionally empty for CI / CD templating

install_python_sdk:
	#Intentionally empty for CI / CD templating

install_java_sdk:
	#Intentionally empty for CI / CD templating

eks/node_modules: eks/package.json eks/yarn.lock
	yarn install --cwd eks --no-progress
	@touch eks/node_modules

eks/bin: eks/node_modules eks/schema.json ${EKS_SRC}
	rm -rf eks/bin
	cd eks && \
		yarn tsc && \
		sed -e 's/\$${VERSION}/$(shell pulumictl get version --language javascript)/g' < package.json > bin/package.json && \
		cp -R dashboard bin/ && \
		cp -R cni bin/ && \
		cp schema.json bin/cmd/provider/

# Re-use the local platform if provided (e.g. `make provider LOCAL_PLAT=linux-amd64`)
ifneq ($(LOCAL_PLAT),"")
bin/${PROVIDER}: bin/provider/$(LOCAL_PLAT)/${PROVIDER}
	cp bin/provider/$(LOCAL_PLAT)/${PROVIDER} bin/${PROVIDER}
else 
bin/${PROVIDER}: eks/bin eks/node_modules
	cd eks && yarn run pkg . ${PKG_ARGS} --target ${NODE_VERSION} --output $(WORKING_DIR)/bin/${PROVIDER}
endif

bin/provider/linux-amd64/${PROVIDER}: TARGET := ${NODE_VERSION}-linuxstatic-x64
bin/provider/linux-arm64/${PROVIDER}: TARGET := ${NODE_VERSION}-linuxstatic-arm64
bin/provider/darwin-amd64/${PROVIDER}: TARGET := ${NODE_VERSION}-macos-x64
bin/provider/darwin-arm64/${PROVIDER}: TARGET := ${NODE_VERSION}-macos-arm64
bin/provider/windows-amd64/${PROVIDER}.exe: TARGET := ${NODE_VERSION}-win-x64
bin/provider/%: eks/bin eks/node_modules
	test ${TARGET}
	cd eks && \
		yarn run pkg . ${PKG_ARGS} --target ${TARGET} --output ${WORKING_DIR}/$@

dist/${GZIP_PREFIX}-linux-amd64.tar.gz: bin/provider/linux-amd64/${PROVIDER}
dist/${GZIP_PREFIX}-linux-arm64.tar.gz: bin/provider/linux-arm64/${PROVIDER}
dist/${GZIP_PREFIX}-darwin-amd64.tar.gz: bin/provider/darwin-amd64/${PROVIDER}
dist/${GZIP_PREFIX}-darwin-arm64.tar.gz: bin/provider/darwin-arm64/${PROVIDER}
dist/${GZIP_PREFIX}-windows-amd64.tar.gz: bin/provider/windows-amd64/${PROVIDER}.exe

dist/${GZIP_PREFIX}-%.tar.gz: 
	@mkdir -p dist
	@# $< is the last dependency (the binary path from above)
	tar --gzip -cf $@ README.md LICENSE -C $$(dirname $<) .

dist: dist/${GZIP_PREFIX}-linux-amd64.tar.gz
dist: dist/${GZIP_PREFIX}-linux-arm64.tar.gz
dist: dist/${GZIP_PREFIX}-darwin-amd64.tar.gz
dist: dist/${GZIP_PREFIX}-darwin-arm64.tar.gz
dist: dist/${GZIP_PREFIX}-windows-amd64.tar.gz

test_build:
	cd examples/utils/testvpc && yarn install && yarn run tsc

test_nodejs: install_nodejs_sdk
	cd examples && go test -tags=nodejs -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_python: install_provider test_build
	cd examples && go test -tags=python -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_dotnet: install_provider
	cd examples && go test -tags=dotnet -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

test_java: install_provider
	cd examples && go test -tags=java -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . 2>&1 | tee /tmp/gotest.log | gotestfmt

specific_test: install_nodejs_sdk test_build
	cd examples && go test -tags=$(LanguageTags) -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . --run=TestAcc$(TestName) 2>&1 | tee /tmp/gotest.log | gotestfmt

specific_test_local: install_nodejs_sdk test_build
	cd examples && go test -tags=$(LanguageTags) -v -count=1 -cover -timeout 3h . --run=TestAcc$(TestName)


