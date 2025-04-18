// Don't include with language-specific tests.
//go:build !dotnet && !go && !nodejs && !python && !java
// +build !dotnet,!go,!nodejs,!python,!java

package tests

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/pulumi/providertest"
	"github.com/pulumi/providertest/optproviderupgrade"
	"github.com/pulumi/providertest/pulumitest"
	"github.com/pulumi/providertest/pulumitest/assertpreview"
	"github.com/pulumi/providertest/pulumitest/optnewstack"
	"github.com/pulumi/providertest/pulumitest/opttest"
	"github.com/pulumi/pulumi/sdk/v3/go/auto/optpreview"
	"github.com/pulumi/pulumi/sdk/v3/go/common/apitype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The baseline version is the version of the provider that the upgrade tests will be run against.
const (
	_baselineVersion = "3.0.0"
	_providerName    = "eks"
)

func TestExamplesUpgrades(t *testing.T) {
	t.Run("cluster", func(t *testing.T) {
		testProviderUpgrade(t, "cluster")
	})

	t.Run("aws-profile", func(t *testing.T) {
		if os.Getenv("ALT_AWS_ACCESS_KEY_ID") == "" || os.Getenv("ALT_AWS_SECRET_ACCESS_KEY") == "" {
			t.Skip("ALT_AWS_ACCESS_KEY_ID and ALT_AWS_SECRET_ACCESS_KEY must be set")
		}
		setProfileCredentials(t, "aws-profile-node")
		testProviderUpgrade(t, "aws-profile")
	})

	t.Run("aws-profile-role", func(t *testing.T) {
		testProviderUpgrade(t, "aws-profile-role")
	})

	t.Run("encryption-provider", func(t *testing.T) {
		testProviderUpgrade(t, "encryption-provider")
	})

	t.Run("cluster-with-serviceiprange", func(t *testing.T) {
		testProviderUpgrade(t, "cluster-with-serviceiprange")
	})

	t.Run("extra-sg", func(t *testing.T) {
		testProviderUpgrade(t, "extra-sg")
	})

	t.Run("fargate", func(t *testing.T) {
		t.Skip("upgradetest doesn't understand invoke getSecurityGroup, tracked by providertest #31")
		testProviderUpgrade(t, "fargate")
	})

	t.Run("managed-nodegroups", func(t *testing.T) {
		testProviderUpgrade(t, "managed-nodegroups")
	})

	t.Run("modify-default-eks-sg", func(t *testing.T) {
		t.Skip("upgradetest doesn't understand invoke aws:ec2/getSecurityGroup:getSecurityGroup")
		testProviderUpgrade(t, "modify-default-eks-sg")
	})

	t.Run("nodegroup", func(t *testing.T) {
		testProviderUpgrade(t, "nodegroup")
	})

	t.Run("oidc-iam-sa", func(t *testing.T) {
		testProviderUpgrade(t, "oidc-iam-sa")
	})

	t.Run("scoped-kubeconfigs", func(t *testing.T) {
		t.Skip("Requires source change for args of GetCallerIdentityArgs")
		testProviderUpgrade(t, "scoped-kubeconfigs")
	})

	t.Run("storage-classes", func(t *testing.T) {
		testProviderUpgrade(t, "storage-classes")
	})

	t.Run("subnet-tags", func(t *testing.T) {
		testProviderUpgrade(t, "subnet-tags")
	})

	t.Run("tags", func(t *testing.T) {
		testProviderUpgrade(t, "tags")
	})
}

func TestReportUpgradeCoverage(t *testing.T) {
	providertest.ReportUpgradeCoverage(t)
}

func TestIgnoringScalingChanges(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skipf("Skipping in testing.Short() mode, assuming this is a CI run without credentials")
	}

	cwd, err := os.Getwd()
	require.NoError(t, err)
	dir := filepath.Join(getTestPrograms(t), "ignore-scaling-changes")
	options := []opttest.Option{
		opttest.LocalProviderPath("eks", filepath.Join(cwd, "..", "bin")),
		opttest.YarnLink("@pulumi/eks"),
		opttest.NewStackOptions(optnewstack.DisableAutoDestroy()),
	}

	pt := pulumitest.NewPulumiTest(t, dir, options...)
	pt.SetConfig(t, "aws:region", getEnvRegion(t))
	pt.SetConfig(t, "desiredSize", "1")

	cacheDir := filepath.Join("testdata", "recorded", t.Name())
	err = os.MkdirAll(cacheDir, 0o755)
	require.NoError(t, err)
	stackExportFile := filepath.Join(cacheDir, "stack.json")

	var export *apitype.UntypedDeployment
	export, err = tryReadStackExport(stackExportFile)
	if err != nil {
		pt.Up(t)
		grpcLog := pt.GrpcLog(t)
		grpcLogPath := filepath.Join(cacheDir, "grpc.json")
		t.Logf("writing grpc log to %s", grpcLogPath)
		err = grpcLog.WriteTo(grpcLogPath)
		require.NoError(t, err)

		e := pt.ExportStack(t)
		export = &e
		err = writeStackExport(stackExportFile, export, true)
		require.NoError(t, err)
	} else {
		pt.ImportStack(t, *export)
	}

	// Change the desiredSize, but expect no changes because it should be ignored
	pt.SetConfig(t, "desiredSize", "2")
	// TODO: uncomment after v3
	pt.Preview(t /*optpreview.ExpectNoChanges(),*/, optpreview.Diff())
}

func TestEksAuthModeUpgrade(t *testing.T) {
	t.Parallel()
	if testing.Short() {
		t.Skipf("Skipping in testing.Short() mode, assuming this is a CI run without credentials")
	}
	const firstYaml = `
name: eksClusterAuthModeUpgrade
runtime: yaml
resources:
  Vpc:
    type: awsx:ec2:Vpc
    properties:
      subnetSpecs:
        - type: Public
      natGateways:
        strategy: None
  EksCluster:
    type: eks:Cluster
    properties:
      vpcId: ${Vpc.vpcId}
      skipDefaultNodeGroup: true
      publicSubnetIds: ${Vpc.publicSubnetIds}
`
	const secondYaml = `
name: eksClusterAuthModeUpgrade
runtime: yaml
resources:
  Vpc:
    type: awsx:ec2:Vpc
    properties:
      subnetSpecs:
        - type: Public
      natGateways:
        strategy: None
  EksCluster:
    type: eks:Cluster
    properties:
      vpcId: ${Vpc.vpcId}
      skipDefaultNodeGroup: true
      publicSubnetIds: ${Vpc.publicSubnetIds}
      authenticationMode: CONFIG_MAP
`

	cwd, err := os.Getwd()
	assert.NoError(t, err)

	firstProgram := []byte(firstYaml)
	secondProgram := []byte(secondYaml)
	// test that we can upgrade from the previous version which accepted a string for `subnetIds`
	// to the new version which accepts a list
	t.Run("upgrade", func(t *testing.T) {
		pulumiTest := testProviderCodeChanges(t, &testProviderCodeChangesOptions{
			firstProgram: firstProgram,
			firstProgramOptions: []opttest.Option{
				opttest.DownloadProviderVersion(_providerName, _baselineVersion),
			},
			secondProgram: secondProgram,
			secondProgramOptions: []opttest.Option{
				opttest.LocalProviderPath("eks", filepath.Join(cwd, "..", "bin")),
			},
		})

		res := pulumiTest.Preview(t)
		fmt.Printf("stdout: %s \n", res.StdOut)
		fmt.Printf("stderr: %s \n", res.StdErr)
		assertpreview.HasNoReplacements(t, res)
	})
}

func testProviderUpgrade(t *testing.T, example string) {
	if testing.Short() {
		t.Skip("Skipping provider upgrade tests in short mode")
	}
	t.Parallel()
	t.Helper()
	dir := filepath.Join("../examples", example)

	cwd, err := os.Getwd()
	require.NoError(t, err)
	options := []opttest.Option{
		opttest.DownloadProviderVersion(_providerName, _baselineVersion),
		opttest.LocalProviderPath("eks", filepath.Join(cwd, "..", "bin")),
		opttest.YarnLink("@pulumi/eks"),
	}

	test := pulumitest.NewPulumiTest(t, dir, options...)

	result := providertest.PreviewProviderUpgrade(t, test, _providerName, _baselineVersion,
		optproviderupgrade.DisableAttach(),
	)
	assertpreview.HasNoReplacements(t, result)
}

type testProviderCodeChangesOptions struct {
	region               string
	firstProgram         []byte
	secondProgram        []byte
	firstProgramOptions  []opttest.Option
	secondProgramOptions []opttest.Option
}

// testProviderCodeChanges tests two different runs of a pulumi program. This allow you to run
// pulumi up with an initial program, change the code of the program and then run another pulumi command
func testProviderCodeChanges(t *testing.T, opts *testProviderCodeChangesOptions) *pulumitest.PulumiTest {
	if testing.Short() {
		t.Skip("Skipping provider tests in short mode")
	}
	t.Parallel()
	t.Helper()

	workdir := t.TempDir()
	cacheDir := filepath.Join("testdata", "recorded", "TestProviderUpgrade", t.Name())
	err := os.MkdirAll(cacheDir, 0o755)
	require.NoError(t, err)
	stackExportFile := filepath.Join(cacheDir, "stack.json")

	err = os.WriteFile(filepath.Join(workdir, "Pulumi.yaml"), opts.firstProgram, 0o600)
	require.NoError(t, err)

	options := []opttest.Option{
		opttest.SkipInstall(),
		opttest.NewStackOptions(optnewstack.DisableAutoDestroy()),
	}

	if opts.firstProgramOptions != nil {
		options = append(options, opts.firstProgramOptions...)
	}

	pt := pulumitest.NewPulumiTest(t, workdir, options...)
	region := "us-west-2"
	if opts != nil && opts.region != "" {
		region = opts.region
	}
	pt.SetConfig(t, "aws:region", region)

	var export *apitype.UntypedDeployment
	export, err = tryReadStackExport(stackExportFile)
	if err != nil {
		pt.Up(t)
		grpcLog := pt.GrpcLog(t)
		grpcLogPath := filepath.Join(cacheDir, "grpc.json")
		t.Logf("writing grpc log to %s", grpcLogPath)
		err = grpcLog.WriteTo(grpcLogPath)
		require.NoError(t, err)

		e := pt.ExportStack(t)
		export = &e
		err = writeStackExport(stackExportFile, export, true)
		require.NoError(t, err)
	}

	secondOptions := []opttest.Option{
		opttest.SkipInstall(),
		opttest.NewStackOptions(optnewstack.EnableAutoDestroy()),
	}

	if opts.secondProgramOptions != nil {
		secondOptions = append(options, opts.secondProgramOptions...)
	}
	err = os.WriteFile(filepath.Join(workdir, "Pulumi.yaml"), opts.secondProgram, 0o600)
	require.NoError(t, err)
	secondTest := pulumitest.NewPulumiTest(t, workdir, secondOptions...)
	secondTest.SetConfig(t, "aws:region", region)
	secondTest.ImportStack(t, *export)

	return secondTest
}

// writeStackExport writes the stack export to the given path creating any directories needed.
func writeStackExport(path string, snapshot *apitype.UntypedDeployment, overwrite bool) error {
	if snapshot == nil {
		return fmt.Errorf("stack export must not be nil")
	}
	dir := filepath.Dir(path)
	err := os.MkdirAll(dir, 0o755)
	if err != nil {
		return err
	}
	stackBytes, err := json.MarshalIndent(snapshot, "", "  ")
	if err != nil {
		return err
	}
	pathExists, err := exists(path)
	if err != nil {
		return err
	}
	if pathExists && !overwrite {
		return fmt.Errorf("stack export already exists at %s", path)
	}
	//nolint:gosec // 0644 is the correct permission for this file
	return os.WriteFile(path, stackBytes, 0o644)
}

// tryReadStackExport reads a stack export from the given file path.
// If the file does not exist, returns nil, nil.
func tryReadStackExport(path string) (*apitype.UntypedDeployment, error) {
	stackBytes, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read stack export at %s: %v", path, err)
	}
	var stackExport apitype.UntypedDeployment
	err = json.Unmarshal(stackBytes, &stackExport)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal stack export at %s: %v", path, err)
	}
	return &stackExport, nil
}

func exists(filePath string) (bool, error) {
	_, err := os.Stat(filePath)
	switch {
	case err == nil:
		return true, nil
	case !os.IsNotExist(err):
		return false, err
	}
	return false, nil
}
