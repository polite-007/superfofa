$ErrorActionPreference = "Stop"

$scriptPath = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "release.ps1"
$source = Get-Content -Raw -Path $scriptPath
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseInput($source, [ref]$tokens, [ref]$errors)
if ($errors.Count -gt 0) { throw "release.ps1 parse failed: $($errors[0].Message)" }

function Get-FunctionTextFromReleaseScript {
  param([string]$Name)

  $fnAst = $ast.Find({
    param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $Name
  }, $true)
  if (-not $fnAst) { throw "$Name function not found" }
  return $fnAst.Extent.Text
}

Invoke-Expression (Get-FunctionTextFromReleaseScript "Invoke-Git")
Invoke-Expression (Get-FunctionTextFromReleaseScript "Get-OriginRepoPath")
Invoke-Expression (Get-FunctionTextFromReleaseScript "Get-OriginToken")
Invoke-Expression (Get-FunctionTextFromReleaseScript "Get-ReleaseToken")
Invoke-Expression (Get-FunctionTextFromReleaseScript "New-TokenGitHubUrl")

$calls = @()
function git {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
  $script:calls += ,$GitArgs
  $global:LASTEXITCODE = 0

  if (($GitArgs -join " ") -eq "remote get-url origin") {
    return $script:originUrl
  }
}

function Assert-Equal {
  param(
    [string]$Name,
    [string]$Expected,
    [string]$Actual
  )
  if ($Actual -ne $Expected) {
    throw "$Name expected '$Expected', got '$Actual'"
  }
}

$Proxy = "http://127.0.0.1:7895"
Invoke-Git -GitArgs @("push", "origin", "main")
if ($calls.Count -ne 1) { throw "Expected 1 git call, got $($calls.Count)" }
Assert-Equal "Invoke-Git proxy args" "-c|http.proxy=$Proxy|-c|https.proxy=$Proxy|push|origin|main" ($calls[0] -join "|")

$script:originUrl = "https://x-access-token:origin_token_123@github.com/polite-007/superfofa-src.git"
Assert-Equal "origin repo path" "polite-007/superfofa-src" (Get-OriginRepoPath)
Assert-Equal "origin token" "origin_token_123" (Get-OriginToken)

$env:RELEASE_TOKEN = "env_token_123"
try {
  Assert-Equal "explicit token precedence" "explicit_token_123" (Get-ReleaseToken -ExplicitToken "explicit_token_123")
  Assert-Equal "environment token precedence" "env_token_123" (Get-ReleaseToken -ExplicitToken "")
} finally {
  Remove-Item Env:\RELEASE_TOKEN -ErrorAction SilentlyContinue
}
Assert-Equal "origin token fallback" "origin_token_123" (Get-ReleaseToken -ExplicitToken "")

$script:originUrl = "https://github.com/polite-007/superfofa-src.git"
try {
  Get-ReleaseToken -ExplicitToken "" | Out-Null
  throw "Expected missing token error"
} catch {
  if ($_.Exception.Message -notlike "*GitHub token*") {
    throw "Expected missing token message, got '$($_.Exception.Message)'"
  }
}

Assert-Equal "token github url" "https://x-access-token:token_123@github.com/polite-007/superfofa.git" (New-TokenGitHubUrl -Repo "polite-007/superfofa" -Token "token_123")

$calls = @()
$Proxy = ""
Invoke-Git -GitArgs @("push", "https://x-access-token:secret_token@github.com/polite-007/superfofa-src.git", "main") -DisplayArgs @("push", "origin", "main")
if ($calls.Count -ne 1) { throw "Expected safe-display git call, got $($calls.Count)" }
Assert-Equal "safe display actual git args" "push|https://x-access-token:secret_token@github.com/polite-007/superfofa-src.git|main" ($calls[0] -join "|")
