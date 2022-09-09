// *** WARNING: this file was generated by pulumi-gen-eks. ***
// *** Do not edit by hand unless you're certain you know what you are doing! ***

import * as pulumi from "@pulumi/pulumi";
import * as utilities from "./utilities";

import * as pulumiAws from "@pulumi/aws";

/**
 * ClusterCreationRoleProvider is a component that wraps creating a role provider that can be passed to the `Cluster`'s `creationRoleProvider`. This can be used to provide a specific role to use for the creation of the EKS cluster different from the role being used to run the Pulumi deployment.
 */
export class ClusterCreationRoleProvider extends pulumi.ComponentResource {
    /** @internal */
    public static readonly __pulumiType = 'eks:index:ClusterCreationRoleProvider';

    /**
     * Returns true if the given object is an instance of ClusterCreationRoleProvider.  This is designed to work even
     * when multiple copies of the Pulumi SDK have been loaded into the same process.
     */
    public static isInstance(obj: any): obj is ClusterCreationRoleProvider {
        if (obj === undefined || obj === null) {
            return false;
        }
        return obj['__pulumiType'] === ClusterCreationRoleProvider.__pulumiType;
    }

    public /*out*/ readonly provider!: pulumi.Output<pulumiAws.Provider>;
    public /*out*/ readonly role!: pulumi.Output<pulumiAws.iam.Role>;

    /**
     * Create a ClusterCreationRoleProvider resource with the given unique name, arguments, and options.
     *
     * @param name The _unique_ name of the resource.
     * @param args The arguments to use to populate this resource's properties.
     * @param opts A bag of options that control this resource's behavior.
     */
    constructor(name: string, args?: ClusterCreationRoleProviderArgs, opts?: pulumi.ComponentResourceOptions) {
        let resourceInputs: pulumi.Inputs = {};
        opts = opts || {};
        if (!opts.id) {
            resourceInputs["profile"] = args ? args.profile : undefined;
            resourceInputs["region"] = args ? args.region : undefined;
            resourceInputs["provider"] = undefined /*out*/;
            resourceInputs["role"] = undefined /*out*/;
        } else {
            resourceInputs["provider"] = undefined /*out*/;
            resourceInputs["role"] = undefined /*out*/;
        }
        opts = pulumi.mergeOptions(utilities.resourceOptsDefaults(), opts);
        super(ClusterCreationRoleProvider.__pulumiType, name, resourceInputs, opts, true /*remote*/);
    }
}

/**
 * The set of arguments for constructing a ClusterCreationRoleProvider resource.
 */
export interface ClusterCreationRoleProviderArgs {
    profile?: pulumi.Input<string>;
    region?: pulumi.Input<string>;
}
