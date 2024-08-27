// *** WARNING: this file was generated by pulumi. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.eks;

import com.pulumi.aws.ec2.SecurityGroup;
import com.pulumi.aws.eks.Cluster;
import com.pulumi.core.Output;
import com.pulumi.core.annotations.Import;
import com.pulumi.exceptions.MissingRequiredPropertyException;
import java.lang.String;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import javax.annotation.Nullable;


public final class NodeGroupSecurityGroupArgs extends com.pulumi.resources.ResourceArgs {

    public static final NodeGroupSecurityGroupArgs Empty = new NodeGroupSecurityGroupArgs();

    /**
     * The security group associated with the EKS cluster.
     * 
     */
    @Import(name="clusterSecurityGroup", required=true)
    private Output<SecurityGroup> clusterSecurityGroup;

    /**
     * @return The security group associated with the EKS cluster.
     * 
     */
    public Output<SecurityGroup> clusterSecurityGroup() {
        return this.clusterSecurityGroup;
    }

    /**
     * The EKS cluster associated with the worker node group
     * 
     */
    @Import(name="eksCluster", required=true)
    private Output<Cluster> eksCluster;

    /**
     * @return The EKS cluster associated with the worker node group
     * 
     */
    public Output<Cluster> eksCluster() {
        return this.eksCluster;
    }

    /**
     * Key-value mapping of tags to apply to this security group.
     * 
     */
    @Import(name="tags")
    private @Nullable Output<Map<String,String>> tags;

    /**
     * @return Key-value mapping of tags to apply to this security group.
     * 
     */
    public Optional<Output<Map<String,String>>> tags() {
        return Optional.ofNullable(this.tags);
    }

    /**
     * The VPC in which to create the worker node group.
     * 
     */
    @Import(name="vpcId", required=true)
    private Output<String> vpcId;

    /**
     * @return The VPC in which to create the worker node group.
     * 
     */
    public Output<String> vpcId() {
        return this.vpcId;
    }

    private NodeGroupSecurityGroupArgs() {}

    private NodeGroupSecurityGroupArgs(NodeGroupSecurityGroupArgs $) {
        this.clusterSecurityGroup = $.clusterSecurityGroup;
        this.eksCluster = $.eksCluster;
        this.tags = $.tags;
        this.vpcId = $.vpcId;
    }

    public static Builder builder() {
        return new Builder();
    }
    public static Builder builder(NodeGroupSecurityGroupArgs defaults) {
        return new Builder(defaults);
    }

    public static final class Builder {
        private NodeGroupSecurityGroupArgs $;

        public Builder() {
            $ = new NodeGroupSecurityGroupArgs();
        }

        public Builder(NodeGroupSecurityGroupArgs defaults) {
            $ = new NodeGroupSecurityGroupArgs(Objects.requireNonNull(defaults));
        }

        /**
         * @param clusterSecurityGroup The security group associated with the EKS cluster.
         * 
         * @return builder
         * 
         */
        public Builder clusterSecurityGroup(Output<SecurityGroup> clusterSecurityGroup) {
            $.clusterSecurityGroup = clusterSecurityGroup;
            return this;
        }

        /**
         * @param clusterSecurityGroup The security group associated with the EKS cluster.
         * 
         * @return builder
         * 
         */
        public Builder clusterSecurityGroup(SecurityGroup clusterSecurityGroup) {
            return clusterSecurityGroup(Output.of(clusterSecurityGroup));
        }

        /**
         * @param eksCluster The EKS cluster associated with the worker node group
         * 
         * @return builder
         * 
         */
        public Builder eksCluster(Output<Cluster> eksCluster) {
            $.eksCluster = eksCluster;
            return this;
        }

        /**
         * @param eksCluster The EKS cluster associated with the worker node group
         * 
         * @return builder
         * 
         */
        public Builder eksCluster(Cluster eksCluster) {
            return eksCluster(Output.of(eksCluster));
        }

        /**
         * @param tags Key-value mapping of tags to apply to this security group.
         * 
         * @return builder
         * 
         */
        public Builder tags(@Nullable Output<Map<String,String>> tags) {
            $.tags = tags;
            return this;
        }

        /**
         * @param tags Key-value mapping of tags to apply to this security group.
         * 
         * @return builder
         * 
         */
        public Builder tags(Map<String,String> tags) {
            return tags(Output.of(tags));
        }

        /**
         * @param vpcId The VPC in which to create the worker node group.
         * 
         * @return builder
         * 
         */
        public Builder vpcId(Output<String> vpcId) {
            $.vpcId = vpcId;
            return this;
        }

        /**
         * @param vpcId The VPC in which to create the worker node group.
         * 
         * @return builder
         * 
         */
        public Builder vpcId(String vpcId) {
            return vpcId(Output.of(vpcId));
        }

        public NodeGroupSecurityGroupArgs build() {
            if ($.clusterSecurityGroup == null) {
                throw new MissingRequiredPropertyException("NodeGroupSecurityGroupArgs", "clusterSecurityGroup");
            }
            if ($.eksCluster == null) {
                throw new MissingRequiredPropertyException("NodeGroupSecurityGroupArgs", "eksCluster");
            }
            if ($.vpcId == null) {
                throw new MissingRequiredPropertyException("NodeGroupSecurityGroupArgs", "vpcId");
            }
            return $;
        }
    }

}
