// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.eks;

import com.pulumi.aws.Provider;
import com.pulumi.aws.ec2.SecurityGroup;
import com.pulumi.aws.ec2.SecurityGroupRule;
import com.pulumi.aws.iam.Role;
import com.pulumi.core.Output;
import com.pulumi.core.annotations.Export;
import com.pulumi.core.annotations.ResourceType;
import com.pulumi.core.internal.Codegen;
import com.pulumi.eks.ClusterArgs;
import com.pulumi.eks.Utilities;
import com.pulumi.eks.outputs.CoreData;
import com.pulumi.eks.outputs.NodeGroupData;
import java.lang.Object;
import java.lang.String;
import java.util.List;
import java.util.Optional;
import javax.annotation.Nullable;

/**
 * Cluster is a component that wraps the AWS and Kubernetes resources necessary to run an EKS cluster, its worker nodes, its optional StorageClasses, and an optional deployment of the Kubernetes Dashboard.
 * 
 */
@ResourceType(type="eks:index:Cluster")
public class Cluster extends com.pulumi.resources.ComponentResource {
    /**
     * The AWS resource provider.
     * 
     */
    @Export(name="awsProvider", refs={Provider.class}, tree="[0]")
    private Output<Provider> awsProvider;

    /**
     * @return The AWS resource provider.
     * 
     */
    public Output<Provider> awsProvider() {
        return this.awsProvider;
    }
    /**
     * The security group for the EKS cluster.
     * 
     */
    @Export(name="clusterSecurityGroup", refs={SecurityGroup.class}, tree="[0]")
    private Output<SecurityGroup> clusterSecurityGroup;

    /**
     * @return The security group for the EKS cluster.
     * 
     */
    public Output<SecurityGroup> clusterSecurityGroup() {
        return this.clusterSecurityGroup;
    }
    /**
     * The EKS cluster and its dependencies.
     * 
     */
    @Export(name="core", refs={CoreData.class}, tree="[0]")
    private Output<CoreData> core;

    /**
     * @return The EKS cluster and its dependencies.
     * 
     */
    public Output<CoreData> core() {
        return this.core;
    }
    /**
     * The default Node Group configuration, or undefined if `skipDefaultNodeGroup` was specified.
     * 
     */
    @Export(name="defaultNodeGroup", refs={NodeGroupData.class}, tree="[0]")
    private Output</* @Nullable */ NodeGroupData> defaultNodeGroup;

    /**
     * @return The default Node Group configuration, or undefined if `skipDefaultNodeGroup` was specified.
     * 
     */
    public Output<Optional<NodeGroupData>> defaultNodeGroup() {
        return Codegen.optional(this.defaultNodeGroup);
    }
    /**
     * The EKS cluster.
     * 
     */
    @Export(name="eksCluster", refs={com.pulumi.aws.eks.Cluster.class}, tree="[0]")
    private Output<com.pulumi.aws.eks.Cluster> eksCluster;

    /**
     * @return The EKS cluster.
     * 
     */
    public Output<com.pulumi.aws.eks.Cluster> eksCluster() {
        return this.eksCluster;
    }
    /**
     * The ingress rule that gives node group access to cluster API server.
     * 
     */
    @Export(name="eksClusterIngressRule", refs={SecurityGroupRule.class}, tree="[0]")
    private Output<SecurityGroupRule> eksClusterIngressRule;

    /**
     * @return The ingress rule that gives node group access to cluster API server.
     * 
     */
    public Output<SecurityGroupRule> eksClusterIngressRule() {
        return this.eksClusterIngressRule;
    }
    /**
     * The service roles used by the EKS cluster.
     * 
     */
    @Export(name="instanceRoles", refs={List.class,Role.class}, tree="[0,1]")
    private Output<List<Role>> instanceRoles;

    /**
     * @return The service roles used by the EKS cluster.
     * 
     */
    public Output<List<Role>> instanceRoles() {
        return this.instanceRoles;
    }
    /**
     * A kubeconfig that can be used to connect to the EKS cluster.
     * 
     */
    @Export(name="kubeconfig", refs={Object.class}, tree="[0]")
    private Output<Object> kubeconfig;

    /**
     * @return A kubeconfig that can be used to connect to the EKS cluster.
     * 
     */
    public Output<Object> kubeconfig() {
        return this.kubeconfig;
    }
    /**
     * A kubeconfig that can be used to connect to the EKS cluster as a JSON string.
     * 
     */
    @Export(name="kubeconfigJson", refs={String.class}, tree="[0]")
    private Output<String> kubeconfigJson;

    /**
     * @return A kubeconfig that can be used to connect to the EKS cluster as a JSON string.
     * 
     */
    public Output<String> kubeconfigJson() {
        return this.kubeconfigJson;
    }
    /**
     * The security group for the cluster&#39;s nodes.
     * 
     */
    @Export(name="nodeSecurityGroup", refs={SecurityGroup.class}, tree="[0]")
    private Output<SecurityGroup> nodeSecurityGroup;

    /**
     * @return The security group for the cluster&#39;s nodes.
     * 
     */
    public Output<SecurityGroup> nodeSecurityGroup() {
        return this.nodeSecurityGroup;
    }

    /**
     *
     * @param name The _unique_ name of the resulting resource.
     */
    public Cluster(String name) {
        this(name, ClusterArgs.Empty);
    }
    /**
     *
     * @param name The _unique_ name of the resulting resource.
     * @param args The arguments to use to populate this resource's properties.
     */
    public Cluster(String name, @Nullable ClusterArgs args) {
        this(name, args, null);
    }
    /**
     *
     * @param name The _unique_ name of the resulting resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param options A bag of options that control this resource's behavior.
     */
    public Cluster(String name, @Nullable ClusterArgs args, @Nullable com.pulumi.resources.ComponentResourceOptions options) {
        super("eks:index:Cluster", name, args == null ? ClusterArgs.Empty : args, makeResourceOptions(options, Codegen.empty()), true);
    }

    private static com.pulumi.resources.ComponentResourceOptions makeResourceOptions(@Nullable com.pulumi.resources.ComponentResourceOptions options, @Nullable Output<String> id) {
        var defaultOptions = com.pulumi.resources.ComponentResourceOptions.builder()
            .version(Utilities.getVersion())
            .build();
        return com.pulumi.resources.ComponentResourceOptions.merge(defaultOptions, options, id);
    }

}
