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
 * ## Example Usage
 * 
 * ### Provisioning a New EKS Cluster
 * 
 * &lt;!--Start PulumiCodeChooser --&gt;
 * 
 * <pre>
 * {@code
 * import com.pulumi.Context;
 * import com.pulumi.Pulumi;
 * import com.pulumi.core.Output;
 * import com.pulumi.eks.Cluster;
 * import java.util.List;
 * import java.util.ArrayList;
 * import java.util.Map;
 * import java.io.File;
 * import java.nio.file.Files;
 * import java.nio.file.Paths;
 * 
 * public class App {
 * 	public static void main(String[] args) {
 * 		Pulumi.run(App::stack);
 * 	}
 * 
 * 	 public static void stack(Context ctx) {
 *  		// Create an EKS cluster with the default configuration.
 *  		var cluster = new Cluster("cluster");
 *  
 *  		// Export the cluster's kubeconfig.
 * 		ctx.export("kubeconfig", cluster.kubeconfig());
 * 	}
 *  }
 * }
 * </pre>
 * &lt;!--End PulumiCodeChooser --&gt;
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
     * The ID of the security group rule that gives node group access to the cluster API server. Defaults to an empty string if `skipDefaultSecurityGroups` is set to true.
     * 
     */
    @Export(name="clusterIngressRuleId", refs={String.class}, tree="[0]")
    private Output<String> clusterIngressRuleId;

    /**
     * @return The ID of the security group rule that gives node group access to the cluster API server. Defaults to an empty string if `skipDefaultSecurityGroups` is set to true.
     * 
     */
    public Output<String> clusterIngressRuleId() {
        return this.clusterIngressRuleId;
    }
    /**
     * The security group for the EKS cluster.
     * 
     */
    @Export(name="clusterSecurityGroup", refs={SecurityGroup.class}, tree="[0]")
    private Output</* @Nullable */ SecurityGroup> clusterSecurityGroup;

    /**
     * @return The security group for the EKS cluster.
     * 
     */
    public Output<Optional<SecurityGroup>> clusterSecurityGroup() {
        return Codegen.optional(this.clusterSecurityGroup);
    }
    /**
     * The cluster security group ID of the EKS cluster. Returns the EKS created security group if `skipDefaultSecurityGroups` is set to true.
     * 
     */
    @Export(name="clusterSecurityGroupId", refs={String.class}, tree="[0]")
    private Output<String> clusterSecurityGroupId;

    /**
     * @return The cluster security group ID of the EKS cluster. Returns the EKS created security group if `skipDefaultSecurityGroups` is set to true.
     * 
     */
    public Output<String> clusterSecurityGroupId() {
        return this.clusterSecurityGroupId;
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
     * The name of the default node group&#39;s AutoScaling Group. Defaults to an empty string if `skipDefaultNodeGroup` is set to true.
     * 
     */
    @Export(name="defaultNodeGroupAsgName", refs={String.class}, tree="[0]")
    private Output<String> defaultNodeGroupAsgName;

    /**
     * @return The name of the default node group&#39;s AutoScaling Group. Defaults to an empty string if `skipDefaultNodeGroup` is set to true.
     * 
     */
    public Output<String> defaultNodeGroupAsgName() {
        return this.defaultNodeGroupAsgName;
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
    private Output</* @Nullable */ SecurityGroupRule> eksClusterIngressRule;

    /**
     * @return The ingress rule that gives node group access to cluster API server.
     * 
     */
    public Output<Optional<SecurityGroupRule>> eksClusterIngressRule() {
        return Codegen.optional(this.eksClusterIngressRule);
    }
    /**
     * The ID of the Fargate Profile. Defaults to an empty string if no Fargate profile is configured.
     * 
     */
    @Export(name="fargateProfileId", refs={String.class}, tree="[0]")
    private Output<String> fargateProfileId;

    /**
     * @return The ID of the Fargate Profile. Defaults to an empty string if no Fargate profile is configured.
     * 
     */
    public Output<String> fargateProfileId() {
        return this.fargateProfileId;
    }
    /**
     * The status of the Fargate Profile. Defaults to an empty string if no Fargate profile is configured.
     * 
     */
    @Export(name="fargateProfileStatus", refs={String.class}, tree="[0]")
    private Output<String> fargateProfileStatus;

    /**
     * @return The status of the Fargate Profile. Defaults to an empty string if no Fargate profile is configured.
     * 
     */
    public Output<String> fargateProfileStatus() {
        return this.fargateProfileStatus;
    }
    /**
     * The service roles used by the EKS cluster. Only supported with authentication mode `CONFIG_MAP` or `API_AND_CONFIG_MAP`.
     * 
     */
    @Export(name="instanceRoles", refs={List.class,Role.class}, tree="[0,1]")
    private Output<List<Role>> instanceRoles;

    /**
     * @return The service roles used by the EKS cluster. Only supported with authentication mode `CONFIG_MAP` or `API_AND_CONFIG_MAP`.
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
    private Output</* @Nullable */ SecurityGroup> nodeSecurityGroup;

    /**
     * @return The security group for the cluster&#39;s nodes.
     * 
     */
    public Output<Optional<SecurityGroup>> nodeSecurityGroup() {
        return Codegen.optional(this.nodeSecurityGroup);
    }
    /**
     * The node security group ID of the EKS cluster. Returns the EKS created security group if `skipDefaultSecurityGroups` is set to true.
     * 
     */
    @Export(name="nodeSecurityGroupId", refs={String.class}, tree="[0]")
    private Output<String> nodeSecurityGroupId;

    /**
     * @return The node security group ID of the EKS cluster. Returns the EKS created security group if `skipDefaultSecurityGroups` is set to true.
     * 
     */
    public Output<String> nodeSecurityGroupId() {
        return this.nodeSecurityGroupId;
    }
    /**
     * The OIDC Issuer of the EKS cluster (OIDC Provider URL without leading `https://`).
     * 
     * This value can be used to associate kubernetes service accounts with IAM roles. For more information, see https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html.
     * 
     */
    @Export(name="oidcIssuer", refs={String.class}, tree="[0]")
    private Output<String> oidcIssuer;

    /**
     * @return The OIDC Issuer of the EKS cluster (OIDC Provider URL without leading `https://`).
     * 
     * This value can be used to associate kubernetes service accounts with IAM roles. For more information, see https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html.
     * 
     */
    public Output<String> oidcIssuer() {
        return this.oidcIssuer;
    }
    /**
     * The ARN of the IAM OpenID Connect Provider for the EKS cluster. Defaults to an empty string if no OIDC provider is configured.
     * 
     */
    @Export(name="oidcProviderArn", refs={String.class}, tree="[0]")
    private Output<String> oidcProviderArn;

    /**
     * @return The ARN of the IAM OpenID Connect Provider for the EKS cluster. Defaults to an empty string if no OIDC provider is configured.
     * 
     */
    public Output<String> oidcProviderArn() {
        return this.oidcProviderArn;
    }
    /**
     * Issuer URL for the OpenID Connect identity provider of the EKS cluster.
     * 
     */
    @Export(name="oidcProviderUrl", refs={String.class}, tree="[0]")
    private Output<String> oidcProviderUrl;

    /**
     * @return Issuer URL for the OpenID Connect identity provider of the EKS cluster.
     * 
     */
    public Output<String> oidcProviderUrl() {
        return this.oidcProviderUrl;
    }

    /**
     *
     * @param name The _unique_ name of the resulting resource.
     */
    public Cluster(java.lang.String name) {
        this(name, ClusterArgs.Empty);
    }
    /**
     *
     * @param name The _unique_ name of the resulting resource.
     * @param args The arguments to use to populate this resource's properties.
     */
    public Cluster(java.lang.String name, @Nullable ClusterArgs args) {
        this(name, args, null);
    }
    /**
     *
     * @param name The _unique_ name of the resulting resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param options A bag of options that control this resource's behavior.
     */
    public Cluster(java.lang.String name, @Nullable ClusterArgs args, @Nullable com.pulumi.resources.ComponentResourceOptions options) {
        super("eks:index:Cluster", name, makeArgs(args, options), makeResourceOptions(options, Codegen.empty()), true);
    }

    private static ClusterArgs makeArgs(@Nullable ClusterArgs args, @Nullable com.pulumi.resources.ComponentResourceOptions options) {
        if (options != null && options.getUrn().isPresent()) {
            return null;
        }
        return args == null ? ClusterArgs.Empty : args;
    }

    private static com.pulumi.resources.ComponentResourceOptions makeResourceOptions(@Nullable com.pulumi.resources.ComponentResourceOptions options, @Nullable Output<java.lang.String> id) {
        var defaultOptions = com.pulumi.resources.ComponentResourceOptions.builder()
            .version(Utilities.getVersion())
            .build();
        return com.pulumi.resources.ComponentResourceOptions.merge(defaultOptions, options, id);
    }

}
