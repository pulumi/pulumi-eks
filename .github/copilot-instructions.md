# Pulumi EKS Provider

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

The Pulumi EKS provider is a multi-language component provider for Amazon EKS with a Go-based backend and a NodeJS component provider that generates SDKs for NodeJS, Python, Go, .NET, and Java.

## Working Effectively

### Prerequisites and Environment Setup
- Install required tools:
  - Go 1.21+ (`go version` - validates to go1.24.5+)
  - Node.js 20.x (`node --version` - validates to v20.19.4+)
  - Yarn 1.22+ (`yarn --version` - validates to 1.22.22+)
  - Python 3.9+ (`python3 --version` - validates to 3.12.3+)
  - .NET 6.x+ (`dotnet --version` - validates to 8.0.118+)
  - Pulumi CLI (`pulumi version` - validates to v3.186.0+)

- Install pulumictl (required for builds):
  ```bash
  go install github.com/pulumi/pulumictl/cmd/pulumictl@latest
  export PATH=$PATH:~/go/bin
  ```

- Install golangci-lint for Go linting:
  ```bash
  curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.61.0
  ```

### Build and Development Workflow

- **CRITICAL TIMING**: Set timeouts appropriately for all operations:
  - Plugin installation: 10+ minutes - **NEVER CANCEL**
  - Initial schema generation: 60+ seconds 
  - Initial provider build: 180+ seconds - **NEVER CANCEL**
  - Subsequent builds: 30-60 seconds (cached)
  - NodeJS tests: 15+ seconds
  - SDK generation: 60+ seconds each (when plugins work)

- **ALWAYS** set PATH before building:
  ```bash
  export PATH=$PATH:~/go/bin:.pulumi/bin
  ```

### Core Build Steps (VALIDATED COMMANDS)

1. **Install plugins** (10+ minutes - **NEVER CANCEL**):
   ```bash
   make install_plugins
   ```

2. **Generate schema** (60 seconds first time, 2 seconds cached):
   ```bash
   make schema
   ```

3. **Build provider** (180 seconds first time, 30 seconds cached - **NEVER CANCEL**):
   ```bash
   make provider
   ```

4. **KNOWN ISSUE**: Plugin downloads may fail with "expected -1 bytes" errors. This prevents SDK generation but core provider builds work.

### Testing and Validation

- **Run NodeJS component tests** (9 seconds):
  ```bash
  cd nodejs/eks && yarn test
  ```

- **Run provider tests** (6 seconds):
  ```bash
  make test_provider
  ```

- **Format and lint NodeJS code**:
  ```bash
  cd nodejs/eks
  yarn format    # Fix formatting first
  yarn lint      # Fix linting issues
  yarn lint-check  # Validate formatting and linting
  ```

- **KNOWN ISSUE**: Go linting (`make lint_provider`) fails due to Go version compatibility issues.

### Example Validation

- **Test example type-checking** (2+ minutes for dependencies - **NEVER CANCEL**):
  ```bash
  cd examples/nodegroup
  npm install  # Takes 2+ minutes
  npx tsc --noEmit  # Quick type check
  ```

### Build Targets Reference

**Main targets** (use these for development):
- `make build` - Full build (requires working plugin downloads)
- `make provider` - Build provider binary only (VALIDATED - works reliably)
- `make schema` - Generate schema (VALIDATED - works reliably)
- `make test_provider` - Run provider tests (VALIDATED - works reliably)
- `make clean` - Clean all build artifacts (1-2 seconds)

**SDK targets** (currently broken due to plugin issues):
- `make generate_nodejs` - Generate NodeJS SDK
- `make generate_python` - Generate Python SDK  
- `make generate_go` - Generate Go SDK
- `make generate_dotnet` - Generate .NET SDK
- `make generate_java` - Generate Java SDK

**Working validation targets**:
- NodeJS tests: `cd nodejs/eks && yarn test`
- NodeJS linting: `cd nodejs/eks && yarn lint`
- Type checking: `cd examples/[example] && npx tsc --noEmit`

## Common Tasks and Troubleshooting

### First-time Setup Checklist
1. Install all prerequisites listed above
2. Set PATH environment variable
3. Run `make install_plugins` (10+ minutes - **NEVER CANCEL**)
4. Run `make schema` to generate schema
5. Run `make provider` to build provider (180+ seconds - **NEVER CANCEL**)
6. Test with `cd nodejs/eks && yarn test`

### Validation Steps After Changes
1. **ALWAYS** run NodeJS tests: `cd nodejs/eks && yarn test`
2. **ALWAYS** run formatting: `cd nodejs/eks && yarn format && yarn lint-check`
3. Rebuild provider: `make provider` (30-60 seconds)
4. Test example type-checking if changing APIs

### Performance Expectations
- **Initial setup**: 15+ minutes including plugin downloads
- **Clean rebuild**: 5+ minutes for core components
- **Incremental builds**: 30-60 seconds
- **Tests and validation**: 15-30 seconds

### Known Issues and Workarounds
1. **Plugin download failures**: Affects SDK generation but not core provider
2. **Go linter compatibility**: Use NodeJS linting instead
3. **Long build times**: First builds take much longer due to downloads
4. **Formatting required**: Always run `yarn format` before linting

### Repository Structure
- `provider/` - Go provider backend
- `nodejs/eks/` - NodeJS component provider (primary development)
- `sdk/` - Generated SDKs (created by build process)
- `examples/` - Example Pulumi programs for testing
- `tests/` - Integration tests
- `.github/workflows/` - CI/CD configuration

### Environment Variables
- `PULUMI_HOME` - Set automatically by build process
- `PATH` - Must include `~/go/bin` and `.pulumi/bin`
- `PULUMI_DISABLE_AUTOMATIC_PLUGIN_ACQUISITION` - Set to 1 to disable plugin downloads (doesn't fix current issues)
