package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"testing"
	"time"

	"sync/atomic"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/eks"
	eksTypes "github.com/aws/aws-sdk-go-v2/service/eks/types"
	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/mod/semver"
	"gopkg.in/yaml.v2"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes"
	restclient "k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// Each resource request will be fetched from the Kubernetes API Server at a
// max of 20 retries, with 15 seconds in between each attempt.
// This creates a max wait time of up to 5 minutes that a resource request
// must successfully return within, before moving on.

// MaxRetries is the maximum number of retries that a resource will be
// attempted to be fetched from the Kubernetes API Server.
const MaxRetries = 20

// RetryInterval is the number of seconds to sleep in between requests
// to the Kubernetes API Server.
const RetryInterval = 15

// RunEKSSmokeTest instantiates the EKS Smoke Test.
func RunEKSSmokeTest(t *testing.T, resources []apitype.ResourceV3, kubeconfigs ...interface{}) {
	// Map the cluster name to the total desired Node count across all
	// NodeGroups.
	clusterNodeCount, err := mapClusterToNodeCount(resources)
	if err != nil {
		t.Error(err)
	}

	// Map the cluster name to the KubeAccess client-go tool bag.
	kubeAccess, err := mapClusterToKubeAccess(kubeconfigs...)
	if err != nil {
		t.Error(err)
	}

	// Map the cluster name to their authentication mode.
	clusterAuthenticationMode, err := mapClusterToAuthenticationMode(resources)
	if err != nil {
		t.Error(err)
	}

	// Run the smoke test against each cluster, expecting the total desired
	// Node count.
	var wg sync.WaitGroup
	wg.Add(len(kubeAccess))
	defer wg.Wait()

	for clusterName := range kubeAccess {
		clusterName := clusterName
		PrintAndLog(fmt.Sprintf("Testing Cluster: %s\n", clusterName), t)
		authenticationMode := clusterAuthenticationMode[clusterName]
		PrintAndLog(fmt.Sprintf("Detected authentication mode '%s' for Cluster %s\n", authenticationMode, clusterName), t)

		go wgWrapper(&wg, func() {
			clientset := kubeAccess[clusterName].Clientset
			eksSmokeTest(t, clientset, clusterNodeCount[clusterName], authenticationMode)
		})
	}
}

// EKSSmokeTest runs a checklist of operational successes required to deem the
// EKS cluster as successfully running and ready for use.
func eksSmokeTest(t *testing.T, clientset *kubernetes.Clientset, desiredNodeCount int, authenticationMode string) {
	APIServerVersionInfo(t, clientset)

	// Run all tests.
	var wg sync.WaitGroup
	wg.Add(3)
	defer wg.Wait()

	if authenticationMode == "CONFIG_MAP" || authenticationMode == "API_AND_CONFIG_MAP" {
		go wgWrapper(&wg, func() { assertEKSConfigMapReady(t, clientset) })
	} else {
		go wgWrapper(&wg, func() { assertEKSConfigMapRemoved(t, clientset) })
	}
	go wgWrapper(&wg, func() { AssertAllNodesReady(t, clientset, desiredNodeCount) })
	go wgWrapper(&wg, func() { AssertKindInAllNamespacesReady(t, clientset, "pods") })
}

// wgWrapper is a helper func that wraps a WaitGroup's Done() method.
func wgWrapper(wg *sync.WaitGroup, f func()) {
	defer wg.Done()
	f()
}

// APIServerVersionInfo prints out the API Server versions.
func APIServerVersionInfo(t *testing.T, clientset *kubernetes.Clientset) {
	version, err := clientset.DiscoveryClient.ServerVersion()
	if err != nil {
		t.Fatal(err)
	}
	PrintAndLog(fmt.Sprintf("API Server Version: %s.%s\n", version.Major, version.Minor), t)
	PrintAndLog(fmt.Sprintf("API Server GitVersion: %s\n", version.GitVersion), t)
}

// assertEKSConfigMapReady ensures that the EKS aws-auth ConfigMap
// exists and has data.
func assertEKSConfigMapReady(t *testing.T, clientset *kubernetes.Clientset) {
	awsAuthReady, retries := false, MaxRetries
	configMapName, namespace := "aws-auth", "kube-system"
	var awsAuth *corev1.ConfigMap
	var err error

	// Attempt to validate that the aws-auth ConfigMap exists.
	for !awsAuthReady && retries > 0 {
		awsAuth, err = clientset.CoreV1().ConfigMaps(namespace).Get(context.TODO(), configMapName, metav1.GetOptions{})
		retries--
		if err != nil {
			waitFor(t, fmt.Sprintf("ConfigMap %q", configMapName), "returned")
			continue
		}
		awsAuthReady = true
		break
	}

	require.Equal(t, true, awsAuthReady, "EKS ConfigMap %q does not exist in namespace %q", configMapName, namespace)
	require.NotNil(t, awsAuth.Data, "%s ConfigMap should not be nil", configMapName)
	require.NotEmpty(t, awsAuth.Data, "%q ConfigMap should not be empty", configMapName)
	PrintAndLog(fmt.Sprintf("EKS ConfigMap %q exists and has data\n", configMapName), t)
}

// assertEKSConfigMapRemoved is a helper function that asserts the removal of the aws-auth ConfigMap in the kube-system namespace.
// The function attempts to validate that the aws-auth ConfigMap exists and waits for it to be deleted.
// If the ConfigMap is still found after the maximum number of retries, the function fails the test.
func assertEKSConfigMapRemoved(t *testing.T, clientset *kubernetes.Clientset) {
	awsAuthExists, retries := true, MaxRetries
	configMapName, namespace := "aws-auth", "kube-system"
	var awsAuth *corev1.ConfigMap
	var err error

	// Attempt to validate that the aws-auth ConfigMap exists.
	for awsAuthExists && retries > 0 {
		awsAuth, err = clientset.CoreV1().ConfigMaps(namespace).Get(context.TODO(), configMapName, metav1.GetOptions{})
		retries--
		if err == nil {
			waitFor(t, fmt.Sprintf("ConfigMap %q", configMapName), "deleted")
			continue
		}
		awsAuthExists = false
	}

	require.Equal(t, false, awsAuthExists, "EKS ConfigMap %q still exists in namespace %q", configMapName, namespace)
	require.Nil(t, awsAuth.Data, "%s ConfigMap should be nil", configMapName)
	PrintAndLog(fmt.Sprintf("EKS ConfigMap %q has been deleted\n", configMapName), t)
}

// AssertAllNodesReady ensures that all Nodes are running & have a "Ready"
// status condition.
func AssertAllNodesReady(t *testing.T, clientset *kubernetes.Clientset, desiredNodeCount int) {
	var nodes *corev1.NodeList
	var err error

	PrintAndLog(fmt.Sprintf("Total Desired Worker Node Count: %d\n", desiredNodeCount), t)

	// Skip this validation if no NodeGroups are attached
	if desiredNodeCount == 0 {
		return
	}

	// Attempt to validate that the total desired worker Node count of
	// instances are up & running.
	for i := 0; i < MaxRetries; i++ {
		nodes, err = clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			waitFor(t, "list of all Nodes", fmt.Sprintf("returned: %s", err))
			continue
		}
		if desiredNodeCount == len(nodes.Items) {
			break
		} else {
			waitFor(t, fmt.Sprintf("desired worker Node count of (%d) instances", desiredNodeCount), "running")
		}
	}

	// Require that the Nodes returned are not empty & match the
	// desiredNodeCount.
	require.NotEmpty(t, nodes, "The Nodes list returned should not be empty")
	require.Equal(t, desiredNodeCount, len(nodes.Items),
		"%d out of %d desired worker Nodes are instantiated and running", len(nodes.Items), desiredNodeCount)

	// Attempt to validate each Node has a "Ready" status.
	var readyCount int
	for _, node := range nodes.Items {
		nodeReady := false
		// Attempt to check if a Node is ready, and output the resulting status.
		for i := 0; i < MaxRetries; i++ {
			ready, nodePtr := IsNodeReady(t, clientset, &node)
			if nodePtr != nil {
				node = *nodePtr
			}
			if ready {
				nodeReady = true
				readyCount++
				break
			} else {
				waitFor(t, fmt.Sprintf("Node %q", node.GetName()), "ready")
			}
		}
		if nodeReady {
			PrintAndLog(fmt.Sprintf("Node: %s | Ready Status: %t\n", node.Name, nodeReady), t)
		} else {
			pretty, err := json.MarshalIndent(node, "", "  ")
			if err != nil {
				PrintAndLog("Error: failed to marshal Node object to json", t)
			}
			PrintAndLog(fmt.Sprintf("Node: %s | Ready Status: %t | Node Object: %s\n", node.Name, nodeReady, pretty), t)

		}
	}

	// Require that the readyCount matches the desiredNodeCount / total Nodes.
	require.Equal(t, len(nodes.Items), readyCount,
		"%d out of %d Nodes are ready", readyCount, len(nodes.Items))

	// Output the overall ready status.
	PrintAndLog(fmt.Sprintf("%d out of %d Nodes are ready\n", readyCount, len(nodes.Items)), t)
}

// AssertKindInAllNamespacesReady ensures all Deployments have valid & ready status
// conditions.
func AssertKindInAllNamespacesReady(t *testing.T, clientset *kubernetes.Clientset, objType string) {
	var list runtime.Object
	var err error

	// Assume first non-error return of list is correct & complete,
	// as we currently do not have a way of knowing ahead of time how many
	// total to expect in each cluster before it is up and running.
RetryLoop:
	for i := 0; i < MaxRetries; i++ {
		switch n := strings.ToLower(objType); {
		case n == "deployments" || n == "deployment" || n == "deploy":
			list, err = clientset.AppsV1().Deployments("").List(context.TODO(), metav1.ListOptions{})
			if err == nil {
				break RetryLoop
			}
			waitFor(t, "Deployments list", fmt.Sprintf("returned: %s", err))
		case n == "replicasets" || n == "replicaset" || n == "rs":
			list, err = clientset.AppsV1().ReplicaSets("").List(context.TODO(), metav1.ListOptions{})
			if err == nil {
				break RetryLoop
			}
			waitFor(t, "ReplicaSets list", fmt.Sprintf("returned: %s", err))
		case n == "pods" || n == "pod" || n == "po":
			list, err = clientset.CoreV1().Pods("").List(context.TODO(), metav1.ListOptions{})
			if err == nil {
				break RetryLoop
			}
			waitFor(t, "Pods list", fmt.Sprintf("returned: %s", err))
		default:
			t.Fatalf("Unknown kind type: %s", objType)
		}
	}

	// Require that the list returned is not empty.
	require.NotEmpty(t, list, "The kind list returned should not be empty")
	AssertKindListIsReady(t, clientset, list)
}

// AssertKindListIsReady verifies that each item in a given resource list is
// marked as ready.
func AssertKindListIsReady(t *testing.T, clientset *kubernetes.Clientset, list runtime.Object) {
	if !meta.IsListType(list) {
		t.Errorf("Expected a list, but got %T", list)
	}

	var readyCount atomic.Int64
	var totalItems int
	var wg sync.WaitGroup
	var objType string

	err := meta.EachListItem(list, func(obj runtime.Object) error {
		// Note: we cannout use item.GetObjectKind().GroupVersionKind().Kind to get the object type
		// as List objects return an empty GVK. We set the objType in the switch statement below as
		// a workaround instead of using runtime.Scheme.ObjectKinds() which requires registering
		// a Kubernetes scheme.
		// See: https://github.com/kubernetes/kubernetes/issues/3030
		objName := obj.(metav1.Object).GetName()
		if objName == "" {
			return fmt.Errorf("object name is empty for object: %+v", obj)
		}

		wg.Add(1)
		totalItems++
		go func() { // Fan-out goroutine to check each item in the list concurrently.
			defer wg.Done()

			var ready bool
			for i := 0; i < MaxRetries; i++ {
				var liveObj runtime.Object
				switch item := obj.(type) {
				case *appsv1.Deployment:
					ready, liveObj = IsDeploymentReady(t, clientset, item)
					objType = "Deployment"
				case *appsv1.ReplicaSet:
					ready, liveObj = IsReplicaSetReady(t, clientset, item)
					objType = "ReplicaSet"
				case *corev1.Pod:
					ready, liveObj = IsPodReady(t, clientset, item)
					objType = "Pod"
				}

				if ready {
					readyCount.Add(1)
					break
				}
				if liveObj != nil {
					obj = liveObj
				}

				waitFor(t, fmt.Sprintf("%s %q", objType, objName), "ready")
			}

			if ready {
				PrintAndLog(fmt.Sprintf("%s: %s | Ready Status: %t\n", objType, objName, ready), t)
			} else {
				pretty, err := json.MarshalIndent(obj, "", "  ")
				if err != nil {
					PrintAndLog("Error: failed to marshal Kubernetes object to json", t)
				}
				PrintAndLog(fmt.Sprintf("%s: %s | Ready Status: %t| k8s Object: %s\n", objType, objName, ready, pretty), t)

			}
		}()

		return nil
	})

	require.NoError(t, err)

	wg.Wait() // Wait until all fan-out goroutine checks are done.

	require.NotEqual(t, 0, totalItems, fmt.Sprintf("List of %s contains no items", objType))
	require.NotEqual(t, 0, readyCount.Load(), fmt.Sprintf("No %ss are ready", objType))
	require.Equal(t, totalItems, int(readyCount.Load()), fmt.Sprintf("%d out of %d %ss are ready", readyCount.Load(), totalItems, objType))
	PrintAndLog(fmt.Sprintf("%d out of %d %ss are ready\n", readyCount.Load(), totalItems, objType), t)
}

// waitFor is a helper func that prints to stdout & sleeps to indicate a
// wait & retry on a given resource, with an expected status.
func waitFor(t *testing.T, resource, status string) {
	t.Logf("Waiting for %s to be %s. Retrying...\n", resource, status)
	time.Sleep(RetryInterval * time.Second)
}

// PrintAndLog is a helper fucn that prints a string to stdout,
// and logs it to the testing logs.
func PrintAndLog(s string, t *testing.T) {
	t.Logf("%s", s)
}

// IsNodeReady attempts to check if the Node status condition is ready.
func IsNodeReady(t *testing.T, clientset *kubernetes.Clientset, node *corev1.Node) (bool, *corev1.Node) {
	// Attempt to retrieve Node.
	o, err := clientset.CoreV1().Nodes().Get(context.TODO(), node.Name, metav1.GetOptions{})
	if err != nil {
		return false, nil
	}

	// Check the returned Node's conditions for readiness.
	for _, condition := range o.Status.Conditions {
		if condition.Type == corev1.NodeReady {
			t.Logf("Checking if Node %q is Ready | Condition.Status: %q | Condition: %v\n", node.Name, condition.Status, condition)
			return condition.Status == corev1.ConditionTrue, o
		}
	}

	return false, o
}

// IsPodReady attempts to check if the Pod's status & condition is ready.
func IsPodReady(t *testing.T, clientset *kubernetes.Clientset, pod metav1.Object) (bool, runtime.Object) {
	// Attempt to retrieve Pod.
	o, err := clientset.CoreV1().Pods(pod.GetNamespace()).Get(context.TODO(), pod.GetName(), metav1.GetOptions{})
	if err != nil {
		return false, nil
	}

	// Check the returned Pod's status & conditions for readiness.
	if o.Status.Phase == corev1.PodRunning || o.Status.Phase == corev1.PodSucceeded {
		for _, condition := range o.Status.Conditions {
			if condition.Type == corev1.PodReady {
				t.Logf("Checking if Pod %q is Ready | Condition.Status: %q | Condition.Reason: %q | Condition: %v\n", pod.GetName(), condition.Status, condition.Reason, condition)
				if o.Status.Phase == corev1.PodSucceeded {
					return true, o
				}
				return condition.Status == corev1.ConditionTrue, o
			}
		}
	}

	return false, o
}

type VpcCniValidation struct {
	Kubeconfig interface{}
	ExpectedAddonVersion string
	ClusterName string
	ExpectedInitEnvVars map[string]string
	ExpectedEnvVars map[string]string
	SecurityContextPrivileged *bool
	NetworkPoliciesEnabled *bool
}

func ValidateVpcCni(t *testing.T, eksClient *eks.Client, args VpcCniValidation) {
	assert.NoError(t, ValidateDaemonSet(t, args.Kubeconfig, "kube-system", "aws-node", func(ds *appsv1.DaemonSet) {
		var initContainerFound bool
		for _, ic := range ds.Spec.Template.Spec.InitContainers {
			if ic.Name != "aws-vpc-cni-init" {
				continue
			}

			initContainerFound = true

			validateEnvVariables(t, ic, args.ExpectedInitEnvVars)
		}
		assert.True(t, initContainerFound)

		var awsNodeContainerFound bool
		var awsNodeAgentContainerFound bool
		for _, c := range ds.Spec.Template.Spec.Containers {
			switch c.Name {
			case "aws-node":
				awsNodeContainerFound = true
				validateEnvVariables(t, c, args.ExpectedEnvVars)
				if args.SecurityContextPrivileged != nil {
					assert.NotNil(t, c.SecurityContext, "expected SecurityContext to be set")
					assert.NotNil(t, c.SecurityContext.Privileged, "expected SecurityContext.Privileged to be set")
					assert.Equal(t, *args.SecurityContextPrivileged, *c.SecurityContext.Privileged, "expected privileged security context for aws-node container to be %t", *args.SecurityContextPrivileged)
				}
			case "aws-eks-nodeagent":
				awsNodeAgentContainerFound = true
				if args.NetworkPoliciesEnabled != nil {
					assert.NotNil(t, c.Args, "expected args to be set for aws-eks-nodeagent container")
					assert.Contains(t, c.Args, fmt.Sprintf("--enable-network-policy=%t", *args.NetworkPoliciesEnabled), fmt.Sprintf("expected --enable-network-policy to be set to %t", *args.NetworkPoliciesEnabled))
				}
			}
		}
		assert.True(t, awsNodeContainerFound)
		assert.True(t, awsNodeAgentContainerFound)
	}))

	addon, err := GetInstalledAddon(t, eksClient, args.ClusterName, "vpc-cni")
	require.NoError(t, err)

	assert.Equal(t, args.ExpectedAddonVersion, *addon.AddonVersion, "expected vpc-cni version to be %s", args.ExpectedAddonVersion)
}

func validateEnvVariables(t *testing.T, container corev1.Container, expectedEnvVars map[string]string) {
	if len(expectedEnvVars) == 0 {
		return
	}

	setEnvVars := make(map[string]bool)
	for name := range expectedEnvVars {
		setEnvVars[name] = false
	}

	for _, env := range container.Env {
		if _, ok := expectedEnvVars[env.Name]; ok {
			setEnvVars[env.Name] = true
			assert.Equal(t, expectedEnvVars[env.Name], env.Value, "expected env %s of container %s to be %s", env.Name, container.Name, expectedEnvVars)
		}
	}

	for env, set := range setEnvVars {
		assert.True(t, set, "expected env %s to be set", env)
	}
}

func ValidateDaemonSet(t *testing.T, kubeconfig interface{}, namespace, name string, validateFn func(*appsv1.DaemonSet)) error {
	clientSet, err := clientSetFromKubeconfig(kubeconfig)
	if err != nil {
		return err
	}

	var ds *appsv1.DaemonSet
	ready := false
	for i := 0; i < MaxRetries; i++ {
		ds, ready = IsDaemonSetReady(t, clientSet, namespace, name)
		if ready {
			break
		} else {
			waitFor(t, fmt.Sprintf("Daemonset %s/%s", namespace, name), "ready")
		}
	}

	if !ready {
		return fmt.Errorf("daemonset wasn't ready in time")
	}

	validateFn(ds)
	return nil
}

func IsDaemonSetReady(t *testing.T, clientset *kubernetes.Clientset, namespace, name string) (*appsv1.DaemonSet, bool) {
	// Attempt to retrieve Deployment.
	o, err := clientset.AppsV1().DaemonSets(namespace).Get(context.TODO(), name, metav1.GetOptions{})
	if err != nil {
		return nil, false
	}

	return o, o.Status.DesiredNumberScheduled == o.Status.NumberReady
}

// IsDeploymentReady attempts to check if the Deployments's status conditions
// are ready.
func IsDeploymentReady(t *testing.T, clientset *kubernetes.Clientset, deployment metav1.Object) (bool, runtime.Object) {
	// Attempt to retrieve Deployment.
	o, err := clientset.AppsV1().Deployments(deployment.GetNamespace()).Get(context.TODO(), deployment.GetName(), metav1.GetOptions{})
	if err != nil {
		return false, nil
	}

	// Check the returned Deployment's status & conditions for readiness.
	for _, condition := range o.Status.Conditions {
		if condition.Type == appsv1.DeploymentAvailable {
			t.Logf("Checking if Deployment %q is Available | Condition.Status: %q | Condition: %v\n", deployment.GetName(), condition.Status, condition)
			return condition.Status == corev1.ConditionTrue, o
		}
	}

	return false, o
}

// IsReplicaSetReady attempts to check if the ReplicaSets's status conditions
// are ready.
func IsReplicaSetReady(t *testing.T, clientset *kubernetes.Clientset, replicaSet metav1.Object) (bool, runtime.Object) {
	// Attempt to retrieve ReplicaSet.
	o, err := clientset.AppsV1().ReplicaSets(replicaSet.GetNamespace()).Get(context.TODO(), replicaSet.GetName(), metav1.GetOptions{})
	if err != nil {
		return false, nil
	}

	// Check the returned ReplicaSet's status conditions for readiness.
	for _, condition := range o.Status.Conditions {
		if condition.Type == appsv1.ReplicaSetReplicaFailure {
			return false, o
		}
	}
	if o.Status.Replicas == o.Status.AvailableReplicas &&
		o.Status.Replicas == o.Status.ReadyReplicas {
		return true, o
	}
	return false, o
}

// IsKubeconfigValid checks that the kubeconfig provided is valid and error-free.
func IsKubeconfigValid(kubeconfig []byte) error {
	// Create a ClientConfig to confirm & validate that the kubeconfig provided is valid
	clientConfig, err := clientcmd.NewClientConfigFromBytes(kubeconfig)
	if err != nil {
		return err
	}

	// Get the raw ClientConfig API Config
	rawConfig, err := clientConfig.RawConfig()
	if err != nil {
		return err
	}

	// Confirms there are no errors or conflicts in the cliendcmd config.
	err = clientcmd.Validate(rawConfig)
	if err != nil {
		return err
	}

	return nil
}

// KubeAccess holds the Kubernetes client-go client bag of tools to work with the
// APIServer: the RESTConfig, and Clientset for the various API groups.
type KubeAccess struct {
	RESTConfig *restclient.Config
	Clientset  *kubernetes.Clientset
}

// KubeconfigToKubeAccess creates a KubeAccess object from a serialized kubeconfig.
func KubeconfigToKubeAccess(kubeconfig []byte) (*KubeAccess, error) {
	if err := IsKubeconfigValid(kubeconfig); err != nil {
		return nil, err
	}

	// Create a REST config that uses the current context in the kubeconfig.
	restConfig, err := clientcmd.RESTConfigFromKubeConfig(kubeconfig)
	if err != nil {
		return nil, err
	}

	// Create the Clientset using the REST config
	clientset, err := kubernetes.NewForConfig(restConfig)
	if err != nil {
		return nil, err
	}

	return &KubeAccess{
		restConfig,
		clientset,
	}, nil
}

// clusterKubeAccessMap implements a map of Kubernetes cluster names to their
// respective KubeAccess bag.
type clusterKubeAccessMap map[string]*KubeAccess

// mapClusterToKubeAccess creates a map of the EKS cluster name to its
// KubeAccess client tool bag, based on the kubeconfigs.
func mapClusterToKubeAccess(kubeconfigs ...interface{}) (clusterKubeAccessMap, error) {
	// Map EKS cluster names to its KubeAccess.
	clusterToKubeAccess := make(clusterKubeAccessMap)
	for _, kubeconfig := range kubeconfigs {
		var kc []byte

		switch v := kubeconfig.(type) {
		case string:
			kc = []byte(v)
		default:
			var err error
			kc, err = json.Marshal(kubeconfig)
			if err != nil {
				return nil, err
			}
		}

		kubeAccess, err := KubeconfigToKubeAccess(kc)
		if err != nil {
			return nil, err
		}

		// Parse the kubeconfig user auth exec args for the cluster name.
		var clusterNameIndex int
		for idx, arg := range kubeAccess.RESTConfig.ExecProvider.Args {
			if arg == "--cluster-name" {
				clusterNameIndex = idx + 1
			}
		}

		if clusterNameIndex >= len(kubeAccess.RESTConfig.ExecProvider.Args) {
			return nil, fmt.Errorf("cluster name not found in kubeconfig exec provider args")
		}

		clusterName := kubeAccess.RESTConfig.ExecProvider.Args[clusterNameIndex]
		clusterToKubeAccess[clusterName] = kubeAccess
	}

	return clusterToKubeAccess, nil
}

// clusterNodeCountMap implements a map of Kubernetes cluster names to their authentication mode.
type clusterAuthenticationModeMap map[string]string

func mapClusterToAuthenticationMode(resources []apitype.ResourceV3) (clusterAuthenticationModeMap, error) {
	clusterToAuthenticationMode := make(clusterAuthenticationModeMap)

	for _, res := range resources {
		if res.Type.String() == "aws:eks/cluster:Cluster" {
			clusterName := res.Outputs["name"].(string)

			var authenticationMode string
			if ac, ok := res.Inputs["accessConfig"]; ok {
				if accessConfig, ok := ac.(map[string]interface{}); ok {
					if authMode, ok := accessConfig["authenticationMode"]; ok {
						authenticationMode = authMode.(string)
					}
				}
			}

			if authenticationMode == "" {
				// EKS defaults to "CONFIG_MAP" if not specified.
				authenticationMode = "CONFIG_MAP"
			}

			clusterToAuthenticationMode[clusterName] = authenticationMode
		}
	}

	return clusterToAuthenticationMode, nil
}

type cloudFormationTemplateBody struct {
	Resources struct {
		NodeGroup struct {
			Properties struct {
				DesiredCapacity int                 `yaml:"DesiredCapacity"`
				Tags            []map[string]string `yaml:"Tags"`
			} `yaml:"Properties"`
		} `yaml:"NodeGroup"`
	} `yaml:"Resources"`
}

// clusterNodeCountMap implements a map of Kubernetes cluster names to their
// respective total desired worker Node count for *all* NodeGroups.
type clusterNodeCountMap map[string]int

// mapClusterToNodeCount iterates through all Pulumi stack resources
// looking for CloudFormation template bodies to extract, and aggregate
// the total desired worker Node count per cluster in the Pulumi stack resources.
//
// Note: There can be many CF template bodies if multiple NodeGroups are used,
// but all NodeGroups belonging to the same cluster get their desired Node count
// aggregated into a total per cluster.
func mapClusterToNodeCount(resources []apitype.ResourceV3) (clusterNodeCountMap, error) {
	clusterToNodeCount := make(clusterNodeCountMap)

	// Map cluster to its NodeGroups.
	cfnPrefix := "arn:aws:cloudformation"      // self-managed CF-based node groups
	ngPrefix := "aws:eks/nodeGroup:NodeGroup"  // AWS managed node groups
	ng2Prefix := "aws:autoscaling/group:Group" // self-managed ASG-based node groups

	for _, res := range resources {
		if strings.HasPrefix(res.ID.String(), cfnPrefix) {
			var templateBody cloudFormationTemplateBody
			body := res.Outputs["templateBody"].(string)
			err := yaml.Unmarshal([]byte(body), &templateBody)
			if err != nil {
				return nil, err
			}

			// Find the CF "Name" tag to extract the cluster name.
			tags := templateBody.Resources.NodeGroup.Properties.Tags
			nameTag := ""
			for _, tag := range tags {
				if tag["Key"] == "Name" {
					nameTag = tag["Value"]
				}
			}
			clusterName := strings.Split(nameTag, "-worker")[0]

			// Update map of cluster name to total desired Node count.
			clusterToNodeCount[clusterName] =
				clusterToNodeCount[clusterName] +
					templateBody.Resources.NodeGroup.Properties.DesiredCapacity
		} else if res.Type.String() == ngPrefix {
			// Extract the cluster name.
			nodegroup := res.Inputs
			clusterName := nodegroup["clusterName"].(string)
			// Extract the desired size.
			scalingConfig := nodegroup["scalingConfig"].(map[string]interface{})
			desiredSize := int(scalingConfig["desiredSize"].(float64))
			// Update map of cluster name to total desired Node count.
			clusterToNodeCount[clusterName] =
				clusterToNodeCount[clusterName] + desiredSize
		} else if res.Type.String() == ng2Prefix {
			asg := res.Outputs
			nameTag := ""
			// Find the correct Name tag within the returned array.
			for _, t := range asg["tags"].([]interface{}) {
				m := t.(map[string]interface{})
				key := m["key"]
				if key == "Name" {
					nameTag = m["value"].(string)
				}
			}

			// Extract the cluster name.
			clusterName := strings.Split(nameTag, "-worker")[0]
			desiredSize := int(asg["desiredCapacity"].(float64))
			// Update map of cluster name to total desired Node count.
			clusterToNodeCount[clusterName] =
				clusterToNodeCount[clusterName] + desiredSize
		}
	}

	return clusterToNodeCount, nil
}

// ValidateNodes validates the nodes in a cluster contain the expected values.
func ValidateNodes(t *testing.T, kubeconfig any, validateFn func(*corev1.NodeList)) error {
	clientSet, err := clientSetFromKubeconfig(kubeconfig)
	if err != nil {
		return err
	}

	nodes, err := clientSet.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return err
	}

	validateFn(nodes)

	return nil
}

// ValidateNodePodCapacity validates the pod capacity of certain nodes.
// It checks if the number of nodes with a specific label matches the expected number,
// and if the pod capacity of each of those nodes matches the expected pod capacity.
func ValidateNodePodCapacity(t *testing.T, kubeconfig any, expectedNodes int, expectedCapacity int64, nodeLabel string) error {
	return ValidateNodes(t, kubeconfig, func(nodes *corev1.NodeList) {
		require.NotNil(t, nodes)
		assert.NotEmpty(t, nodes.Items)

		var foundNodes = 0
		for _, node := range nodes.Items {
			if label, ok := node.Labels[nodeLabel]; !ok || label != "true" {
				continue
			} else {
				foundNodes++
			}

			podCapacity := node.Status.Capacity[corev1.ResourcePods]
			assert.True(t, podCapacity.CmpInt64(expectedCapacity) == 0)
		}
		assert.Equal(t, expectedNodes, foundNodes, "Expected number of nodes with label %s", nodeLabel)
	})
}

// ValidateNodeStorage validates the storage capacity of certain nodes.
// It checks if the number of nodes with a specific label matches the expected number,
// and if the pod capacity of each of those nodes matches the expected storage capacity.
func ValidateNodeStorage(t *testing.T, kubeconfig any, expectedNodes int, expectedCapacity int64, nodeLabel string) error {
	return ValidateNodes(t, kubeconfig, func(nodes *corev1.NodeList) {
		require.NotNil(t, nodes)
		assert.NotEmpty(t, nodes.Items)

		var foundNodes = 0
		for _, node := range nodes.Items {
			if label, ok := node.Labels[nodeLabel]; !ok || label != "true" {
				continue
			} else {
				foundNodes++
			}

			podCapacity := node.Status.Capacity[corev1.ResourceEphemeralStorage]
			assert.True(t, podCapacity.CmpInt64(expectedCapacity) >= 0)
		}
		assert.Equal(t, expectedNodes, foundNodes, "Expected number of nodes with label %s", nodeLabel)
	})
}

func clientSetFromKubeconfig(kubeconfig any) (*kubernetes.Clientset, error) {
	clusterMap, err := mapClusterToKubeAccess(kubeconfig)
	if err != nil {
		return nil, err
	}
	if len(clusterMap) == 0 {
		return nil, fmt.Errorf("missing cluster kubeconfig")
	}

	var clientSet *kubernetes.Clientset
	for _, kubeAccess := range clusterMap {
		clientSet = kubeAccess.Clientset
	}
	return clientSet, nil
}

// EnsureKubeconfigFails ensures that the provided kubeconfig fails to authenticate.
func EnsureKubeconfigFails(t *testing.T, kubeconfig any) {
	kc, err := json.Marshal(kubeconfig)
	if err != nil {
		t.Errorf("unable to marshal provided kubeconfig: %s", err)
	}
	kubeAccess, err := KubeconfigToKubeAccess(kc)
	if err != nil {
		t.Errorf("unable to create KubeAccess from kubeconfig: %s", err)
	}

	_, err = kubeAccess.Clientset.Discovery().ServerVersion()
	if err == nil {
		t.Errorf("expected kubeconfig to fail, but it succeeded to return the server version")
	}
}

type addonInfo struct {
	AddonVersion string
	ClusterVersion string
}

func FindDefaultAddonVersion(eksClient *eks.Client, addonName string) (string, error) {
	addon, err := findAddonVersion(eksClient, addonName, func (currentAddon *addonInfo, versionInfo eksTypes.AddonVersionInfo, compatibility eksTypes.Compatibility) *addonInfo {
		if compatibility.DefaultVersion && versionInfo.AddonVersion != nil && compatibility.ClusterVersion != nil {
			if currentAddon == nil || semver.Compare(currentAddon.ClusterVersion, *compatibility.ClusterVersion) < 0 {
				return &addonInfo{
					AddonVersion: *versionInfo.AddonVersion,
					ClusterVersion: *compatibility.ClusterVersion,
				}
			}
		}
		return currentAddon
	})

	if err != nil {
		return "", err
	}

	if addon == nil {
		return "", fmt.Errorf("unable to find newest default version of addon %s", addonName)
	}

	return addon.AddonVersion, nil
}

func FindMostRecentAddonVersion(eksClient *eks.Client, addonName string) (string, error) {
	addon, err := findAddonVersion(eksClient, addonName, func (currentAddon *addonInfo, versionInfo eksTypes.AddonVersionInfo, compatibility eksTypes.Compatibility) *addonInfo {
		if currentAddon == nil || semver.Compare(currentAddon.AddonVersion, *versionInfo.AddonVersion) < 0 {
			return &addonInfo{
				AddonVersion: *versionInfo.AddonVersion,
			}
		}
		return currentAddon
	})

	if err != nil {
		return "", err
	}

	if addon == nil {
		return "", fmt.Errorf("unable to find most recent version of addon %s", addonName)
	}

	return addon.AddonVersion, nil
}

func findAddonVersion(eksClient *eks.Client, addonName string, selector func (currentAddon *addonInfo, versionInfo eksTypes.AddonVersionInfo, compatibility eksTypes.Compatibility) *addonInfo) (*addonInfo, error) {
	input := &eks.DescribeAddonVersionsInput{
		AddonName:         aws.String(addonName),
	}

	var currentAddon *addonInfo

	pages := eks.NewDescribeAddonVersionsPaginator(eksClient, input)
	for pages.HasMorePages() {
		page, err := pages.NextPage(context.TODO())

		if err != nil {
			return nil, err
		}

		for _, addon := range page.Addons {
			for _, versionInfo := range addon.AddonVersions {
				for _, compatibility := range versionInfo.Compatibilities {
					currentAddon = selector(currentAddon, versionInfo, compatibility)
				}
			}
		}
	}

	return currentAddon, nil
}

func GetInstalledAddon(t *testing.T, eksClient *eks.Client, clusterName, addonName string) (*eksTypes.Addon, error) {
	resp, err := eksClient.DescribeAddon(context.TODO(), &eks.DescribeAddonInput{
		ClusterName: aws.String(clusterName),
		AddonName:   aws.String(addonName),
	})
	if err != nil {
		return nil, err
	}

	return resp.Addon, nil
}
