include .mk/defaults.mk

TESTPARALLELISM := 8

CODEGEN         := pulumi-gen-${PACK}
GZIP_PREFIX     := pulumi-resource-${PACK}-v${VERSION_GENERIC}

EKS_SRC := $(wildcard nodejs/eks/*.*) $(wildcard nodejs/eks/*/*.ts) $(wildcard nodejs/eks/*/*/*.ts)

LOCAL_PLAT ?= ""

PKG_ARGS   := --no-bytecode --public-packages "*" --public
PKG_TARGET := ./bin/cmd/provider/index.js

prebuild: schema

schema:
	(cd provider/cmd/$(CODEGEN) && go run main.go schema ../$(PROVIDER) $(VERSION_GENERIC))

.pulumi/version: nodejs/eks/yarn.lock
	(cd nodejs/eks && yarn list --pattern @pulumi/pulumi --json --no-progress | jq -r '.data.trees[].name' | cut -d'@' -f3 > ../../.pulumi/version)

provider:: bin/${PROVIDER}

build_nodejs: schema
	cd provider/cmd/$(CODEGEN) && go run main.go nodejs ../../../sdk/nodejs $(CURDIR) ../$(PROVIDER)/schema.json $(VERSION_GENERIC)
	cd sdk/nodejs && \
		yarn install --no-progress && \
		yarn run build && \
		cp package.json yarn.lock ./bin/

lint_fix:
	cd nodejs/eks && \
		yarn install && \
		yarn lint

lint:
	cd nodejs/eks && \
		yarn install && \
		yarn lint-check

install_provider:: PROVIDER_VERSION := latest
install_provider:: provider install_nodejs_sdk
	cd provider/cmd/$(PROVIDER)	&& \
		rm -rf ../provider.bin/ && \
			cp -R . ../provider.bin && mv ../provider.bin ./bin && \
			cp ../../../bin/$(PROVIDER) ./bin && \
		sed -e 's/\$${VERSION}/$(PROVIDER_VERSION)/g' < package.json > bin/package.json


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
bin/${PROVIDER}: bin/provider/$(LOCAL_PLAT)/${PROVIDER}
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

test_nodejs_upgrade:: PATH := $(WORKING_DIR)/bin:$(PATH)
test_nodejs_upgrade:: provider install_nodejs_sdk
	cd provider && go test -tags=nodejs -v -json -count=1 -cover -timeout 3h -parallel ${TESTPARALLELISM} ./...

test_unit_tests:
	cd nodejs/eks && \
		yarn install && \
		yarn run test

dev: lint build_nodejs
test: test_nodejs
