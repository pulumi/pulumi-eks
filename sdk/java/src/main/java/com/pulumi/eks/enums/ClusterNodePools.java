// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.eks.enums;

import com.pulumi.core.annotations.EnumType;
import java.lang.String;
import java.util.Objects;
import java.util.StringJoiner;

    /**
     * Built-in node pools of EKS Auto Mode. For more details see: https://docs.aws.amazon.com/eks/latest/userguide/set-builtin-node-pools.html
     * 
     */
    @EnumType
    public enum ClusterNodePools {
        /**
         * This NodePool has a `CriticalAddonsOnly` taint. Many EKS addons, such as CoreDNS, tolerate this taint. Use this system node pool to segregate cluster-critical applications. Supports both `amd64` and `arm64` architectures.
         * 
         */
        System("system"),
        /**
         * This NodePool provides support for launching nodes for general purpose workloads in your cluster. Only supports `amd64` architecture.
         * 
         */
        GeneralPurpose("general-purpose");

        private final String value;

        ClusterNodePools(String value) {
            this.value = Objects.requireNonNull(value);
        }

        @EnumType.Converter
        public String getValue() {
            return this.value;
        }

        @Override
        public java.lang.String toString() {
            return new StringJoiner(", ", "ClusterNodePools[", "]")
                .add("value='" + this.value + "'")
                .toString();
        }
    }
