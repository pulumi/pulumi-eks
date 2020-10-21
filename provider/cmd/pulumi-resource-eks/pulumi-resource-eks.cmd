@echo off
setlocal
for /f "delims=" %%i in ('node -e "console.log(require.resolve('@pulumi/eks/cmd/provider'))"') do set PULUMI_PROVIDER_SCRIPT_PATH=%%i
if DEFINED PULUMI_PROVIDER_SCRIPT_PATH (
   @node "%PULUMI_PROVIDER_SCRIPT_PATH%" %*
)
