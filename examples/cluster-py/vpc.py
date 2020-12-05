import pulumi
from typing import Optional, Sequence

# Test utility wrapper around @pulumi/awsx's Vpc component.
# Requires running `make test_build` and having the built component on PATH.

class Vpc(pulumi.ComponentResource):
    vpc_id: pulumi.Output[str]
    public_subnet_ids: pulumi.Output[Sequence[str]]
    private_subnet_ids: pulumi.Output[Sequence[str]]

    def __init__(self, name: str, opts: Optional[pulumi.ResourceOptions] = None):
        props = dict()
        props["vpc_id"] = None
        props["public_subnet_ids"] = None
        props["private_subnet_ids"] = None
        super().__init__("testvpc:index:Vpc", name, props, opts, True)

    _CAMEL_TO_SNAKE_CASE_TABLE = {
        "vpcId": "vpc_id",
        "publicSubnetIds": "public_subnet_ids",
        "privateSubnetIds": "private_subnet_ids"
    }

    _SNAKE_TO_CAMEL_CASE_TABLE = {
        "vpc_id": "vpcId",
        "public_subnet_ids": "publicSubnetIds",
        "private_subnet_ids": "privateSubnetIds"
    }

    def translate_output_property(self, prop):
        return Vpc._CAMEL_TO_SNAKE_CASE_TABLE.get(prop) or prop

    def translate_input_property(self, prop):
        return Vpc._SNAKE_TO_CAMEL_CASE_TABLE.get(prop) or prop
