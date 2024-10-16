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
    /// MIME document parts for nodeadm configuration. This can be shell scripts, nodeadm configuration or any other user data compatible script.
    /// 
    /// See for more details: https://awslabs.github.io/amazon-eks-ami/nodeadm/.
    /// </summary>
    public sealed class NodeadmOptionsArgs : global::Pulumi.ResourceArgs
    {
        /// <summary>
        /// The ARN of the access policy to associate with the principal
        /// </summary>
        [Input("content", required: true)]
        public Input<string> Content { get; set; } = null!;

        /// <summary>
        /// The MIME type of the content. Examples are `text/x-shellscript; charset="us-ascii"` for shell scripts, and `application/node.eks.aws` nodeadm configuration.
        /// </summary>
        [Input("contentType", required: true)]
        public Input<string> ContentType { get; set; } = null!;

        public NodeadmOptionsArgs()
        {
        }
        public static new NodeadmOptionsArgs Empty => new NodeadmOptionsArgs();
    }
}
