PROJECT_NAME := Pulumi Amazon Web Services (AWS) EKS Components

# Override during CI using `make [TARGET] PROVIDER_VERSION=""` or by setting a PROVIDER_VERSION environment variable
# Local & branch builds will just used this fixed default version unless specified
PROVIDER_VERSION ?= 3.0.0-alpha.0+dev

# Use this normalized version everywhere rather than the raw input to ensure consistency.
VERSION_GENERIC ?= $(shell make VERSION_GENERIC=$(PROVIDER_VERSION) version_generic)
# Note recursive call to Make to auto-install pulumictl needs VERSION_GENERIC seeded to avoid infinite recursion.

TESTPARALLELISM := 8

PACK            := eks
PROVIDER        := pulumi-resource-${PACK}
CODEGEN         := pulumi-gen-${PACK}
GZIP_PREFIX     := pulumi-resource-${PACK}-v${VERSION_GENERIC}

WORKING_DIR     := $(shell pwd)

JAVA_GEN         := pulumi-java-gen
JAVA_GEN_VERSION := v0.16.1

EKS_SRC := $(wildcard nodejs/eks/*.*) $(wildcard nodejs/eks/*/*.ts) $(wildcard nodejs/eks/*/*/*.ts)

LOCAL_PLAT ?= ""

PKG_ARGS   := --no-bytecode --public-packages "*" --public
PKG_TARGET := ./bin/cmd/provider/index.js
SCHEMA_PATH := provider/cmd/$(PROVIDER)/schema.json

GOPATH := $(shell go env GOPATH)
PULUMICTL_VERSION := v0.0.47
PULUMICTL_BIN := $(shell which pulumictl 2>/dev/null)

generate:: schema generate_nodejs generate_python generate_go generate_dotnet generate_java
build:: schema provider build_nodejs build_python build_go build_dotnet build_java

schema::
	(cd provider/cmd/$(CODEGEN) && go run main.go schema ../$(PROVIDER) $(VERSION_GENERIC))

provider:: bin/${PROVIDER}

.pulumi/bin/pulumi: PULUMI_VERSION := $(shell cd nodejs/eks && yarn list --pattern @pulumi/pulumi --json --no-progress | jq -r '.data.trees[].name' | cut -d'@' -f3)
.pulumi/bin/pulumi: HOME := $(WORKING_DIR)
.pulumi/bin/pulumi:
	curl -fsSL https://get.pulumi.com | sh -s -- --version "$(PULUMI_VERSION)"

generate_nodejs:: .pulumi/bin/pulumi schema
	cd provider/cmd/$(CODEGEN) && go run main.go nodejs ../../../sdk/nodejs $(CURDIR) ../$(PROVIDER)/schema.json $(VERSION_GENERIC)

build_nodejs:: generate_nodejs
	cd sdk/nodejs && \
		yarn install --no-progress && \
		yarn run build && \
		cp package.json yarn.lock ./bin/

bin/pulumi-java-gen.v$(JAVA_GEN_VERSION):
	@mkdir -p bin/
	@rm -f bin/pulumi-java-gen.v*
	@echo "$(JAVA_GEN_VERSION)" >"$@"

bin/pulumi-java-gen: bin/pulumi-java-gen.v$(JAVA_GEN_VERSION) ensure-pulumictl
	@mkdir -p bin/
	@$(PULUMICTL_BIN) download-binary -n pulumi-language-java -v $(JAVA_GEN_VERSION) -r pulumi/pulumi-java

generate_java:: PACKAGE_VERSION := ${VERSION_GENERIC}
generate_java:: bin/pulumi-java-gen schema
	rm -rf sdk/java
	$(WORKING_DIR)/bin/$(JAVA_GEN) generate --schema provider/cmd/$(PROVIDER)/schema.json --out sdk/java --build gradle-nexus
	cd sdk/java && \
		echo "module fake_java_module // Exclude this directory from Go tools\n\ngo 1.17" > go.mod

build_java:: PACKAGE_VERSION := ${VERSION_GENERIC}
build_java:: generate_java
	cd sdk/java && gradle --console=plain build

generate_python:: schema
	rm -rf sdk/python
	cd provider/cmd/$(CODEGEN) && go run main.go python ../../../sdk/python $(CURDIR) ../$(PROVIDER)/schema.json $(VERSION_GENERIC)
	cd sdk/python/ && \
		echo "module fake_python_module // Exclude this directory from Go tools\n\ngo 1.17" > go.mod && \
		cp ../../README.md .

build_python:: generate_python
	cd sdk/python/ && \
		rm -rf ./bin/ ../python.bin/ && cp -R . ../python.bin && mv ../python.bin ./bin && \
		python3 -m venv venv && \
		./venv/bin/python -m pip install build && \
		cd ./bin && \
		../venv/bin/python -m build .

generate_go:: schema
	rm -rf sdk/go
	cd provider/cmd/$(CODEGEN) && go run main.go go ../../../sdk/go $(CURDIR) ../$(PROVIDER)/schema.json $(VERSION_GENERIC)

build_go:: generate_go
	cd sdk go && go build ./...

generate_dotnet:: schema
	rm -rf sdk/dotnet
	cd provider/cmd/$(CODEGEN) && go run main.go dotnet ../../../sdk/dotnet $(CURDIR) ../$(PROVIDER)/schema.json $(VERSION_GENERIC)
	cd sdk/dotnet/ && \
		echo "module fake_dotnet_module // Exclude this directory from Go tools\n\ngo 1.17" > go.mod

build_dotnet:: generate_dotnet
	cd sdk/dotnet/ && \
		echo "${VERSION_GENERIC}" >version.txt && \
		dotnet build

lint_fix:
	cd nodejs/eks && \
		yarn install && \
		yarn lint

lint:
	cd nodejs/eks && \
		yarn install && \
		yarn lint-check

lint_provider::
	cd provider && golangci-lint run -c ../.golangci.yml

install_provider:: PROVIDER_VERSION := latest
install_provider:: provider install_nodejs_sdk
	cd provider/cmd/$(PROVIDER)	&& \
		rm -rf ../provider.bin/ && \
			cp -R . ../provider.bin && mv ../provider.bin ./bin && \
			cp ../../../bin/$(PROVIDER) ./bin && \
		sed -e 's/\$${VERSION}/$(PROVIDER_VERSION)/g' < package.json > bin/package.json

generate_schema:: schema

install_nodejs_sdk:: build_nodejs
	yarn link --cwd $(WORKING_DIR)/sdk/nodejs/bin

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
		sed -e 's/\$${VERSION}/$(VERSION_GENERIC)/g' < package.json > bin/package.json && \
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

test_nodejs:: PATH := $(WORKING_DIR)/bin:$(PATH)
test_nodejs:: provider install_nodejs_sdk
	cd tests && go test -tags=nodejs -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} .

test_nodejs_upgrade:: PATH := $(WORKING_DIR)/bin:$(PATH)
test_nodejs_upgrade:: provider install_nodejs_sdk
	cd tests && go test -run Upgrade -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} .

test_python:: install_provider test_build
	cd tests && go test -tags=python -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} .

test_dotnet:: install_provider
	cd tests && go test -tags=dotnet -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} .

test_java:: install_provider
	cd tests && go test -tags=java -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} .

test_unit_tests:
	cd nodejs/eks && \
		yarn install && \
		yarn run test

specific_test:: install_nodejs_sdk test_build
	cd tests && go test -tags=$(LanguageTags) -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} . --run=TestAcc$(TestName)

specific_test_local:: install_nodejs_sdk test_build
	cd tests && go test -tags=$(LanguageTags) -count=1 -cover -timeout 3h . --run=TestAcc$(TestName)

dev:: lint build_nodejs
test:: test_nodejs

test_provider:
	@echo ""
	@echo "== test_provider ==================================================================="
	@echo ""
	cd provider && go test -v -short ./... -parallel $(TESTPARALLELISM)

ensure-pulumictl:
ifeq ($(PULUMICTL_BIN),)
	@if [ ! -f "$(GOPATH)/bin/pulumictl" ]; then go install "github.com/pulumi/pulumictl/cmd/pulumictl@$(PULUMICTL_VERSION)"; fi
	@$(eval PULUMICTL_BIN=$(GOPATH)/bin/pulumictl)
endif

version_generic: ensure-pulumictl
	@$(PULUMICTL_BIN) convert-version --language generic --version "$(PROVIDER_VERSION)"

renovate:: generate

.PHONY: build generate generate_dotnet generate_go generate_java generate_nodejs generate_python build_dotnet build_go build_java build_nodejs build_python dev dist ensure-pulumictl generate_schema install_dotnet_sdk install_java_sdk install_provider install_python_sdk lint lint_fix lint_provider provider renovate schema specific_test specific_test_local test test_dotnet test_java test_nodejs test_nodejs_upgrade test_provider test_python test_unit_tests version_generic
