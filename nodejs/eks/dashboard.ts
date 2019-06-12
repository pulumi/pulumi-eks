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
import * as fs from "fs";
import * as path from "path";

export interface DashboardOptions {}

export function createDashboard(name: string, args: DashboardOptions, parent: pulumi.ComponentResource, k8sProvider: k8s.Provider) {
    // Deploy the latest version of the k8s dashboard.
    const dashboardYaml = [
        path.join(__dirname, "dashboard", "kubernetes-dashboard.yaml"),
        path.join(__dirname, "dashboard", "heapster.yaml"),
        path.join(__dirname, "dashboard", "influxdb.yaml"),
        path.join(__dirname, "dashboard", "heapster-rbac.yaml"),
    ].map(filePath => fs.readFileSync(filePath).toString());
    const dashboard = new k8s.yaml.ConfigGroup(`${name}-dashboard`, {
        yaml: dashboardYaml,
    }, { parent: parent, providers: { kubernetes: k8sProvider } });

    // Create a service account for admin access.
    const adminAccount = new k8s.core.v1.ServiceAccount(`${name}-eks-admin`, {
        metadata: {
            name: "eks-admin",
            namespace: "kube-system",
        },
    }, { parent: parent, provider: k8sProvider });

    // Create a role binding for the admin account.
    const adminRoleBinding = new k8s.rbac.v1.ClusterRoleBinding(`${name}-eks-admin`, {
        metadata: {
            name: "eks-admin",
        },
        roleRef: {
            apiGroup: "rbac.authorization.k8s.io",
            kind: "ClusterRole",
            name: "cluster-admin",
        },
        subjects: [{
            kind: "ServiceAccount",
            name: "eks-admin",
            namespace: "kube-system",
        }],
    }, { parent: parent, provider: k8sProvider });
}
