// Copyright 2016-2024, Pulumi Corporation.
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

import { getBaseVpcCniYaml, updateImage } from "./cni";
import * as jsyaml from "js-yaml";
import * as fs from "fs";

describe("updateImage", () => {
    let daemonSet: any;
    let cniManifest: string;
    let cniYaml: any[];
    beforeEach(() => {
        cniManifest = getBaseVpcCniYaml();
        cniYaml = jsyaml.loadAll(cniManifest);
        daemonSet = cniYaml.filter((o) => o.kind === "DaemonSet")[0];
    });

    it("should update the aws-node and aws-eks-nodeagent images", () => {
        let testCode = () => {
            updateImage(daemonSet, "aws-node", "amazon/amazon-k8s-cni:fake");
            updateImage(daemonSet, "aws-eks-nodeagent", "amazon/aws-network-policy-agent:fake");
            return cniYaml.map((o) => `---\n${jsyaml.dump(o)}`).join("");
        };

        expect(testCode).not.toThrow();
        expect(testCode()).toBe(updatedManifest)
    });
});

const updatedManifest = `---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: eniconfigs.crd.k8s.amazonaws.com
spec:
  scope: Cluster
  group: crd.k8s.amazonaws.com
  preserveUnknownFields: false
  versions:
    - name: v1alpha1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          x-kubernetes-preserve-unknown-fields: true
  names:
    plural: eniconfigs
    singular: eniconfig
    kind: ENIConfig
---
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  annotations:
    controller-gen.kubebuilder.io/version: v0.11.3
  creationTimestamp: null
  labels:
    app.kubernetes.io/name: amazon-network-policy-controller-k8s
  name: policyendpoints.networking.k8s.aws
spec:
  group: networking.k8s.aws
  names:
    kind: PolicyEndpoint
    listKind: PolicyEndpointList
    plural: policyendpoints
    singular: policyendpoint
  scope: Namespaced
  versions:
    - name: v1alpha1
      schema:
        openAPIV3Schema:
          description: PolicyEndpoint is the Schema for the policyendpoints API
          properties:
            apiVersion:
              description: >-
                APIVersion defines the versioned schema of this representation
                of an object. Servers should convert recognized schemas to the
                latest internal value, and may reject unrecognized values. More
                info:
                https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources
              type: string
            kind:
              description: >-
                Kind is a string value representing the REST resource this
                object represents. Servers may infer this from the endpoint the
                client submits requests to. Cannot be updated. In CamelCase.
                More info:
                https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds
              type: string
            metadata:
              type: object
            spec:
              description: PolicyEndpointSpec defines the desired state of PolicyEndpoint
              properties:
                egress:
                  description: >-
                    Egress is the list of egress rules containing resolved
                    network addresses
                  items:
                    description: >-
                      EndpointInfo defines the network endpoint information for
                      the policy ingress/egress
                    properties:
                      cidr:
                        description: CIDR is the network address(s) of the endpoint
                        type: string
                      except:
                        description: >-
                          Except is the exceptions to the CIDR ranges mentioned
                          above.
                        items:
                          type: string
                        type: array
                      ports:
                        description: Ports is the list of ports
                        items:
                          description: >-
                            Port contains information about the transport
                            port/protocol
                          properties:
                            endPort:
                              description: >-
                                Endport specifies the port range port to endPort
                                port must be defined and an integer, endPort >
                                port
                              format: int32
                              type: integer
                            port:
                              description: >-
                                Port specifies the numerical port for the
                                protocol. If empty applies to all ports
                              format: int32
                              type: integer
                            protocol:
                              default: TCP
                              description: >-
                                Protocol specifies the transport protocol,
                                default TCP
                              type: string
                          type: object
                        type: array
                    required:
                      - cidr
                    type: object
                  type: array
                ingress:
                  description: >-
                    Ingress is the list of ingress rules containing resolved
                    network addresses
                  items:
                    description: >-
                      EndpointInfo defines the network endpoint information for
                      the policy ingress/egress
                    properties:
                      cidr:
                        description: CIDR is the network address(s) of the endpoint
                        type: string
                      except:
                        description: >-
                          Except is the exceptions to the CIDR ranges mentioned
                          above.
                        items:
                          type: string
                        type: array
                      ports:
                        description: Ports is the list of ports
                        items:
                          description: >-
                            Port contains information about the transport
                            port/protocol
                          properties:
                            endPort:
                              description: >-
                                Endport specifies the port range port to endPort
                                port must be defined and an integer, endPort >
                                port
                              format: int32
                              type: integer
                            port:
                              description: >-
                                Port specifies the numerical port for the
                                protocol. If empty applies to all ports
                              format: int32
                              type: integer
                            protocol:
                              default: TCP
                              description: >-
                                Protocol specifies the transport protocol,
                                default TCP
                              type: string
                          type: object
                        type: array
                    required:
                      - cidr
                    type: object
                  type: array
                podIsolation:
                  description: >-
                    PodIsolation specifies whether the pod needs to be isolated
                    for a particular traffic direction Ingress or Egress, or
                    both. If default isolation is not specified, and there are
                    no ingress/egress rules, then the pod is not isolated from
                    the point of view of this policy. This follows the
                    NetworkPolicy spec.PolicyTypes.
                  items:
                    description: >-
                      PolicyType string describes the NetworkPolicy type This
                      type is beta-level in 1.8
                    type: string
                  type: array
                podSelector:
                  description: PodSelector is the podSelector from the policy resource
                  properties:
                    matchExpressions:
                      description: >-
                        matchExpressions is a list of label selector
                        requirements. The requirements are ANDed.
                      items:
                        description: >-
                          A label selector requirement is a selector that
                          contains values, a key, and an operator that relates
                          the key and values.
                        properties:
                          key:
                            description: key is the label key that the selector applies to.
                            type: string
                          operator:
                            description: >-
                              operator represents a key's relationship to a set
                              of values. Valid operators are In, NotIn, Exists
                              and DoesNotExist.
                            type: string
                          values:
                            description: >-
                              values is an array of string values. If the
                              operator is In or NotIn, the values array must be
                              non-empty. If the operator is Exists or
                              DoesNotExist, the values array must be empty. This
                              array is replaced during a strategic merge patch.
                            items:
                              type: string
                            type: array
                        required:
                          - key
                          - operator
                        type: object
                      type: array
                    matchLabels:
                      additionalProperties:
                        type: string
                      description: >-
                        matchLabels is a map of {key,value} pairs. A single
                        {key,value} in the matchLabels map is equivalent to an
                        element of matchExpressions, whose key field is "key",
                        the operator is "In", and the values array contains only
                        "value". The requirements are ANDed.
                      type: object
                  type: object
                  x-kubernetes-map-type: atomic
                podSelectorEndpoints:
                  description: >-
                    PodSelectorEndpoints contains information about the pods
                    matching the podSelector
                  items:
                    description: PodEndpoint defines the summary information for the pods
                    properties:
                      hostIP:
                        description: >-
                          HostIP is the IP address of the host the pod is
                          currently running on
                        type: string
                      name:
                        description: Name is the pod name
                        type: string
                      namespace:
                        description: Namespace is the pod namespace
                        type: string
                      podIP:
                        description: PodIP is the IP address of the pod
                        type: string
                    required:
                      - hostIP
                      - name
                      - namespace
                      - podIP
                    type: object
                  type: array
                policyRef:
                  description: >-
                    PolicyRef is a reference to the Kubernetes NetworkPolicy
                    resource.
                  properties:
                    name:
                      description: Name is the name of the Policy
                      type: string
                    namespace:
                      description: Namespace is the namespace of the Policy
                      type: string
                  required:
                    - name
                    - namespace
                  type: object
              required:
                - policyRef
              type: object
            status:
              description: >-
                PolicyEndpointStatus defines the observed state of
                PolicyEndpoint
              type: object
          type: object
      served: true
      storage: true
      subresources:
        status: {}
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: aws-node
  namespace: kube-system
  labels:
    app.kubernetes.io/name: aws-node
    app.kubernetes.io/instance: aws-vpc-cni
    k8s-app: aws-node
    app.kubernetes.io/version: v1.16.0
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: amazon-vpc-cni
  namespace: kube-system
  labels:
    app.kubernetes.io/name: aws-node
    app.kubernetes.io/instance: aws-vpc-cni
    k8s-app: aws-node
    app.kubernetes.io/version: v1.16.0
data:
  enable-windows-ipam: 'false'
  enable-network-policy-controller: 'false'
  enable-windows-prefix-delegation: 'false'
  warm-prefix-target: '0'
  warm-ip-target: '1'
  minimum-ip-target: '3'
  branch-eni-cooldown: '60'
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: aws-node
  labels:
    app.kubernetes.io/name: aws-node
    app.kubernetes.io/instance: aws-vpc-cni
    k8s-app: aws-node
    app.kubernetes.io/version: v1.16.0
rules:
  - apiGroups:
      - crd.k8s.amazonaws.com
    resources:
      - eniconfigs
    verbs:
      - list
      - watch
      - get
  - apiGroups:
      - ''
    resources:
      - namespaces
    verbs:
      - list
      - watch
      - get
  - apiGroups:
      - ''
    resources:
      - pods
    verbs:
      - list
      - watch
      - get
  - apiGroups:
      - ''
    resources:
      - nodes
    verbs:
      - list
      - watch
      - get
  - apiGroups:
      - ''
      - events.k8s.io
    resources:
      - events
    verbs:
      - create
      - patch
      - list
  - apiGroups:
      - networking.k8s.aws
    resources:
      - policyendpoints
    verbs:
      - get
      - list
      - watch
  - apiGroups:
      - networking.k8s.aws
    resources:
      - policyendpoints/status
    verbs:
      - get
  - apiGroups:
      - vpcresources.k8s.aws
    resources:
      - cninodes
    verbs:
      - get
      - list
      - watch
      - patch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: aws-node
  labels:
    app.kubernetes.io/name: aws-node
    app.kubernetes.io/instance: aws-vpc-cni
    k8s-app: aws-node
    app.kubernetes.io/version: v1.16.0
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: aws-node
subjects:
  - kind: ServiceAccount
    name: aws-node
    namespace: kube-system
---
kind: DaemonSet
apiVersion: apps/v1
metadata:
  name: aws-node
  namespace: kube-system
  labels:
    app.kubernetes.io/name: aws-node
    app.kubernetes.io/instance: aws-vpc-cni
    k8s-app: aws-node
    app.kubernetes.io/version: v1.16.0
spec:
  updateStrategy:
    rollingUpdate:
      maxUnavailable: 10%
    type: RollingUpdate
  selector:
    matchLabels:
      k8s-app: aws-node
  template:
    metadata:
      labels:
        app.kubernetes.io/name: aws-node
        app.kubernetes.io/instance: aws-vpc-cni
        k8s-app: aws-node
    spec:
      priorityClassName: system-node-critical
      serviceAccountName: aws-node
      hostNetwork: true
      initContainers:
        - name: aws-vpc-cni-init
          image: >-
            602401143452.dkr.ecr.us-west-2.amazonaws.com/amazon-k8s-cni-init:v1.16.0
          env: []
          securityContext:
            privileged: true
          resources:
            requests:
              cpu: 25m
          volumeMounts:
            - mountPath: /host/opt/cni/bin
              name: cni-bin-dir
      terminationGracePeriodSeconds: 10
      tolerations:
        - operator: Exists
      securityContext: {}
      containers:
        - name: aws-node
          image: amazon/amazon-k8s-cni:fake
          ports:
            - containerPort: 61678
              name: metrics
          livenessProbe:
            exec:
              command:
                - /app/grpc-health-probe
                - '-addr=:50051'
                - '-connect-timeout=5s'
                - '-rpc-timeout=5s'
            initialDelaySeconds: 60
            timeoutSeconds: 10
          readinessProbe:
            exec:
              command:
                - /app/grpc-health-probe
                - '-addr=:50051'
                - '-connect-timeout=5s'
                - '-rpc-timeout=5s'
            initialDelaySeconds: 1
            timeoutSeconds: 10
          env:
            - name: ADDITIONAL_ENI_TAGS
              value: '{}'
            - name: AWS_VPC_K8S_CNI_RANDOMIZESNAT
              value: prng
            - name: DISABLE_INTROSPECTION
              value: 'false'
            - name: DISABLE_METRICS
              value: 'false'
            - name: DISABLE_NETWORK_RESOURCE_PROVISIONING
              value: 'false'
            - name: ENABLE_IPv4
              value: 'true'
            - name: VPC_CNI_VERSION
              value: v1.16.0
            - name: WARM_PREFIX_TARGET
              value: '1'
            - name: MY_NODE_NAME
              valueFrom:
                fieldRef:
                  apiVersion: v1
                  fieldPath: spec.nodeName
            - name: MY_POD_NAME
              valueFrom:
                fieldRef:
                  apiVersion: v1
                  fieldPath: metadata.name
          resources:
            requests:
              cpu: 25m
          securityContext:
            capabilities:
              add:
                - NET_ADMIN
                - NET_RAW
          volumeMounts:
            - mountPath: /host/opt/cni/bin
              name: cni-bin-dir
            - mountPath: /host/etc/cni/net.d
              name: cni-net-dir
            - mountPath: /host/var/log/aws-routed-eni
              name: log-dir
            - mountPath: /var/run/aws-node
              name: run-dir
            - mountPath: /run/xtables.lock
              name: xtables-lock
        - name: aws-eks-nodeagent
          image: amazon/aws-network-policy-agent:fake
          env:
            - name: MY_NODE_NAME
              valueFrom:
                fieldRef:
                  apiVersion: v1
                  fieldPath: spec.nodeName
          args:
            - '--enable-ipv6=false'
            - '--enable-network-policy=false'
            - '--enable-cloudwatch-logs=false'
            - '--enable-policy-event-logs=false'
            - '--metrics-bind-addr=:8162'
            - '--health-probe-bind-addr=:8163'
            - '--conntrack-cache-cleanup-period=300'
          resources:
            requests:
              cpu: 25m
          securityContext:
            capabilities:
              add:
                - NET_ADMIN
            privileged: true
          volumeMounts:
            - mountPath: /host/opt/cni/bin
              name: cni-bin-dir
            - mountPath: /sys/fs/bpf
              name: bpf-pin-path
            - mountPath: /var/log/aws-routed-eni
              name: log-dir
            - mountPath: /var/run/aws-node
              name: run-dir
      volumes:
        - name: bpf-pin-path
          hostPath:
            path: /sys/fs/bpf
        - name: cni-bin-dir
          hostPath:
            path: /opt/cni/bin
        - name: cni-net-dir
          hostPath:
            path: /etc/cni/net.d
        - name: log-dir
          hostPath:
            path: /var/log/aws-routed-eni
            type: DirectoryOrCreate
        - name: run-dir
          hostPath:
            path: /var/run/aws-node
            type: DirectoryOrCreate
        - name: xtables-lock
          hostPath:
            path: /run/xtables.lock
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: kubernetes.io/os
                    operator: In
                    values:
                      - linux
                  - key: kubernetes.io/arch
                    operator: In
                    values:
                      - amd64
                      - arm64
                  - key: eks.amazonaws.com/compute-type
                    operator: NotIn
                    values:
                      - fargate
`;