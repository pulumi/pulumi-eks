PROJECT_NAME := Pulumi Amazon Web Services (AWS) EKS Components
SUB_PROJECTS := nodejs/eks
include build/common.mk

.PHONY: publish_packages
publish_packages:
	$(call STEP_MESSAGE)
	./scripts/publish_packages.sh
	$$(go env GOPATH)/src/github.com/pulumi/scripts/ci/build-package-docs.sh eks

.PHONY: clean
clean:
	rm -rf node_modules package-lock.json yarn.lock

.PHONY: check_clean_worktree
check_clean_worktree:
	$$(go env GOPATH)/src/github.com/pulumi/scripts/ci/check-worktree-is-clean.sh

# The travis_* targets are entrypoints for CI.
.PHONY: travis_cron travis_push travis_pull_request travis_api
travis_cron: default
travis_push: only_build check_clean_worktree only_test publish_packages
travis_pull_request: all
travis_api: all
