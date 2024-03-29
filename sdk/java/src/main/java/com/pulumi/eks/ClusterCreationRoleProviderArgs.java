// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.eks;

import com.pulumi.core.Output;
import com.pulumi.core.annotations.Import;
import java.lang.String;
import java.util.Objects;
import java.util.Optional;
import javax.annotation.Nullable;


public final class ClusterCreationRoleProviderArgs extends com.pulumi.resources.ResourceArgs {

    public static final ClusterCreationRoleProviderArgs Empty = new ClusterCreationRoleProviderArgs();

    @Import(name="profile")
    private @Nullable Output<String> profile;

    public Optional<Output<String>> profile() {
        return Optional.ofNullable(this.profile);
    }

    @Import(name="region")
    private @Nullable Output<String> region;

    public Optional<Output<String>> region() {
        return Optional.ofNullable(this.region);
    }

    private ClusterCreationRoleProviderArgs() {}

    private ClusterCreationRoleProviderArgs(ClusterCreationRoleProviderArgs $) {
        this.profile = $.profile;
        this.region = $.region;
    }

    public static Builder builder() {
        return new Builder();
    }
    public static Builder builder(ClusterCreationRoleProviderArgs defaults) {
        return new Builder(defaults);
    }

    public static final class Builder {
        private ClusterCreationRoleProviderArgs $;

        public Builder() {
            $ = new ClusterCreationRoleProviderArgs();
        }

        public Builder(ClusterCreationRoleProviderArgs defaults) {
            $ = new ClusterCreationRoleProviderArgs(Objects.requireNonNull(defaults));
        }

        public Builder profile(@Nullable Output<String> profile) {
            $.profile = profile;
            return this;
        }

        public Builder profile(String profile) {
            return profile(Output.of(profile));
        }

        public Builder region(@Nullable Output<String> region) {
            $.region = region;
            return this;
        }

        public Builder region(String region) {
            return region(Output.of(region));
        }

        public ClusterCreationRoleProviderArgs build() {
            return $;
        }
    }

}
