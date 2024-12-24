package internal

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/autoscaling"
	"github.com/aws/aws-sdk-go-v2/service/ec2"
	"github.com/aws/aws-sdk-go-v2/service/ec2/types"
	"github.com/aws/aws-sdk-go-v2/service/eks"
	eksTypes "github.com/aws/aws-sdk-go-v2/service/eks/types"
	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/mod/semver"
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
// This creates a max wait time of up to 5 minutes that a resource request
// must successfully return within, before moving on.

// MaxRetries is the maximum number of retries that a resource will be
// attempted to be fetched from the Kubernetes API Server.
const MaxRetries = 20

// RetryInterval is the number of seconds to sleep in between requests
// to the Kubernetes API Server.
const RetryInterval = 15

// APIServerVersionInfo prints out the API Server versions.
func APIServerVersionInfo(t *testing.T, clientset *kubernetes.Clientset) {
	version, err := clientset.DiscoveryClient.ServerVersion()
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("API Server Version: %s.%s\n", version.Major, version.Minor)
	t.Logf("API Server GitVersion: %s\n", version.GitVersion)
}

// assertAwsAuthConfigMapExists ensures that the EKS aws-auth ConfigMap exists and has data.
func assertAwsAuthConfigMapExists(t *testing.T, clientset *kubernetes.Clientset, clusterName string) error {
	configMapName, namespace := "aws-auth", "kube-system"

	awsAuth, err := clientset.CoreV1().ConfigMaps(namespace).Get(context.TODO(), configMapName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get aws-auth ConfigMap: %w", err)
	}

	if awsAuth.Data == nil {
		return fmt.Errorf("aws-auth ConfigMap %q is nil", configMapName)
	}

	if len(awsAuth.Data) == 0 {
		return fmt.Errorf("aws-auth ConfigMap %q is empty", configMapName)
	}

	t.Logf("%q ConfigMap exists in namespace %q of cluster %q and has data", configMapName, namespace, clusterName)
	return nil
}

// assertAwsAuthConfigMapNotExists ensures that the EKS aws-auth ConfigMap does not exist.
func assertAwsAuthConfigMapNotExists(t *testing.T, clientset *kubernetes.Clientset, clusterName string) error {
	configMapName, namespace := "aws-auth", "kube-system"

	_, err := clientset.CoreV1().ConfigMaps(namespace).Get(context.TODO(), configMapName, metav1.GetOptions{})
	if err == nil {
		return fmt.Errorf("%q ConfigMap still exists in namespace %q", configMapName, namespace)
	}

	t.Logf("Verified that the %q ConfigMap does not exist in namespace %q of cluster %q", configMapName, namespace, clusterName)
	return nil
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

type VpcCniValidation struct {
	Kubeconfig                interface{}
	ExpectedAddonVersion      string
	ClusterName               string
	ExpectedInitEnvVars       map[string]string
	ExpectedEnvVars           map[string]string
	SecurityContextPrivileged *bool
	NetworkPoliciesEnabled    *bool
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

type KubernetesResource struct {
	Namespace string
	Name      string
}

type ClusterValidationOptions struct {
	kubeConfigs           []interface{}
	deploymentsToValidate []KubernetesResource
	daemonsetsToValidate  []KubernetesResource
	timeout               time.Duration
}

type ClusterValidationOption interface {
	Apply(options *ClusterValidationOptions)
}

type optionFunc func(*ClusterValidationOptions)

func (o optionFunc) Apply(opts *ClusterValidationOptions) {
	o(opts)
}

func WithKubeConfigs(kubeConfigs ...interface{}) ClusterValidationOption {
	return optionFunc(func(o *ClusterValidationOptions) {
		o.kubeConfigs = append(o.kubeConfigs, kubeConfigs...)
	})
}

func ValidateDeployments(deployments ...KubernetesResource) ClusterValidationOption {
	return optionFunc(func(o *ClusterValidationOptions) {
		o.deploymentsToValidate = o.deploymentsToValidate
	})
}

func ValidateDaemonSets(daemonsets ...KubernetesResource) ClusterValidationOption {
	return optionFunc(func(o *ClusterValidationOptions) {
		o.daemonsetsToValidate = daemonsets
	})
}

func WithTimeout(timeout time.Duration) ClusterValidationOption {
	return optionFunc(func(o *ClusterValidationOptions) {
		o.timeout = timeout
	})
}

func DefaultOptions() *ClusterValidationOptions {
	return &ClusterValidationOptions{
		timeout: 5 * time.Minute,
		deploymentsToValidate: []KubernetesResource{
			{
				Namespace: "kube-system",
				Name:      "coredns",
			},
		},
		daemonsetsToValidate: []KubernetesResource{
			{
				Namespace: "kube-system",
				Name:      "aws-node",
			},
			{
				Namespace: "kube-system",
				Name:      "kube-proxy",
			},
		},
	}
}

// ValidateClusters validates the health of the clusters specified in the options.
// It will return an error if any of the clusters are unhealthy.
// It performs a series of health checks on an EKS cluster to ensure it is functioning correctly.
// It verifies API server connectivity, validates node group instances are healthy and properly joined,
// checks authentication configuration, and validates specified deployments and daemonsets are running.
// Any failures are automatically retried with exponential backoff.
func ValidateClusters(t *testing.T, resources []apitype.ResourceV3, options ...ClusterValidationOption) error {
	opts := DefaultOptions()
	for _, option := range options {
		option.Apply(opts)
	}

	if len(opts.kubeConfigs) == 0 {
		return fmt.Errorf("no kubeconfigs provided")
	}

	var region string
	var profile string
	if p, ok := os.LookupEnv("AWS_PROFILE"); ok {
		profile = p
	}
	if r, ok := os.LookupEnv("AWS_REGION"); ok {
		region = r
	}

	awsConfig := loadAwsDefaultConfig(t, region, profile)
	// Create AWS clients
	asgClient := autoscaling.NewFromConfig(awsConfig)
	ec2Client := ec2.NewFromConfig(awsConfig)

	// set up the clientsets for each cluster
	clusterKubeAccess, err := mapClusterToKubeAccess(opts.kubeConfigs...)
	if err != nil {
		return fmt.Errorf("failed to map kubeconfigs to clusters: %v", err)
	}

	// look up the configured node groups for each cluster
	clusterNodeGroup, err := mapClusterToNodeGroups(resources)
	if err != nil {
		return fmt.Errorf("failed to map resources to node groups: %v", err)
	}

	// look up the authentication mode for each cluster
	clusterAuthenticationMode, err := mapClusterToAuthenticationMode(resources)
	if err != nil {
		return fmt.Errorf("failed to map resources to authentication mode: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), opts.timeout)
	defer cancel()

	var wg sync.WaitGroup
	errChan := make(chan error, len(clusterKubeAccess))
	wg.Add(len(clusterKubeAccess))

	for clusterName := range clusterKubeAccess {
		go func(clusterName string) {
			defer wg.Done()
			t.Logf("Validating Cluster: %s", clusterName)
			authenticationMode := clusterAuthenticationMode[clusterName]
			t.Logf("Detected authentication mode %q for Cluster %s", authenticationMode, clusterName)

			err := validateCluster(t, ctx, clusterName, authenticationMode, clusterKubeAccess[clusterName].Clientset, asgClient, ec2Client, clusterNodeGroup[clusterName], *opts)
			if err != nil {
				errChan <- fmt.Errorf("cluster %s is unhealthy: %v", clusterName, err)
			}
		}(clusterName)
	}

	wg.Wait()
	close(errChan)

	var errs []error
	for err := range errChan {
		errs = append(errs, err)
	}

	require.NoError(t, errors.Join(errs...))
	return nil
}

// validateCluster performs a series of health checks on an EKS cluster to ensure it is functioning correctly.
// It verifies API server connectivity, validates node group instances are healthy and properly joined,
// checks authentication configuration, and validates specified deployments and daemonsets are running.
// The validation is performed concurrently using goroutines and retries failed checks with exponential backoff.
func validateCluster(t *testing.T, ctx context.Context, clusterName string, authenticationMode string, clientset *kubernetes.Clientset, asgClient *autoscaling.Client, ec2Client *ec2.Client, expectedNodeGroups map[string]nodeGroupData, opts ClusterValidationOptions) error {
	// first, make sure the API server is reachable. None of the other checks
	// will work if the API server is not reachable.
	err := RetryWithExponentialBackoff(ctx, 10*time.Millisecond, func() error {
		version, err := clientset.DiscoveryClient.ServerVersion()
		if err != nil {
			return fmt.Errorf("failed to connect to API Server: %v", err)
		}
		t.Logf("Successfully connected to API Server of cluster %s\n\tVersion: %s.%s\n\tGitVersion: %s\n", clusterName, version.Major, version.Minor, version.GitVersion)
		return nil
	})
	if err != nil {
		return err
	}

	var wg sync.WaitGroup

	// 1 for the node group instances
	// 1 for the auth mode
	// 1 task each for the deployments and daemonsets
	numTasks := 1 + 1 + len(opts.deploymentsToValidate) + len(opts.daemonsetsToValidate)
	errChan := make(chan error, numTasks)
	wg.Add(numTasks)

	version, err := clientset.DiscoveryClient.ServerVersion()
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("API Server Version: %s.%s\n", version.Major, version.Minor)
	t.Logf("API Server GitVersion: %s\n", version.GitVersion)

	go func() {
		err := RetryWithExponentialBackoff(ctx, 2*time.Second, func() error {
			return ValidateNodeGroupInstances(t, clientset, asgClient, ec2Client, clusterName, expectedNodeGroups)
		})
		errChan <- err
		wg.Done()
	}()

	go func() {
		err := RetryWithExponentialBackoff(ctx, 2*time.Second, func() error {
			if authenticationMode == "CONFIG_MAP" || authenticationMode == "API_AND_CONFIG_MAP" {
				return assertAwsAuthConfigMapExists(t, clientset, clusterName)
			} else {
				return assertAwsAuthConfigMapNotExists(t, clientset, clusterName)
			}
		})
		errChan <- err
		wg.Done()
	}()

	for _, deployment := range opts.deploymentsToValidate {
		go func(deployment KubernetesResource) {
			err := RetryWithExponentialBackoff(ctx, 2*time.Second, func() error {
				err := ValidateDeploymentHealth(t, clientset, deployment.Namespace, deployment.Name)
				if err != nil {
					t.Logf("Detected unhealthy deployment %q in namespace %q of cluster %s: %v", deployment.Name, deployment.Namespace, clusterName, err)
					labelSelector, selectorErr := findDeploymentLabelSelector(clientset, deployment.Namespace, deployment.Name, clusterName)
					if selectorErr != nil {
						return errors.Join(err, selectorErr)
					}
					logUnhealthyPodInfo(t, clientset, deployment.Namespace, labelSelector, clusterName)
				} else {
					t.Logf("Detected healthy deployment %q in namespace %q of cluster %s", deployment.Name, deployment.Namespace, clusterName)
				}
				return err
			})
			errChan <- err
			wg.Done()
		}(deployment)
	}

	for _, daemonset := range opts.daemonsetsToValidate {
		go func(daemonset KubernetesResource) {
			err := RetryWithExponentialBackoff(ctx, 2*time.Second, func() error {
				err := ValidateDaemonSetHealth(t, clientset, daemonset.Namespace, daemonset.Name)
				if err != nil {
					t.Logf("Detected unhealthy daemonset %q in namespace %q of cluster %s: %v", daemonset.Name, daemonset.Namespace, clusterName, err)
					labelSelector, selectorErr := findDaemonSetLabelSelector(clientset, daemonset.Namespace, daemonset.Name, clusterName)
					if selectorErr != nil {
						return errors.Join(err, selectorErr)
					}
					logUnhealthyPodInfo(t, clientset, daemonset.Namespace, labelSelector, clusterName)
				} else {
					t.Logf("Detected healthy daemonset %q in namespace %q of cluster %s", daemonset.Name, daemonset.Namespace, clusterName)
				}
				return err
			})
			errChan <- err
			wg.Done()
		}(daemonset)
	}

	wg.Wait()
	close(errChan)
	var errs []error
	for err := range errChan {
		errs = append(errs, err)
	}
	return errors.Join(errs...)
}

type nodeGroupData struct {
	desiredSize int
}

// clusterNodeGroupMap implements a map of Kubernetes cluster names to their
// respective AutoScalingGroups. It is a map of cluster name to a map of ASG name to node group data.
type clusterNodeGroupMap map[string]map[string]nodeGroupData

func mapClusterToNodeGroups(resources []apitype.ResourceV3) (clusterNodeGroupMap, error) {
	clusterNodeGroupMap := make(clusterNodeGroupMap)

	// Map cluster to its NodeGroups.
	cfnPrefix := "arn:aws:cloudformation"    // self-managed CF-based node groups
	mngType := "aws:eks/nodeGroup:NodeGroup" // AWS managed node groups
	ng2Type := "aws:autoscaling/group:Group" // self-managed ASG-based node groups

	for _, res := range resources {
		if strings.HasPrefix(res.ID.String(), cfnPrefix) {
			var templateBody cloudFormationTemplateBody
			body := res.Outputs["templateBody"].(string)
			err := yaml.Unmarshal([]byte(body), &templateBody)
			if err != nil {
				return nil, err
			}

			var asgName string
			if outputs, ok := res.Outputs["outputs"].(map[string]interface{}); ok {
				if nodeGroupName, ok := outputs["NodeGroup"].(string); ok {
					asgName = nodeGroupName
				}
			}
			if asgName == "" {
				return nil, fmt.Errorf("node group name for %s not found in outputs", res.URN)
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

			nodeGroupMap, ok := clusterNodeGroupMap[clusterName]
			if !ok {
				nodeGroupMap = make(map[string]nodeGroupData)
				clusterNodeGroupMap[clusterName] = nodeGroupMap
			}
			nodeGroupMap[asgName] = nodeGroupData{
				desiredSize: templateBody.Resources.NodeGroup.Properties.DesiredCapacity,
			}
		} else if res.Type.String() == mngType {
			// Extract the cluster name.
			nodegroup := res.Inputs
			clusterName := nodegroup["clusterName"].(string)
			// Extract the desired size.
			scalingConfig := nodegroup["scalingConfig"].(map[string]interface{})
			desiredSize := int(scalingConfig["desiredSize"].(float64))
			// Extract the ASG name
			var asgName string
			if resources, ok := res.Outputs["resources"].([]interface{}); ok {
				for _, resource := range resources {
					if resourceMap, ok := resource.(map[string]interface{}); ok {
						if autoscalingGroups, ok := resourceMap["autoscalingGroups"].([]interface{}); ok {
							for _, autoscalingGroup := range autoscalingGroups {
								if autoscalingGroupMap, ok := autoscalingGroup.(map[string]interface{}); ok {
									if name, ok := autoscalingGroupMap["name"].(string); ok {
										asgName = name
									}
								}
							}
						}
					}
				}
			}
			if asgName == "" {
				return nil, fmt.Errorf("node group name for %s not found in outputs", res.URN)
			}

			nodeGroupMap, ok := clusterNodeGroupMap[clusterName]
			if !ok {
				nodeGroupMap = make(map[string]nodeGroupData)
				clusterNodeGroupMap[clusterName] = nodeGroupMap
			}
			nodeGroupMap[asgName] = nodeGroupData{
				desiredSize: desiredSize,
			}
		} else if res.Type.String() == ng2Type {
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

			asgName := asg["name"].(string)

			// Extract the cluster name.
			clusterName := strings.Split(nameTag, "-worker")[0]
			desiredSize := int(asg["desiredCapacity"].(float64))

			nodeGroupMap, ok := clusterNodeGroupMap[clusterName]
			if !ok {
				nodeGroupMap = make(map[string]nodeGroupData)
				clusterNodeGroupMap[clusterName] = nodeGroupMap
			}
			nodeGroupMap[asgName] = nodeGroupData{
				desiredSize: desiredSize,
			}
		}
	}

	return clusterNodeGroupMap, nil
}

// EC2InstanceIDPattern matches both old (8 character) and new (17 character) EC2 instance IDs
// Examples: i-1234567f, i-0123456789abcdef0
var eC2InstanceIDPattern = regexp.MustCompile(`^i-[a-f0-9]{8,17}$`)

// GetEC2InstanceIDs extracts the EC2 instance IDs from the given list of nodes.
// It returns a map of instance IDs to nodes.
func GetEC2InstanceIDs(nodes *corev1.NodeList) map[string]*corev1.Node {
	if nodes == nil {
		return nil
	}

	instanceIDToNode := make(map[string]*corev1.Node)

	// Extract instance IDs from all nodes
	for i := range nodes.Items {
		node := &nodes.Items[i]
		// Extract EC2 instance ID from node provider ID
		// Provider ID format: aws:///az/i-1234567890abcdef0
		providerID := node.Spec.ProviderID
		instanceID := strings.TrimPrefix(providerID, "aws:///")
		instanceID = strings.TrimPrefix(instanceID, strings.Split(instanceID, "/")[0]+"/")

		// the list of k8s nodes can include nodes that are not EC2 instances (e.g. Fargate),
		// those are not part of any ASGs. We already validated that all nodes are ready, so we can
		// skip the nodes that are not EC2 instances. Their ID is not valid input to the
		// DescribeAutoScalingInstances API used later and would cause an error.
		if eC2InstanceIDPattern.MatchString(instanceID) {
			instanceIDToNode[instanceID] = node
		}
	}

	return instanceIDToNode
}

// ValidateNodeGroupInstances validates that all nodes in the cluster are healthy and have successfully joined.
// It checks that each ASG has the expected number of instances and that all instances are properly registered as nodes.
func ValidateNodeGroupInstances(t *testing.T, clientset *kubernetes.Clientset, asgClient *autoscaling.Client, ec2Client *ec2.Client, clusterName string, expectedNodeGroups map[string]nodeGroupData) error {
	// Get all nodes in the cluster
	nodes, err := clientset.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return fmt.Errorf("failed to list nodes: %v", err)
	}

	// Validate that all nodes are in Ready state
	for _, node := range nodes.Items {
		var isReady bool
		for _, condition := range node.Status.Conditions {
			if condition.Type == corev1.NodeReady {
				if condition.Status != corev1.ConditionTrue {
					return fmt.Errorf("node %s is not ready: %s", node.Name, condition.Message)
				}
				isReady = true
				break
			}
		}
		if !isReady {
			return fmt.Errorf("node %s does not have Ready condition", node.Name)
		}

		// Check for any taints that might indicate node problems
		for _, taint := range node.Spec.Taints {
			if taint.Effect == corev1.TaintEffectNoSchedule || taint.Effect == corev1.TaintEffectNoExecute {
				// These taints indicate the node is not ready
				if strings.Contains(taint.Key, "node.kubernetes.io/not-ready") ||
					strings.Contains(taint.Key, "node.kubernetes.io/unschedulable") {
					return fmt.Errorf("node %s is not ready - has taint: %s", node.Name, taint.Key)
				}
			}
		}
	}

	asgInstanceCounts := make(map[string]int)

	instanceIDToNode := GetEC2InstanceIDs(nodes)
	instanceIDs := make([]string, 0, len(instanceIDToNode))
	for instanceID := range instanceIDToNode {
		instanceIDs = append(instanceIDs, instanceID)
	}

	// For each node, get its EC2 instance ID, find which ASG it belongs to and verify that EC2 reports the instance as running.
	// Process instance IDs in batches of 50 because that's the maximum number of instance IDs that can be passed to the DescribeAutoScalingInstances API.
	for i := 0; i < len(instanceIDs); i += 50 {
		end := i + 50
		if end > len(instanceIDs) {
			end = len(instanceIDs)
		}
		batch := instanceIDs[i:end]

		// Get ASG info for this batch of instances
		input := &autoscaling.DescribeAutoScalingInstancesInput{
			InstanceIds: batch,
		}
		result, err := asgClient.DescribeAutoScalingInstances(context.TODO(), input)
		if err != nil {
			return fmt.Errorf("failed to describe ASG instances: %v", err)
		}

		instanceToAsg := make(map[string]string)
		for _, instance := range result.AutoScalingInstances {
			asgName := *instance.AutoScalingGroupName
			asgInstanceCounts[asgName]++
			instanceToAsg[*instance.InstanceId] = asgName
		}

		// Verify instance health status
		describeInput := &ec2.DescribeInstanceStatusInput{
			InstanceIds: batch,
		}
		statusResult, err := ec2Client.DescribeInstanceStatus(context.TODO(), describeInput)
		if err != nil {
			return fmt.Errorf("failed to describe instance statuses: %v", err)
		}

		for _, status := range statusResult.InstanceStatuses {
			instanceID := *status.InstanceId
			asgName := instanceToAsg[instanceID]
			if status.InstanceState.Name != types.InstanceStateNameRunning {
				return fmt.Errorf("instance %s of ASG %s is not in running state, current state: %s", instanceID, asgName, status.InstanceState.Name)
			}
			if status.InstanceStatus.Status != types.SummaryStatusOk || status.SystemStatus.Status != types.SummaryStatusOk {
				return fmt.Errorf("instance %s of ASG %s is not healthy. Instance status: %s, System status: %s",
					instanceID,
					asgName,
					status.InstanceStatus.Status,
					status.SystemStatus.Status)
			}
		}
	}

	// Verify each ASG has the expected number of instances
	for asgName, ngData := range expectedNodeGroups {
		actualCount := asgInstanceCounts[asgName]
		if actualCount != ngData.desiredSize {
			return fmt.Errorf("ASG %s in cluster %s has %d instances but has a desired size of %d",
				asgName,
				clusterName,
				actualCount,
				ngData.desiredSize)
		}
		t.Logf("ASG %s in cluster %s has expected number of instances: %d", asgName, clusterName, actualCount)
	}

	t.Logf("All node groups of cluster %s are healthy and have the expected number of instances", clusterName)

	return nil
}

// FindNodesWithAmiID finds the nodes in a cluster that have the given AMI ID.
// It returns a list of EC2 instance IDs.
func FindNodesWithAmiID(t *testing.T, kubeconfig any, amiID string) ([]string, error) {
	clientSet, err := clientSetFromKubeconfig(kubeconfig)
	if err != nil {
		return nil, err
	}

	nodes, err := clientSet.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	instanceIDToNode := GetEC2InstanceIDs(nodes)
	if len(instanceIDToNode) == 0 {
		return nil, nil
	}

	var region string
	var profile string
	if p, ok := os.LookupEnv("AWS_PROFILE"); ok {
		profile = p
	}
	if r, ok := os.LookupEnv("AWS_REGION"); ok {
		region = r
	}
	awsConfig := loadAwsDefaultConfig(t, region, profile)
	ec2Client := ec2.NewFromConfig(awsConfig)

	nodesWithAmiID := make([]string, 0, len(instanceIDToNode))
	// Process instance IDs in batches of 255 (AWS API limit)
	instanceIDs := make([]string, 0, len(instanceIDToNode))
	for id := range instanceIDToNode {
		instanceIDs = append(instanceIDs, id)
	}

	// Describe instances in batches of 255 (AWS API limit)
	for i := 0; i < len(instanceIDs); i += 255 {
		end := i + 255
		if end > len(instanceIDs) {
			end = len(instanceIDs)
		}

		batch := instanceIDs[i:end]
		describeInput := &ec2.DescribeInstancesInput{
			InstanceIds: batch,
		}
		describeResult, err := ec2Client.DescribeInstances(context.TODO(), describeInput)
		if err != nil {
			return nil, err
		}

		for _, reservation := range describeResult.Reservations {
			for _, instance := range reservation.Instances {
				if *instance.ImageId == amiID {
					nodesWithAmiID = append(nodesWithAmiID, *instance.InstanceId)
				}
			}
		}
	}

	return nodesWithAmiID, nil
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
	AddonVersion   string
	ClusterVersion string
}

func FindDefaultAddonVersion(eksClient *eks.Client, addonName string) (string, error) {
	addon, err := findAddonVersion(eksClient, addonName, func(currentAddon *addonInfo, versionInfo eksTypes.AddonVersionInfo, compatibility eksTypes.Compatibility) *addonInfo {
		if compatibility.DefaultVersion && versionInfo.AddonVersion != nil && compatibility.ClusterVersion != nil {
			if currentAddon == nil || semver.Compare(currentAddon.ClusterVersion, *compatibility.ClusterVersion) < 0 {
				return &addonInfo{
					AddonVersion:   *versionInfo.AddonVersion,
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
	addon, err := findAddonVersion(eksClient, addonName, func(currentAddon *addonInfo, versionInfo eksTypes.AddonVersionInfo, compatibility eksTypes.Compatibility) *addonInfo {
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

func findAddonVersion(eksClient *eks.Client, addonName string, selector func(currentAddon *addonInfo, versionInfo eksTypes.AddonVersionInfo, compatibility eksTypes.Compatibility) *addonInfo) (*addonInfo, error) {
	input := &eks.DescribeAddonVersionsInput{
		AddonName: aws.String(addonName),
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

// ValidateDeploymentHealth checks if a Kubernetes deployment is healthy by verifying its status.
// It returns an error if the deployment is not found or not healthy.
func ValidateDeploymentHealth(t *testing.T, clientset *kubernetes.Clientset, namespace, deploymentName string) error {
	deployment, err := clientset.AppsV1().Deployments(namespace).Get(context.TODO(), deploymentName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get deployment %s/%s: %v", namespace, deploymentName, err)
	}

	if deployment.Status.ReadyReplicas != deployment.Status.Replicas {
		return fmt.Errorf("deployment %s/%s is not healthy: %d/%d replicas are ready",
			namespace,
			deploymentName,
			deployment.Status.ReadyReplicas,
			deployment.Status.Replicas)
	}

	if deployment.Status.UpdatedReplicas != deployment.Status.Replicas {
		return fmt.Errorf("deployment %s/%s is not healthy: %d/%d replicas are up-to-date",
			namespace,
			deploymentName,
			deployment.Status.UpdatedReplicas,
			deployment.Status.Replicas)
	}

	if deployment.Status.AvailableReplicas != deployment.Status.Replicas {
		return fmt.Errorf("deployment %s/%s is not healthy: %d/%d replicas are available",
			namespace,
			deploymentName,
			deployment.Status.AvailableReplicas,
			deployment.Status.Replicas)
	}

	return nil
}

// ValidateDaemonSetHealth checks if a Kubernetes daemonset is healthy by verifying its status.
// It returns an error if the daemonset is not found or not healthy.
func ValidateDaemonSetHealth(t *testing.T, clientset *kubernetes.Clientset, namespace, daemonsetName string) error {
	daemonset, err := clientset.AppsV1().DaemonSets(namespace).Get(context.TODO(), daemonsetName, metav1.GetOptions{})
	if err != nil {
		return fmt.Errorf("failed to get daemonset %s/%s: %v", namespace, daemonsetName, err)
	}

	if daemonset.Status.NumberReady != daemonset.Status.DesiredNumberScheduled {
		return fmt.Errorf("daemonset %s/%s is not healthy: %d/%d pods are ready",
			namespace,
			daemonsetName,
			daemonset.Status.NumberReady,
			daemonset.Status.DesiredNumberScheduled)
	}

	if daemonset.Status.UpdatedNumberScheduled != daemonset.Status.DesiredNumberScheduled {
		return fmt.Errorf("daemonset %s/%s is not healthy: %d/%d pods are up-to-date",
			namespace,
			daemonsetName,
			daemonset.Status.UpdatedNumberScheduled,
			daemonset.Status.DesiredNumberScheduled)
	}

	if daemonset.Status.NumberAvailable != daemonset.Status.DesiredNumberScheduled {
		return fmt.Errorf("daemonset %s/%s is not healthy: %d/%d pods are available",
			namespace,
			daemonsetName,
			daemonset.Status.NumberAvailable,
			daemonset.Status.DesiredNumberScheduled)
	}

	return nil
}

// findDeploymentLabelSelector returns the label selector for a deployment's pods.
func findDeploymentLabelSelector(clientset *kubernetes.Clientset, namespace, deploymentName string, clusterName string) (string, error) {
	// Get the deployment
	deployment, err := clientset.AppsV1().Deployments(namespace).Get(context.TODO(), deploymentName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get deployment %s/%s of cluster %s: %v", namespace, deploymentName, clusterName, err)
	}

	// Get the label selector from the deployment
	labelSelector := metav1.FormatLabelSelector(deployment.Spec.Selector)

	return labelSelector, nil
}

// findDaemonSetLabelSelector returns the label selector for a daemonset's pods.
func findDaemonSetLabelSelector(clientset *kubernetes.Clientset, namespace, daemonsetName, clusterName string) (string, error) {
	// Get the daemonset
	daemonset, err := clientset.AppsV1().DaemonSets(namespace).Get(context.TODO(), daemonsetName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get daemonset %s/%s of cluster %s: %v", namespace, daemonsetName, clusterName, err)
	}

	// Get the label selector from the daemonset
	labelSelector := metav1.FormatLabelSelector(daemonset.Spec.Selector)

	return labelSelector, nil
}

// logUnhealthyPodInfo logs debug information about pods belonging to a controller
func logUnhealthyPodInfo(t *testing.T, clientset *kubernetes.Clientset, namespace string, labelSelector string, clusterName string) error {
	// List pods matching the provided label selector
	pods, err := clientset.CoreV1().Pods(namespace).List(context.TODO(), metav1.ListOptions{
		LabelSelector: labelSelector,
	})
	if err != nil {
		return fmt.Errorf("failed to list pods of cluster %s: %v", clusterName, err)
	}

	for _, pod := range pods.Items {
		var logLines []string
		logLines = append(logLines, fmt.Sprintf("Pod %s/%s of cluster %s:", pod.Namespace, pod.Name, clusterName))
		logLines = append(logLines, fmt.Sprintf("  Phase: %s", pod.Status.Phase))
		logLines = append(logLines, fmt.Sprintf("  Host IP: %s", pod.Status.HostIP))
		logLines = append(logLines, fmt.Sprintf("  Pod IP: %s", pod.Status.PodIP))

		for _, containerStatus := range pod.Status.ContainerStatuses {
			logLines = append(logLines, fmt.Sprintf("  Container %s:", containerStatus.Name))
			logLines = append(logLines, fmt.Sprintf("    Ready: %v", containerStatus.Ready))
			logLines = append(logLines, fmt.Sprintf("    RestartCount: %d", containerStatus.RestartCount))

			if containerStatus.State.Waiting != nil {
				logLines = append(logLines, fmt.Sprintf("    Waiting - Reason: %s", containerStatus.State.Waiting.Reason))
				logLines = append(logLines, fmt.Sprintf("    Waiting - Message: %s", containerStatus.State.Waiting.Message))
			}

			if containerStatus.State.Terminated != nil {
				logLines = append(logLines, fmt.Sprintf("    Terminated - Reason: %s", containerStatus.State.Terminated.Reason))
				logLines = append(logLines, fmt.Sprintf("    Terminated - Message: %s", containerStatus.State.Terminated.Message))
				logLines = append(logLines, fmt.Sprintf("    Terminated - Exit Code: %d", containerStatus.State.Terminated.ExitCode))
			}
		}

		logLines = append(logLines, "  Conditions:")
		for _, condition := range pod.Status.Conditions {
			logLines = append(logLines, fmt.Sprintf("    %s: %s (Reason: %s, Message: %s)",
				condition.Type,
				condition.Status,
				condition.Reason,
				condition.Message))
		}

		t.Log(strings.Join(logLines, "\n"))
	}

	return nil
}

// RetryWithExponentialBackoff retries a function with exponential backoff until it succeeds or context is cancelled.
// It takes:
// - ctx: context for cancellation
// - initialDelay: initial delay duration between retries (will be doubled each retry)
// - operation: the function to retry that returns (error)
// Returns the last error encountered if context is cancelled
func RetryWithExponentialBackoff(ctx context.Context, initialDelay time.Duration, operation func() error) error {
	var err error
	currentDelay := initialDelay

	for {
		select {
		case <-ctx.Done():
			return err
		default:
			if err = operation(); err == nil {
				return nil
			}

			timer := time.NewTimer(currentDelay)
			select {
			case <-ctx.Done():
				timer.Stop()
				return err
			case <-timer.C:
				currentDelay *= 2
			}
		}
	}
}

func loadAwsDefaultConfig(t *testing.T, region, profile string) aws.Config {
	loadOpts := []func(*config.LoadOptions) error{}
	if profile != "" {
		loadOpts = append(loadOpts, config.WithSharedConfigProfile(profile))
	}
	if region != "" {
		loadOpts = append(loadOpts, config.WithRegion(region))
	}
	cfg, err := config.LoadDefaultConfig(context.TODO(), loadOpts...)
	require.NoError(t, err, "failed to load AWS config")

	return cfg
}
