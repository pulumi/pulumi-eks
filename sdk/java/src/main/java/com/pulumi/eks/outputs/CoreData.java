// *** WARNING: this file was generated by pulumi-java-gen. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

package com.pulumi.eks.outputs;

import com.pulumi.aws.Provider;
import com.pulumi.aws.ec2.SecurityGroup;
import com.pulumi.aws.eks.Cluster;
import com.pulumi.aws.eks.FargateProfile;
import com.pulumi.aws.eks.outputs.ClusterEncryptionConfig;
import com.pulumi.aws.iam.OpenIdConnectProvider;
import com.pulumi.aws.iam.Role;
import com.pulumi.core.annotations.CustomType;
import com.pulumi.eks.VpcCni;
import com.pulumi.eks.outputs.AccessPolicyAssociation;
import com.pulumi.eks.outputs.ClusterNodeGroupOptions;
import com.pulumi.kubernetes.core.v1.ConfigMap;
import com.pulumi.kubernetes.storage.v1.StorageClass;
import java.lang.Object;
import java.lang.String;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import javax.annotation.Nullable;

@CustomType
public final class CoreData {
    /**
     * @return The access entries added to the cluster.
     * 
     */
    private @Nullable List<AccessPolicyAssociation> accessEntries;
    private @Nullable Provider awsProvider;
    private Cluster cluster;
    /**
     * @return The IAM Role attached to the EKS Cluster
     * 
     */
    private Role clusterIamRole;
    private SecurityGroup clusterSecurityGroup;
    private @Nullable ConfigMap eksNodeAccess;
    private @Nullable ClusterEncryptionConfig encryptionConfig;
    /**
     * @return The EKS cluster&#39;s Kubernetes API server endpoint.
     * 
     */
    private String endpoint;
    /**
     * @return The Fargate profile used to manage which pods run on Fargate.
     * 
     */
    private @Nullable FargateProfile fargateProfile;
    /**
     * @return The IAM instance roles for the cluster&#39;s nodes.
     * 
     */
    private List<Role> instanceRoles;
    /**
     * @return The kubeconfig file for the cluster.
     * 
     */
    private @Nullable Object kubeconfig;
    /**
     * @return The cluster&#39;s node group options.
     * 
     */
    private ClusterNodeGroupOptions nodeGroupOptions;
    /**
     * @return Tags attached to the security groups associated with the cluster&#39;s worker nodes.
     * 
     */
    private @Nullable Map<String,String> nodeSecurityGroupTags;
    private @Nullable OpenIdConnectProvider oidcProvider;
    /**
     * @return List of subnet IDs for the private subnets.
     * 
     */
    private @Nullable List<String> privateSubnetIds;
    private com.pulumi.kubernetes.Provider provider;
    /**
     * @return List of subnet IDs for the public subnets.
     * 
     */
    private @Nullable List<String> publicSubnetIds;
    /**
     * @return The storage class used for persistent storage by the cluster.
     * 
     */
    private @Nullable Map<String,StorageClass> storageClasses;
    /**
     * @return List of subnet IDs for the EKS cluster.
     * 
     */
    private List<String> subnetIds;
    /**
     * @return A map of tags assigned to the EKS cluster.
     * 
     */
    private @Nullable Map<String,String> tags;
    /**
     * @return The VPC CNI for the cluster.
     * 
     */
    private @Nullable VpcCni vpcCni;
    /**
     * @return ID of the cluster&#39;s VPC.
     * 
     */
    private String vpcId;

    private CoreData() {}
    /**
     * @return The access entries added to the cluster.
     * 
     */
    public List<AccessPolicyAssociation> accessEntries() {
        return this.accessEntries == null ? List.of() : this.accessEntries;
    }
    public Optional<Provider> awsProvider() {
        return Optional.ofNullable(this.awsProvider);
    }
    public Cluster cluster() {
        return this.cluster;
    }
    /**
     * @return The IAM Role attached to the EKS Cluster
     * 
     */
    public Role clusterIamRole() {
        return this.clusterIamRole;
    }
    public SecurityGroup clusterSecurityGroup() {
        return this.clusterSecurityGroup;
    }
    public Optional<ConfigMap> eksNodeAccess() {
        return Optional.ofNullable(this.eksNodeAccess);
    }
    public Optional<ClusterEncryptionConfig> encryptionConfig() {
        return Optional.ofNullable(this.encryptionConfig);
    }
    /**
     * @return The EKS cluster&#39;s Kubernetes API server endpoint.
     * 
     */
    public String endpoint() {
        return this.endpoint;
    }
    /**
     * @return The Fargate profile used to manage which pods run on Fargate.
     * 
     */
    public Optional<FargateProfile> fargateProfile() {
        return Optional.ofNullable(this.fargateProfile);
    }
    /**
     * @return The IAM instance roles for the cluster&#39;s nodes.
     * 
     */
    public List<Role> instanceRoles() {
        return this.instanceRoles;
    }
    /**
     * @return The kubeconfig file for the cluster.
     * 
     */
    public Optional<Object> kubeconfig() {
        return Optional.ofNullable(this.kubeconfig);
    }
    /**
     * @return The cluster&#39;s node group options.
     * 
     */
    public ClusterNodeGroupOptions nodeGroupOptions() {
        return this.nodeGroupOptions;
    }
    /**
     * @return Tags attached to the security groups associated with the cluster&#39;s worker nodes.
     * 
     */
    public Map<String,String> nodeSecurityGroupTags() {
        return this.nodeSecurityGroupTags == null ? Map.of() : this.nodeSecurityGroupTags;
    }
    public Optional<OpenIdConnectProvider> oidcProvider() {
        return Optional.ofNullable(this.oidcProvider);
    }
    /**
     * @return List of subnet IDs for the private subnets.
     * 
     */
    public List<String> privateSubnetIds() {
        return this.privateSubnetIds == null ? List.of() : this.privateSubnetIds;
    }
    public com.pulumi.kubernetes.Provider provider() {
        return this.provider;
    }
    /**
     * @return List of subnet IDs for the public subnets.
     * 
     */
    public List<String> publicSubnetIds() {
        return this.publicSubnetIds == null ? List.of() : this.publicSubnetIds;
    }
    /**
     * @return The storage class used for persistent storage by the cluster.
     * 
     */
    public Map<String,StorageClass> storageClasses() {
        return this.storageClasses == null ? Map.of() : this.storageClasses;
    }
    /**
     * @return List of subnet IDs for the EKS cluster.
     * 
     */
    public List<String> subnetIds() {
        return this.subnetIds;
    }
    /**
     * @return A map of tags assigned to the EKS cluster.
     * 
     */
    public Map<String,String> tags() {
        return this.tags == null ? Map.of() : this.tags;
    }
    /**
     * @return The VPC CNI for the cluster.
     * 
     */
    public Optional<VpcCni> vpcCni() {
        return Optional.ofNullable(this.vpcCni);
    }
    /**
     * @return ID of the cluster&#39;s VPC.
     * 
     */
    public String vpcId() {
        return this.vpcId;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static Builder builder(CoreData defaults) {
        return new Builder(defaults);
    }
    @CustomType.Builder
    public static final class Builder {
        private @Nullable List<AccessPolicyAssociation> accessEntries;
        private @Nullable Provider awsProvider;
        private Cluster cluster;
        private Role clusterIamRole;
        private SecurityGroup clusterSecurityGroup;
        private @Nullable ConfigMap eksNodeAccess;
        private @Nullable ClusterEncryptionConfig encryptionConfig;
        private String endpoint;
        private @Nullable FargateProfile fargateProfile;
        private List<Role> instanceRoles;
        private @Nullable Object kubeconfig;
        private ClusterNodeGroupOptions nodeGroupOptions;
        private @Nullable Map<String,String> nodeSecurityGroupTags;
        private @Nullable OpenIdConnectProvider oidcProvider;
        private @Nullable List<String> privateSubnetIds;
        private com.pulumi.kubernetes.Provider provider;
        private @Nullable List<String> publicSubnetIds;
        private @Nullable Map<String,StorageClass> storageClasses;
        private List<String> subnetIds;
        private @Nullable Map<String,String> tags;
        private @Nullable VpcCni vpcCni;
        private String vpcId;
        public Builder() {}
        public Builder(CoreData defaults) {
    	      Objects.requireNonNull(defaults);
    	      this.accessEntries = defaults.accessEntries;
    	      this.awsProvider = defaults.awsProvider;
    	      this.cluster = defaults.cluster;
    	      this.clusterIamRole = defaults.clusterIamRole;
    	      this.clusterSecurityGroup = defaults.clusterSecurityGroup;
    	      this.eksNodeAccess = defaults.eksNodeAccess;
    	      this.encryptionConfig = defaults.encryptionConfig;
    	      this.endpoint = defaults.endpoint;
    	      this.fargateProfile = defaults.fargateProfile;
    	      this.instanceRoles = defaults.instanceRoles;
    	      this.kubeconfig = defaults.kubeconfig;
    	      this.nodeGroupOptions = defaults.nodeGroupOptions;
    	      this.nodeSecurityGroupTags = defaults.nodeSecurityGroupTags;
    	      this.oidcProvider = defaults.oidcProvider;
    	      this.privateSubnetIds = defaults.privateSubnetIds;
    	      this.provider = defaults.provider;
    	      this.publicSubnetIds = defaults.publicSubnetIds;
    	      this.storageClasses = defaults.storageClasses;
    	      this.subnetIds = defaults.subnetIds;
    	      this.tags = defaults.tags;
    	      this.vpcCni = defaults.vpcCni;
    	      this.vpcId = defaults.vpcId;
        }

        @CustomType.Setter
        public Builder accessEntries(@Nullable List<AccessPolicyAssociation> accessEntries) {
            this.accessEntries = accessEntries;
            return this;
        }
        public Builder accessEntries(AccessPolicyAssociation... accessEntries) {
            return accessEntries(List.of(accessEntries));
        }
        @CustomType.Setter
        public Builder awsProvider(@Nullable Provider awsProvider) {
            this.awsProvider = awsProvider;
            return this;
        }
        @CustomType.Setter
        public Builder cluster(Cluster cluster) {
            this.cluster = Objects.requireNonNull(cluster);
            return this;
        }
        @CustomType.Setter
        public Builder clusterIamRole(Role clusterIamRole) {
            this.clusterIamRole = Objects.requireNonNull(clusterIamRole);
            return this;
        }
        @CustomType.Setter
        public Builder clusterSecurityGroup(SecurityGroup clusterSecurityGroup) {
            this.clusterSecurityGroup = Objects.requireNonNull(clusterSecurityGroup);
            return this;
        }
        @CustomType.Setter
        public Builder eksNodeAccess(@Nullable ConfigMap eksNodeAccess) {
            this.eksNodeAccess = eksNodeAccess;
            return this;
        }
        @CustomType.Setter
        public Builder encryptionConfig(@Nullable ClusterEncryptionConfig encryptionConfig) {
            this.encryptionConfig = encryptionConfig;
            return this;
        }
        @CustomType.Setter
        public Builder endpoint(String endpoint) {
            this.endpoint = Objects.requireNonNull(endpoint);
            return this;
        }
        @CustomType.Setter
        public Builder fargateProfile(@Nullable FargateProfile fargateProfile) {
            this.fargateProfile = fargateProfile;
            return this;
        }
        @CustomType.Setter
        public Builder instanceRoles(List<Role> instanceRoles) {
            this.instanceRoles = Objects.requireNonNull(instanceRoles);
            return this;
        }
        public Builder instanceRoles(Role... instanceRoles) {
            return instanceRoles(List.of(instanceRoles));
        }
        @CustomType.Setter
        public Builder kubeconfig(@Nullable Object kubeconfig) {
            this.kubeconfig = kubeconfig;
            return this;
        }
        @CustomType.Setter
        public Builder nodeGroupOptions(ClusterNodeGroupOptions nodeGroupOptions) {
            this.nodeGroupOptions = Objects.requireNonNull(nodeGroupOptions);
            return this;
        }
        @CustomType.Setter
        public Builder nodeSecurityGroupTags(@Nullable Map<String,String> nodeSecurityGroupTags) {
            this.nodeSecurityGroupTags = nodeSecurityGroupTags;
            return this;
        }
        @CustomType.Setter
        public Builder oidcProvider(@Nullable OpenIdConnectProvider oidcProvider) {
            this.oidcProvider = oidcProvider;
            return this;
        }
        @CustomType.Setter
        public Builder privateSubnetIds(@Nullable List<String> privateSubnetIds) {
            this.privateSubnetIds = privateSubnetIds;
            return this;
        }
        public Builder privateSubnetIds(String... privateSubnetIds) {
            return privateSubnetIds(List.of(privateSubnetIds));
        }
        @CustomType.Setter
        public Builder provider(com.pulumi.kubernetes.Provider provider) {
            this.provider = Objects.requireNonNull(provider);
            return this;
        }
        @CustomType.Setter
        public Builder publicSubnetIds(@Nullable List<String> publicSubnetIds) {
            this.publicSubnetIds = publicSubnetIds;
            return this;
        }
        public Builder publicSubnetIds(String... publicSubnetIds) {
            return publicSubnetIds(List.of(publicSubnetIds));
        }
        @CustomType.Setter
        public Builder storageClasses(@Nullable Map<String,StorageClass> storageClasses) {
            this.storageClasses = storageClasses;
            return this;
        }
        @CustomType.Setter
        public Builder subnetIds(List<String> subnetIds) {
            this.subnetIds = Objects.requireNonNull(subnetIds);
            return this;
        }
        public Builder subnetIds(String... subnetIds) {
            return subnetIds(List.of(subnetIds));
        }
        @CustomType.Setter
        public Builder tags(@Nullable Map<String,String> tags) {
            this.tags = tags;
            return this;
        }
        @CustomType.Setter
        public Builder vpcCni(@Nullable VpcCni vpcCni) {
            this.vpcCni = vpcCni;
            return this;
        }
        @CustomType.Setter
        public Builder vpcId(String vpcId) {
            this.vpcId = Objects.requireNonNull(vpcId);
            return this;
        }
        public CoreData build() {
            final var _resultValue = new CoreData();
            _resultValue.accessEntries = accessEntries;
            _resultValue.awsProvider = awsProvider;
            _resultValue.cluster = cluster;
            _resultValue.clusterIamRole = clusterIamRole;
            _resultValue.clusterSecurityGroup = clusterSecurityGroup;
            _resultValue.eksNodeAccess = eksNodeAccess;
            _resultValue.encryptionConfig = encryptionConfig;
            _resultValue.endpoint = endpoint;
            _resultValue.fargateProfile = fargateProfile;
            _resultValue.instanceRoles = instanceRoles;
            _resultValue.kubeconfig = kubeconfig;
            _resultValue.nodeGroupOptions = nodeGroupOptions;
            _resultValue.nodeSecurityGroupTags = nodeSecurityGroupTags;
            _resultValue.oidcProvider = oidcProvider;
            _resultValue.privateSubnetIds = privateSubnetIds;
            _resultValue.provider = provider;
            _resultValue.publicSubnetIds = publicSubnetIds;
            _resultValue.storageClasses = storageClasses;
            _resultValue.subnetIds = subnetIds;
            _resultValue.tags = tags;
            _resultValue.vpcCni = vpcCni;
            _resultValue.vpcId = vpcId;
            return _resultValue;
        }
    }
}
