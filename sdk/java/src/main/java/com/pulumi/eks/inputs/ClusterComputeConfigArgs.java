// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.eks.inputs;

import com.pulumi.core.Output;
import com.pulumi.core.annotations.Import;
import java.lang.String;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import javax.annotation.Nullable;


/**
 * Configuration for the compute capability of your EKS Auto Mode cluster.
 * 
 */
public final class ClusterComputeConfigArgs extends com.pulumi.resources.ResourceArgs {

    public static final ClusterComputeConfigArgs Empty = new ClusterComputeConfigArgs();

    /**
     * Configuration for node pools that defines the compute resources for your EKS Auto Mode cluster. Valid options are `general-purpose` and `system`.
     * 
     * By default, the built-in `system` and `general-purpose` nodepools are enabled.
     * 
     */
    @Import(name="nodePools")
    private @Nullable Output<List<String>> nodePools;

    /**
     * @return Configuration for node pools that defines the compute resources for your EKS Auto Mode cluster. Valid options are `general-purpose` and `system`.
     * 
     * By default, the built-in `system` and `general-purpose` nodepools are enabled.
     * 
     */
    public Optional<Output<List<String>>> nodePools() {
        return Optional.ofNullable(this.nodePools);
    }

    /**
     * The ARN of the IAM Role EKS will assign to EC2 Managed Instances in your EKS Auto Mode cluster. This value cannot be changed after the compute capability of EKS Auto Mode is enabled.
     * 
     */
    @Import(name="nodeRoleArn")
    private @Nullable Output<String> nodeRoleArn;

    /**
     * @return The ARN of the IAM Role EKS will assign to EC2 Managed Instances in your EKS Auto Mode cluster. This value cannot be changed after the compute capability of EKS Auto Mode is enabled.
     * 
     */
    public Optional<Output<String>> nodeRoleArn() {
        return Optional.ofNullable(this.nodeRoleArn);
    }

    private ClusterComputeConfigArgs() {}

    private ClusterComputeConfigArgs(ClusterComputeConfigArgs $) {
        this.nodePools = $.nodePools;
        this.nodeRoleArn = $.nodeRoleArn;
    }

    public static Builder builder() {
        return new Builder();
    }
    public static Builder builder(ClusterComputeConfigArgs defaults) {
        return new Builder(defaults);
    }

    public static final class Builder {
        private ClusterComputeConfigArgs $;

        public Builder() {
            $ = new ClusterComputeConfigArgs();
        }

        public Builder(ClusterComputeConfigArgs defaults) {
            $ = new ClusterComputeConfigArgs(Objects.requireNonNull(defaults));
        }

        /**
         * @param nodePools Configuration for node pools that defines the compute resources for your EKS Auto Mode cluster. Valid options are `general-purpose` and `system`.
         * 
         * By default, the built-in `system` and `general-purpose` nodepools are enabled.
         * 
         * @return builder
         * 
         */
        public Builder nodePools(@Nullable Output<List<String>> nodePools) {
            $.nodePools = nodePools;
            return this;
        }

        /**
         * @param nodePools Configuration for node pools that defines the compute resources for your EKS Auto Mode cluster. Valid options are `general-purpose` and `system`.
         * 
         * By default, the built-in `system` and `general-purpose` nodepools are enabled.
         * 
         * @return builder
         * 
         */
        public Builder nodePools(List<String> nodePools) {
            return nodePools(Output.of(nodePools));
        }

        /**
         * @param nodePools Configuration for node pools that defines the compute resources for your EKS Auto Mode cluster. Valid options are `general-purpose` and `system`.
         * 
         * By default, the built-in `system` and `general-purpose` nodepools are enabled.
         * 
         * @return builder
         * 
         */
        public Builder nodePools(String... nodePools) {
            return nodePools(List.of(nodePools));
        }

        /**
         * @param nodeRoleArn The ARN of the IAM Role EKS will assign to EC2 Managed Instances in your EKS Auto Mode cluster. This value cannot be changed after the compute capability of EKS Auto Mode is enabled.
         * 
         * @return builder
         * 
         */
        public Builder nodeRoleArn(@Nullable Output<String> nodeRoleArn) {
            $.nodeRoleArn = nodeRoleArn;
            return this;
        }

        /**
         * @param nodeRoleArn The ARN of the IAM Role EKS will assign to EC2 Managed Instances in your EKS Auto Mode cluster. This value cannot be changed after the compute capability of EKS Auto Mode is enabled.
         * 
         * @return builder
         * 
         */
        public Builder nodeRoleArn(String nodeRoleArn) {
            return nodeRoleArn(Output.of(nodeRoleArn));
        }

        public ClusterComputeConfigArgs build() {
            return $;
        }
    }

}
