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
    /// Represents a Kubernetes `taint` to apply to all Nodes in a NodeGroup. See https://kubernetes.io/docs/concepts/configuration/taint-and-toleration/.
    /// </summary>
    public sealed class TaintArgs : Pulumi.ResourceArgs
    {
        /// <summary>
        /// The effect of the taint.
        /// </summary>
        [Input("effect", required: true)]
        public string Effect { get; set; } = null!;

        /// <summary>
        /// The value of the taint.
        /// </summary>
        [Input("value", required: true)]
        public string Value { get; set; } = null!;

        public TaintArgs()
        {
        }
    }
}
