// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.eks.enums;

import com.pulumi.core.annotations.EnumType;
import java.lang.String;
import java.util.Objects;
import java.util.StringJoiner;

    /**
     * The authentication mode of the cluster. Valid values are `CONFIG_MAP`, `API` or `API_AND_CONFIG_MAP`.
     * 
     * See for more details:
     * https://docs.aws.amazon.com/eks/latest/userguide/grant-k8s-access.html#set-cam
     * 
     */
    @EnumType
    public enum AuthenticationMode {
        /**
         * Only aws-auth ConfigMap will be used for authenticating to the Kubernetes API.
         * 
         */
        ConfigMap("CONFIG_MAP"),
        /**
         * Only Access Entries will be used for authenticating to the Kubernetes API.
         * 
         */
        Api("API"),
        /**
         * Both aws-auth ConfigMap and Access Entries can be used for authenticating to the Kubernetes API.
         * 
         */
        ApiAndConfigMap("API_AND_CONFIG_MAP");

        private final String value;

        AuthenticationMode(String value) {
            this.value = Objects.requireNonNull(value);
        }

        @EnumType.Converter
        public String getValue() {
            return this.value;
        }

        @Override
        public String toString() {
            return new StringJoiner(", ", "AuthenticationMode[", "]")
                .add("value='" + this.value + "'")
                .toString();
        }
    }
