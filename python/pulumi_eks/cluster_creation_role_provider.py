# coding=utf-8
# *** WARNING: this file was generated by pulumi-gen-eks. ***
# *** Do not edit by hand unless you're certain you know what you are doing! ***

import warnings
import pulumi
import pulumi.runtime
from typing import Any, Mapping, Optional, Sequence, Union
from . import _utilities, _tables
import pulumi_aws

__all__ = ['ClusterCreationRoleProvider']


class ClusterCreationRoleProvider(pulumi.ComponentResource):
    def __init__(__self__,
                 resource_name: str,
                 opts: Optional[pulumi.ResourceOptions] = None,
                 profile: Optional[pulumi.Input[str]] = None,
                 region: Optional[pulumi.Input[str]] = None,
                 __props__=None,
                 __name__=None,
                 __opts__=None):
        """
        ClusterCreationRoleProvider is a component that wraps creating a role provider that can be passed to the `Cluster`'s `creationRoleProvider`. This can be used to provide a specific role to use for the creation of the EKS cluster different from the role being used to run the Pulumi deployment.

        :param str resource_name: The name of the resource.
        :param pulumi.ResourceOptions opts: Options for the resource.
        """
        if __name__ is not None:
            warnings.warn("explicit use of __name__ is deprecated", DeprecationWarning)
            resource_name = __name__
        if __opts__ is not None:
            warnings.warn("explicit use of __opts__ is deprecated, use 'opts' instead", DeprecationWarning)
            opts = __opts__
        if opts is None:
            opts = pulumi.ResourceOptions()
        if not isinstance(opts, pulumi.ResourceOptions):
            raise TypeError('Expected resource options to be a ResourceOptions instance')
        if opts.version is None:
            opts.version = _utilities.get_version()
        if opts.id is not None:
            raise ValueError('ComponentResource classes do not support opts.id')
        else:
            if __props__ is not None:
                raise TypeError('__props__ is only valid when passed in combination with a valid opts.id to get an existing resource')
            __props__ = dict()

            __props__['profile'] = profile
            __props__['region'] = region
            __props__['provider'] = None
            __props__['role'] = None
        super(ClusterCreationRoleProvider, __self__).__init__(
            'eks:index:ClusterCreationRoleProvider',
            resource_name,
            __props__,
            opts,
            remote=True)

    @property
    @pulumi.getter
    def provider(self) -> pulumi.Output['pulumi_aws.Provider']:
        return pulumi.get(self, "provider")

    @property
    @pulumi.getter
    def role(self) -> pulumi.Output['pulumi_aws.iam.Role']:
        return pulumi.get(self, "role")

    def translate_output_property(self, prop):
        return _tables.CAMEL_TO_SNAKE_CASE_TABLE.get(prop) or prop

    def translate_input_property(self, prop):
        return _tables.SNAKE_TO_CAMEL_CASE_TABLE.get(prop) or prop

