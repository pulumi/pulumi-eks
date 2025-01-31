#!/usr/bin/env bash

set -euo pipefail

make generate
yarn --cwd nodejs/eks install --frozen-lockfile
yarn --cwd nodejs/eks dedupe-deps
