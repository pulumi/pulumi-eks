#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_DIR=$(dirname $SCRIPT_DIR)

printf "%60s" " " | tr ' ' '-' 
echo
echo `date`

pushd $PROJECT_DIR
echo "=> Building commit: `git rev-parse --short HEAD`"
make ensure && make only_build
result=$(echo $?)
popd

if [ $result -eq 0 ] ; then
    exit 0
else
    exit 1
fi
