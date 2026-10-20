$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$tempDir = Join-Path $env:TEMP "superfofa-release-bat-test"
$captureFile = Join-Path $tempDir "args.txt"

if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

try {
  Copy-Item (Join-Path $scriptDir "release.bat") (Join-Path $tempDir "release.bat") -Force

  @'
param(
  [Parameter(Mandatory = $true)]
  [string]$Version,
  [string]$Proxy = "",
  [string]$Token = ""
)

Set-Content -Path $env:RELEASE_BAT_CAPTURE -Value "$Version|$Proxy|$Token"
'@ | Set-Content -Path (Join-Path $tempDir "release.ps1") -Encoding UTF8

  $env:RELEASE_BAT_CAPTURE = $captureFile

  & cmd.exe /c "`"$tempDir\release.bat`" -Version 1.4 -Proxy http://127.0.0.1:7895"
  if ($LASTEXITCODE -ne 0) { throw "named args exited with $LASTEXITCODE" }
  $captured = Get-Content -Raw -Path $captureFile
  if ($captured.Trim() -ne "1.4|http://127.0.0.1:7895|") {
    throw "Expected named args '1.4|http://127.0.0.1:7895|', got '$($captured.Trim())'"
  }

  & cmd.exe /c "`"$tempDir\release.bat`" 1.4 http://127.0.0.1:7895"
  if ($LASTEXITCODE -ne 0) { throw "positional args exited with $LASTEXITCODE" }
  $captured = Get-Content -Raw -Path $captureFile
  if ($captured.Trim() -ne "1.4|http://127.0.0.1:7895|") {
    throw "Expected positional args '1.4|http://127.0.0.1:7895|', got '$($captured.Trim())'"
  }

  & cmd.exe /c "`"$tempDir\release.bat`" -Version 1.4 -Token ghp_test_token -Proxy http://127.0.0.1:7895"
  if ($LASTEXITCODE -ne 0) { throw "token args exited with $LASTEXITCODE" }
  $captured = Get-Content -Raw -Path $captureFile
  if ($captured.Trim() -ne "1.4|http://127.0.0.1:7895|ghp_test_token") {
    throw "Expected token args '1.4|http://127.0.0.1:7895|ghp_test_token', got '$($captured.Trim())'"
  }
} finally {
  Remove-Item Env:\RELEASE_BAT_CAPTURE -ErrorAction SilentlyContinue
  if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
}
