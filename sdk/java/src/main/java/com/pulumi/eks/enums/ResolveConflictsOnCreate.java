// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.eks.enums;

import com.pulumi.core.annotations.EnumType;
import java.lang.String;
import java.util.Objects;
import java.util.StringJoiner;

    /**
     * How to resolve field value conflicts when migrating a self-managed add-on to an Amazon EKS add-on. Valid values are `NONE` and `OVERWRITE`. For more details see the [CreateAddon](https://docs.aws.amazon.com/eks/latest/APIReference/API_CreateAddon.html) API Docs.
     * 
     */
    @EnumType
    public enum ResolveConflictsOnCreate {
        /**
         * If the self-managed version of the add-on is installed on your cluster, Amazon EKS doesn&#39;t change the value. Creation of the add-on might fail.
         * 
         */
        None("NONE"),
        /**
         * If the self-managed version of the add-on is installed on your cluster and the Amazon EKS default value is different than the existing value, Amazon EKS changes the value to the Amazon EKS default value.
         * 
         */
        Overwrite("OVERWRITE");

        private final String value;

        ResolveConflictsOnCreate(String value) {
            this.value = Objects.requireNonNull(value);
        }

        @EnumType.Converter
        public String getValue() {
            return this.value;
        }

        @Override
        public String toString() {
            return new StringJoiner(", ", "ResolveConflictsOnCreate[", "]")
                .add("value='" + this.value + "'")
                .toString();
        }
    }