import * as pulumi from "@pulumi/pulumi";
import * as eks from "@pulumi/eks";

const projectName = pulumi.getProject();

////////////////////////////
///     EKS Clusters     ///
////////////////////////////

// Remove cluster entirely from the code (this should fail since deletion protection is enabled)
