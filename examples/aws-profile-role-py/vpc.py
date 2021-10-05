import pulumi
from typing import Optional, Sequence

# Test utility wrapper around @pulumi/awsx's Vpc component.
# Requires running `make test_build` and having the built component on PATH.

class Vpc(pulumi.ComponentResource):
    @property
    @pulumi.getter(name="vpcId")
    def vpc_id(self) -> pulumi.Output[str]:
        return pulumi.get(self, "vpc_id")

    @property
    @pulumi.getter(name="publicSubnetIds")
    def public_subnet_ids(self) -> pulumi.Output[Sequence[str]]:
        return pulumi.get(self, "public_subnet_ids")

    @property
    @pulumi.getter(name="privateSubnetIds")
    def private_subnet_ids(self) -> pulumi.Output[Sequence[str]]:
        return pulumi.get(self, "private_subnet_ids")

    def __init__(self, name: str, opts: Optional[pulumi.ResourceOptions] = None):
        @pulumi.input_type
        class VpcArgs:
            def __init__(self):
                self.vpc_id = None
                self.public_subnet_ids = None
                self.private_subnet_ids = None
        super().__init__("testvpc:index:Vpc", name, VpcArgs(), opts, True)
