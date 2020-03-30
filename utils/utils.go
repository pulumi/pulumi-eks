package utils

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/pulumi/pulumi/sdk/go/common/apitype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gopkg.in/yaml.v2"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	restclient "k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

// Each resource request will be fetched from the Kubernetes API Server at a
// max of 20 retries, with 15 seconds in between each attempt.
// This creates a max wait time of upto 5 minutes that a resource request
// must successfully return within, before moving on.

// MaxRetries is the maximum number of retries that a resource will be
// attempted to be fetched from the Kubernetes API Server.
const MaxRetries = 40

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

	// Run the smoke test against each cluster, expecting the total desired
	// Node count.
	for clusterName := range kubeAccess {
		PrintAndLog(fmt.Sprintf("Testing Cluster: %s\n", clusterName), t)
		clientset := kubeAccess[clusterName].Clientset
		eksSmokeTest(t, clientset, clusterNodeCount[clusterName])
	}
}

// EKSSmokeTest runs a checklist of operational successes required to deem the
// EKS cluster as successfully running and ready for use.
func eksSmokeTest(t *testing.T, clientset *kubernetes.Clientset, desiredNodeCount int) {
	APIServerVersionInfo(t, clientset)

	// Run all tests.
	assertEKSConfigMapReady(t, clientset)
	AssertAllNodesReady(t, clientset, desiredNodeCount)
	AssertKindInAllNamespacesReady(t, clientset, "pods")
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
		awsAuth, err = clientset.CoreV1().ConfigMaps(namespace).Get(configMapName, metav1.GetOptions{})
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
		nodes, err = clientset.CoreV1().Nodes().List(metav1.ListOptions{})
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
			if ready := IsNodeReady(t, clientset, &node); ready {
				nodeReady = true
				readyCount++
				break
			} else {
				waitFor(t, fmt.Sprintf("Node %q", node.Name), "ready")
			}
		}
		PrintAndLog(fmt.Sprintf("Node: %s | Ready Status: %t\n", node.Name, nodeReady), t)
	}

	// Require that the readyCount matches the desiredNodeCount / total Nodes.
	require.Equal(t, readyCount, len(nodes.Items),
		"%d out of %d Nodes are ready", readyCount, len(nodes.Items))

	// Output the overall ready status.
	PrintAndLog(fmt.Sprintf("%d out of %d Nodes are ready\n", readyCount, len(nodes.Items)), t)
}

// AssertKindInAllNamespacesReady ensures all Deployments have valid & ready status
// conditions.
func AssertKindInAllNamespacesReady(t *testing.T, clientset *kubernetes.Clientset, name string) {
	var list interface{}
	var err error

	// Assume first non-error return of list is correct & complete,
	// as we currently do not have a way of knowing ahead of time how many
	// total to expect in each cluster before it is up and running.
	for i := 0; i < MaxRetries; i++ {
		switch n := strings.ToLower(name); {
		case n == "deployments" || n == "deployment" || n == "deploy":
			list, err = clientset.AppsV1().Deployments("").List(metav1.ListOptions{})
			if err != nil {
				waitFor(t, "Deployments list", fmt.Sprintf("returned: %s", err))
			} else {
				break
			}
		case n == "replicasets" || n == "replicaset" || n == "rs":
			list, err = clientset.AppsV1().ReplicaSets("").List(metav1.ListOptions{})
			if err != nil {
				waitFor(t, "ReplicaSets list", fmt.Sprintf("returned: %s", err))
			} else {
				break
			}
		case n == "pods" || n == "pod" || n == "po":
			list, err = clientset.CoreV1().Pods("").List(metav1.ListOptions{})
			if err != nil {
				waitFor(t, "Pods list", fmt.Sprintf("returned: %s", err))
			} else {
				break
			}
		}
	}

	// Require that the list returned is not empty.
	require.NotEmpty(t, list, "The kind list returned should not be empty")
	AssertKindListIsReady(t, clientset, list)
}

// AssertKindListIsReady verifies that each item in a given resource list is
// marked as ready.
func AssertKindListIsReady(t *testing.T, clientset *kubernetes.Clientset, list interface{}) {
	var readyCount int
	var listLength int

	// Attempt to validate each list item has a "Ready" status.
	switch list.(type) {
	case *appsv1.DeploymentList:
		items := list.(*appsv1.DeploymentList).Items
		listLength = len(items)
		for _, item := range items {
			ready := false
			// Attempt to check if ready, and output the resulting status.
			for i := 0; i < MaxRetries; i++ {
				if IsDeploymentReady(t, clientset, &item) {
					ready = true
					readyCount++
					break
				} else {
					waitFor(t, fmt.Sprintf("Deployment %q", item.Name), "ready")
				}
			}
			PrintAndLog(fmt.Sprintf("Deployment: %s | Ready Status: %t\n", item.Name, ready), t)
		}

		// Validate that the readyCount is not 0, and matches the total Deployments
		// returned.
		require.NotEqual(t, readyCount, 0, "No Deployments are ready")
		require.Equal(t, readyCount, listLength,
			"%d out of %d Deployments are ready", readyCount, listLength)

		PrintAndLog(fmt.Sprintf("%d out of %d Deployments are ready\n", readyCount, listLength), t)
	case *appsv1.ReplicaSetList:
		items := list.(*appsv1.ReplicaSetList).Items
		listLength = len(items)
		for _, item := range items {
			ready := false
			// Attempt to check if ready, and output the resulting status.
			for i := 0; i < MaxRetries; i++ {
				if IsReplicaSetReady(t, clientset, &item) {
					ready = true
					readyCount++
					break
				} else {
					waitFor(t, fmt.Sprintf("ReplicaSet %q", item.Name), "ready")
				}
			}
			PrintAndLog(fmt.Sprintf("ReplicaSet: %s | Ready Status: %t\n", item.Name, ready), t)
		}

		// Validate that the readyCount is not 0, and matches the total ReplicaSets
		// returned.
		require.NotEqual(t, readyCount, 0, "No ReplicaSets are ready")
		require.Equal(t, readyCount, listLength,
			"%d out of %d ReplicaSets are ready", readyCount, listLength)

		PrintAndLog(fmt.Sprintf("%d out of %d ReplicaSets are ready\n", readyCount, listLength), t)
	case *corev1.PodList:
		items := list.(*corev1.PodList).Items
		listLength = len(items)
		for _, item := range items {
			ready := false
			// Attempt to check if ready, and output the resulting status.
			for i := 0; i < MaxRetries; i++ {
				if IsPodReady(t, clientset, &item) {
					ready = true
					readyCount++
					break
				} else {
					waitFor(t, fmt.Sprintf("Pod %q", item.Name), "ready")
				}
			}
			PrintAndLog(fmt.Sprintf("Pod: %s | Ready Status: %t\n", item.Name, ready), t)
		}

		// Validate that the readyCount is not 0, and matches the total Deployments
		// returned.
		require.NotEqual(t, readyCount, 0, "No Pods are ready")
		require.Equal(t, readyCount, listLength,
			"%d out of %d Pods are ready", readyCount, listLength)

		PrintAndLog(fmt.Sprintf("%d out of %d Pods are ready\n", readyCount, listLength), t)
	}
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
func IsNodeReady(t *testing.T, clientset *kubernetes.Clientset, node *corev1.Node) bool {
	// Attempt to retrieve Node.
	o, err := clientset.CoreV1().Nodes().Get(node.Name, metav1.GetOptions{})
	if err != nil {
		return false
	}

	// Check the returned Node's conditions for readiness.
	for _, condition := range o.Status.Conditions {
		if condition.Type == corev1.NodeReady {
			t.Logf("Checking if Node %q is Ready | Condition.Status: %q | Condition: %v\n", node.Name, condition.Status, condition)
			return condition.Status == corev1.ConditionTrue
		}
	}

	return false
}

// IsPodReady attempts to check if the Pod's status & condition is ready.
func IsPodReady(t *testing.T, clientset *kubernetes.Clientset, pod *corev1.Pod) bool {
	// Attempt to retrieve Pod.
	o, err := clientset.CoreV1().Pods(pod.Namespace).Get(pod.Name, metav1.GetOptions{})
	if err != nil {
		return false
	}

	// Check the returned Pod's status & conditions for readiness.
	if o.Status.Phase == corev1.PodRunning || o.Status.Phase == corev1.PodSucceeded {
		for _, condition := range o.Status.Conditions {
			if condition.Type == corev1.PodReady {
				t.Logf("Checking if Pod %q is Ready | Condition.Status: %q | Condition.Reason: %q | Condition: %v\n", pod.Name, condition.Status, condition.Reason, condition)
				if o.Status.Phase == corev1.PodSucceeded {
					return true
				}
				return condition.Status == corev1.ConditionTrue
			}
		}
	}

	return false
}

// IsDeploymentReady attempts to check if the Deployments's status conditions
// are ready.
func IsDeploymentReady(t *testing.T, clientset *kubernetes.Clientset, deployment *appsv1.Deployment) bool {
	// Attempt to retrieve Deployment.
	o, err := clientset.AppsV1().Deployments(deployment.Namespace).Get(deployment.Name, metav1.GetOptions{})
	if err != nil {
		return false
	}

	// Check the returned Deployment's status & conditions for readiness.
	for _, condition := range o.Status.Conditions {
		if condition.Type == appsv1.DeploymentAvailable {
			t.Logf("Checking if Deployment %q is Available | Condition.Status: %q | Condition: %v\n", deployment.Name, condition.Status, condition)
			return condition.Status == corev1.ConditionTrue
		}
	}

	return false
}

// IsReplicaSetReady attempts to check if the ReplicaSets's status conditions
// are ready.
func IsReplicaSetReady(t *testing.T, clientset *kubernetes.Clientset, replicaSet *appsv1.ReplicaSet) bool {
	// Attempt to retrieve ReplicaSet.
	o, err := clientset.AppsV1().ReplicaSets(replicaSet.Namespace).Get(replicaSet.Name, metav1.GetOptions{})
	if err != nil {
		return false
	}

	// Check the returned ReplicaSet's status conditions for readiness.
	for _, condition := range o.Status.Conditions {
		if condition.Type == appsv1.ReplicaSetReplicaFailure {
			return false
		}
	}
	if o.Status.Replicas == o.Status.AvailableReplicas &&
		o.Status.Replicas == o.Status.ReadyReplicas {
		return true
	}
	return false
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
		// Convert kubconfig to KubeAccess
		kc, err := json.Marshal(kubeconfig)
		if err != nil {
			return nil, err
		}
		kubeAccess, err := KubeconfigToKubeAccess(kc)
		if err != nil {
			return nil, err
		}

		// Parse the kubeconfig user auth exec args for the cluster name.
		clusterName := kubeAccess.RESTConfig.ExecProvider.Args[2]
		clusterToKubeAccess[clusterName] = kubeAccess
	}

	return clusterToKubeAccess, nil
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
	cfnPrefix := "arn:aws:cloudformation"     // self-managed CF-based node gruops
	ngPrefix := "aws:eks/nodeGroup:NodeGroup" // AWS managed node groups

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
		}
	}

	return clusterToNodeCount, nil
}

// AssertHTTPResultWithRetry attempts to assert that an HTTP endpoint exists
// and evaluate its response.
func AssertHTTPResultWithRetry(t *testing.T, output interface{}, headers map[string]string, maxWait time.Duration, check func(string) bool) bool {
	hostname, ok := output.(string)
	if !assert.True(t, ok, fmt.Sprintf("expected `%s` output", output)) {
		return false
	}
	if !(strings.HasPrefix(hostname, "http://") || strings.HasPrefix(hostname, "https://")) {
		hostname = fmt.Sprintf("http://%s", hostname)
	}
	var err error
	var resp *http.Response
	startTime := time.Now()
	count, sleep := 0, 0
	for true {
		now := time.Now()
		req, err := http.NewRequest("GET", hostname, nil)
		if !assert.NoError(t, err, "error reading request: %v", err) {
			return false
		}

		for k, v := range headers {
			// Host header cannot be set via req.Header.Set(), and must be set
			// directly.
			if strings.ToLower(k) == "host" {
				req.Host = v
				continue
			}
			req.Header.Set(k, v)
		}

		client := &http.Client{Timeout: time.Second * 10}
		resp, err = client.Do(req)

		if err == nil && resp.StatusCode == 200 {
			break
		}
		if now.Sub(startTime) >= maxWait {
			t.Logf("Timeout after %v. Unable to http.get %v successfully.", maxWait, hostname)
			break
		}
		count++
		// delay 10s, 20s, then 30s and stay at 30s
		if sleep > 30 {
			sleep = 30
		} else {
			sleep += 10
		}
		time.Sleep(time.Duration(sleep) * time.Second)
		t.Logf("Http Error: %v\n", err)
		t.Logf("  Retry: %v, elapsed wait: %v, max wait %v\n", count, now.Sub(startTime), maxWait)
	}
	if !assert.NoError(t, err) {
		return false
	}
	// Read the body
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if !assert.NoError(t, err) {
		return false
	}
	// Verify it matches expectations
	return check(string(body))
}
