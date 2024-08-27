// *** WARNING: this file was generated by pulumi. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.eks.inputs;

import com.pulumi.core.Output;
import com.pulumi.core.annotations.Import;
import com.pulumi.exceptions.MissingRequiredPropertyException;
import java.lang.String;
import java.util.List;
import java.util.Objects;


/**
 * Describes a mapping from an AWS IAM user to a Kubernetes user and groups.
 * 
 */
public final class UserMappingArgs extends com.pulumi.resources.ResourceArgs {

    public static final UserMappingArgs Empty = new UserMappingArgs();

    /**
     * A list of groups within Kubernetes to which the user is mapped to.
     * 
     */
    @Import(name="groups", required=true)
    private Output<List<String>> groups;

    /**
     * @return A list of groups within Kubernetes to which the user is mapped to.
     * 
     */
    public Output<List<String>> groups() {
        return this.groups;
    }

    /**
     * The ARN of the IAM user to add.
     * 
     */
    @Import(name="userArn", required=true)
    private Output<String> userArn;

    /**
     * @return The ARN of the IAM user to add.
     * 
     */
    public Output<String> userArn() {
        return this.userArn;
    }

    /**
     * The user name within Kubernetes to map to the IAM user. By default, the user name is the ARN of the IAM user.
     * 
     */
    @Import(name="username", required=true)
    private Output<String> username;

    /**
     * @return The user name within Kubernetes to map to the IAM user. By default, the user name is the ARN of the IAM user.
     * 
     */
    public Output<String> username() {
        return this.username;
    }

    private UserMappingArgs() {}

    private UserMappingArgs(UserMappingArgs $) {
        this.groups = $.groups;
        this.userArn = $.userArn;
        this.username = $.username;
    }

    public static Builder builder() {
        return new Builder();
    }
    public static Builder builder(UserMappingArgs defaults) {
        return new Builder(defaults);
    }

    public static final class Builder {
        private UserMappingArgs $;

        public Builder() {
            $ = new UserMappingArgs();
        }

        public Builder(UserMappingArgs defaults) {
            $ = new UserMappingArgs(Objects.requireNonNull(defaults));
        }

        /**
         * @param groups A list of groups within Kubernetes to which the user is mapped to.
         * 
         * @return builder
         * 
         */
        public Builder groups(Output<List<String>> groups) {
            $.groups = groups;
            return this;
        }

        /**
         * @param groups A list of groups within Kubernetes to which the user is mapped to.
         * 
         * @return builder
         * 
         */
        public Builder groups(List<String> groups) {
            return groups(Output.of(groups));
        }

        /**
         * @param groups A list of groups within Kubernetes to which the user is mapped to.
         * 
         * @return builder
         * 
         */
        public Builder groups(String... groups) {
            return groups(List.of(groups));
        }

        /**
         * @param userArn The ARN of the IAM user to add.
         * 
         * @return builder
         * 
         */
        public Builder userArn(Output<String> userArn) {
            $.userArn = userArn;
            return this;
        }

        /**
         * @param userArn The ARN of the IAM user to add.
         * 
         * @return builder
         * 
         */
        public Builder userArn(String userArn) {
            return userArn(Output.of(userArn));
        }

        /**
         * @param username The user name within Kubernetes to map to the IAM user. By default, the user name is the ARN of the IAM user.
         * 
         * @return builder
         * 
         */
        public Builder username(Output<String> username) {
            $.username = username;
            return this;
        }

        /**
         * @param username The user name within Kubernetes to map to the IAM user. By default, the user name is the ARN of the IAM user.
         * 
         * @return builder
         * 
         */
        public Builder username(String username) {
            return username(Output.of(username));
        }

        public UserMappingArgs build() {
            if ($.groups == null) {
                throw new MissingRequiredPropertyException("UserMappingArgs", "groups");
            }
            if ($.userArn == null) {
                throw new MissingRequiredPropertyException("UserMappingArgs", "userArn");
            }
            if ($.username == null) {
                throw new MissingRequiredPropertyException("UserMappingArgs", "username");
            }
            return $;
        }
    }

}
