#!/bin/bash

PACKAGE_VERSION=$(pulumictl get version --language javascript)

sed -e 's/\${VERSION}/'$PACKAGE_VERSION'/g' < provider/cmd/pulumi-resource-eks/package.json > package.json
cp provider/cmd/pulumi-resource-eks/PulumiPlugin.yaml .
