// *** WARNING: this file was generated by pulumi-gen-eks. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

using System;
using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi.Serialization;

namespace Pulumi.Eks.Inputs
{

    /// <summary>
    /// StorageClass describes the inputs to a single Kubernetes StorageClass provisioned by AWS. Any number of storage classes can be added to a cluster at creation time. One of these storage classes may be configured the default storage class for the cluster.
    /// </summary>
    public sealed class StorageClassArgs : global::Pulumi.ResourceArgs
    {
        /// <summary>
        /// AllowVolumeExpansion shows whether the storage class allow volume expand.
        /// </summary>
        [Input("allowVolumeExpansion")]
        public Input<bool>? AllowVolumeExpansion { get; set; }

        /// <summary>
        /// True if this storage class should be a default storage class for the cluster.
        /// 
        /// Note: As of Kubernetes v1.11+ on EKS, a default `gp2` storage class will always be created automatically for the cluster by the EKS service. See https://docs.aws.amazon.com/eks/latest/userguide/storage-classes.html
        /// 
        /// Please note that at most one storage class can be marked as default. If two or more of them are marked as default, a PersistentVolumeClaim without `storageClassName` explicitly specified cannot be created. See: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/#changing-the-default-storageclass
        /// </summary>
        [Input("default")]
        public Input<bool>? Default { get; set; }

        /// <summary>
        /// Denotes whether the EBS volume should be encrypted.
        /// </summary>
        [Input("encrypted")]
        public Input<bool>? Encrypted { get; set; }

        /// <summary>
        /// I/O operations per second per GiB for "io1" volumes. The AWS volume plugin multiplies this with the size of a requested volume to compute IOPS of the volume and caps the result at 20,000 IOPS.
        /// </summary>
        [Input("iopsPerGb")]
        public Input<int>? IopsPerGb { get; set; }

        /// <summary>
        /// The full Amazon Resource Name of the key to use when encrypting the volume. If none is supplied but encrypted is true, a key is generated by AWS.
        /// </summary>
        [Input("kmsKeyId")]
        public Input<string>? KmsKeyId { get; set; }

        /// <summary>
        /// Standard object's metadata. More info: https://git.k8s.io/community/contributors/devel/api-conventions.md#metadata
        /// </summary>
        [Input("metadata")]
        public Input<Pulumi.Kubernetes.Types.Inputs.Meta.V1.ObjectMetaArgs>? Metadata { get; set; }

        [Input("mountOptions")]
        private InputList<string>? _mountOptions;

        /// <summary>
        /// Dynamically provisioned PersistentVolumes of this storage class are created with these mountOptions, e.g. ["ro", "soft"]. Not validated - mount of the PVs will simply fail if one is invalid.
        /// </summary>
        public InputList<string> MountOptions
        {
            get => _mountOptions ?? (_mountOptions = new InputList<string>());
            set => _mountOptions = value;
        }

        /// <summary>
        /// Dynamically provisioned PersistentVolumes of this storage class are created with this reclaimPolicy. Defaults to Delete.
        /// </summary>
        [Input("reclaimPolicy")]
        public Input<string>? ReclaimPolicy { get; set; }

        /// <summary>
        /// The EBS volume type.
        /// </summary>
        [Input("type", required: true)]
        public Input<string> Type { get; set; } = null!;

        /// <summary>
        /// VolumeBindingMode indicates how PersistentVolumeClaims should be provisioned and bound. When unset, VolumeBindingImmediate is used. This field is alpha-level and is only honored by servers that enable the VolumeScheduling feature.
        /// </summary>
        [Input("volumeBindingMode")]
        public Input<string>? VolumeBindingMode { get; set; }

        [Input("zones")]
        private InputList<string>? _zones;

        /// <summary>
        /// The AWS zone or zones for the EBS volume. If zones is not specified, volumes are generally round-robin-ed across all active zones where Kubernetes cluster has a node. zone and zones parameters must not be used at the same time.
        /// </summary>
        public InputList<string> Zones
        {
            get => _zones ?? (_zones = new InputList<string>());
            set => _zones = value;
        }

        public StorageClassArgs()
        {
        }
        public static new StorageClassArgs Empty => new StorageClassArgs();
    }
}
