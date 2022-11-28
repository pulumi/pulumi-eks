// Copyright 2016-2019, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

/**
 * InputTags represents an Input map type that can leverage dynamic string k/v
 * for use on types that expect a k/v type with possible computed runtime values,
 * such as special CloudFormation Tags. See
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html.
 */
export type InputTags = pulumi.Input<{ [key: string]: pulumi.Input<string> }>;

/**
 * UserStorageClasses represents a map of an Output type to a
 * k8s StorageClass to capture all of the *user-created* storage classes. This
 * map does not include the default `gp2` automatically added by EKS.
 *
 * Note: As of Kubernetes v1.11+ on EKS, a default `gp2` storage class will
 * always be created automatically for the cluster by the EKS service. See
 * https://docs.aws.amazon.com/eks/latest/userguide/storage-classes.html
 */
export type UserStorageClasses = pulumi.Output<{ [key: string]: k8s.storage.v1.StorageClass }>;
