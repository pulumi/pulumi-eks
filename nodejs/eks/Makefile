PROJECT_NAME := Pulumi EKS Components
NODE_MODULE_NAME := @pulumi/eks
include ../../build/common.mk

VERSION := $(shell ../../scripts/get-version)

export PATH := $(shell yarn bin 2>/dev/null):$(PATH)

TESTPARALLELISM ?= 7
NODE_OPTIONS ?= --max_old_space_size=6144

build::
	yarn install
	tsc
	sed -e 's/\$${VERSION}/$(VERSION)/g' < package.json > bin/package.json
	cp ../../README.md ../../LICENSE bin/
	cp -R dashboard bin/
	cp -R cni bin/

lint::
	tslint -c ../tslint.json -p tsconfig.json

test_fast::
	$(GO_TEST_FAST) ./examples

test_all::
	$(GO_TEST) ./examples
