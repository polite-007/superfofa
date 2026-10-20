<#
.SYNOPSIS
  superfofa 发版脚本（源码仓库编译 + 公开仓库发版 + README/截图同步）

.DESCRIPTION
  流程：
    1. 校验工作区干净、版本号合法、changelog 已含该版本
    2. 本地 wails build 编译验证（windows/amd64）
    3. 推送 main 分支到 origin（superfofa-src）
    4. 创建并推送 tag v<Version>，触发 CI（.github/workflows/release.yml）
       CI 在 macOS/Windows 多平台编译，自动发布到公开仓库 Release（tag 去前导 v）
    5. 克隆公开仓库（polite-007/superfofa），同步 README.md + screenshots/，推送

  token 优先从 -Token 参数读取，其次读取 RELEASE_TOKEN 环境变量；若都未设置，兼容读取 origin 远端 URL 里的 x-access-token。
  脚本不会打印 token。
  代理仅在本次 git 命令生效（-c http.proxy），不写入全局配置。

.PARAMETER Version
  发版版本号，不带前导 v，例如 1.4。脚本会自动加 v 前缀生成 tag。

.PARAMETER PublicRepo
  公开主页仓库全名，默认 polite-007/superfofa。

.PARAMETER Proxy
  可选临时代理，例如 http://127.0.0.1:7895。不传则直连。

.PARAMETER Token
  可选 GitHub Personal Access Token。优先级高于 RELEASE_TOKEN 环境变量和 origin URL 内置 token。

.EXAMPLE
  $env:RELEASE_TOKEN="ghp_xxx"
  .\scripts\release.ps1 -Version 1.4 -Proxy http://127.0.0.1:7895

.EXAMPLE
  .\scripts\release.ps1 -Version 1.4 -Token "ghp_xxx" -Proxy http://127.0.0.1:7895
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Version,
  [string]$PublicRepo = "polite-007/superfofa",
  [string]$Proxy = "",
  [string]$Token = $env:RELEASE_TOKEN
)

$ErrorActionPreference = "Stop"
$tag = "v$Version"

function Invoke-Git {
  param(
    [string[]]$GitArgs,
    [string[]]$DisplayArgs = $GitArgs
  )
  if ($Proxy -ne "") {
    & git -c "http.proxy=$Proxy" -c "https.proxy=$Proxy" @GitArgs
  } else {
    & git @GitArgs
  }
  if ($LASTEXITCODE -ne 0) { throw "git 执行失败: $($DisplayArgs -join ' ')" }
}

function Get-OriginRepoPath {
  $originUrl = git remote get-url origin
  if ($LASTEXITCODE -ne 0) { throw "读取 origin 远端失败" }

  if ($originUrl -match "github\.com[:/]([^/]+/[^/.]+)(?:\.git)?/?$") {
    return $Matches[1]
  }
  throw "无法从 origin 远端解析 GitHub 仓库路径: $originUrl"
}

function Get-OriginToken {
  $originUrl = git remote get-url origin
  if ($LASTEXITCODE -ne 0) { return "" }

  if ($originUrl -match "^https://x-access-token:([^@]+)@github\.com/") {
    return $Matches[1]
  }
  return ""
}

function Get-ReleaseToken {
  param([string]$ExplicitToken = "")

  if ($ExplicitToken -ne "") { return $ExplicitToken }
  if ($null -ne $env:RELEASE_TOKEN -and $env:RELEASE_TOKEN -ne "") { return $env:RELEASE_TOKEN }

  $originToken = Get-OriginToken
  if ($originToken -ne "") { return $originToken }

  throw "缺少 GitHub token：请设置 RELEASE_TOKEN 环境变量，或传 -Token，或在 origin URL 中配置 x-access-token。"
}

function New-TokenGitHubUrl {
  param(
    [string]$Repo,
    [string]$Token
  )
  return "https://x-access-token:$Token@github.com/$Repo.git"
}

Write-Host "==> superfofa 发版: $tag" -ForegroundColor Cyan

# ---------- 1. 前置校验 ----------
Write-Host "`n[1/6] 前置校验" -ForegroundColor Yellow
$status = git status --porcelain
if ($status) { throw "工作区不干净，请先提交或 stash：`n$status" }

$tags = git tag --list $tag
if ($tags) { throw "tag $tag 已存在" }

if (-not (Test-Path "frontend/src/views/version/changelog.ts")) {
  throw "找不到 changelog.ts"
}
if (-not (Select-String -Path "frontend/src/views/version/changelog.ts" -Pattern "version: `"v$Version`"" -Quiet)) {
  throw "changelog.ts 里没有 v$Version 条目，请先补充版本说明"
}
$releaseToken = Get-ReleaseToken -ExplicitToken $Token
$sourceRepo = Get-OriginRepoPath
$sourcePushUrl = New-TokenGitHubUrl -Repo $sourceRepo -Token $releaseToken
Write-Host "    GitHub token 已配置，源码仓库: $sourceRepo"
Write-Host "    工作区干净，changelog 已含 $tag"

# ---------- 2. 本地编译验证 ----------
Write-Host "`n[2/6] 本地编译验证 (wails build windows/amd64)" -ForegroundColor Yellow
& wails build -platform windows/amd64
if ($LASTEXITCODE -ne 0) { throw "wails build 失败" }
Write-Host "    编译通过"

# ---------- 3. 推送 main ----------
Write-Host "`n[3/6] 推送 main 分支到 origin" -ForegroundColor Yellow
Invoke-Git -GitArgs @("push", $sourcePushUrl, "main") -DisplayArgs @("push", "origin", "main")

# ---------- 4. 打 tag 并推送（触发 CI） ----------
Write-Host "`n[4/6] 创建并推送 tag $tag（触发 CI 发版）" -ForegroundColor Yellow
Invoke-Git -GitArgs @("tag", "-a", $tag, "-m", "$tag")
Invoke-Git -GitArgs @("push", $sourcePushUrl, $tag) -DisplayArgs @("push", "origin", $tag)

$actionsUrl = "https://github.com/polite-007/superfofa-src/actions"
Write-Host "    CI 已触发，进度查看: $actionsUrl"

# ---------- 5. 同步公开仓库 README + 截图 ----------
Write-Host "`n[5/6] 同步公开仓库 $PublicRepo 的 README + 截图" -ForegroundColor Yellow

$publicCloneUrl = New-TokenGitHubUrl -Repo $PublicRepo -Token $releaseToken

$tempDir = Join-Path $env:TEMP "superfofa-public-$Version"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
Write-Host "    克隆公开仓库到 $tempDir"
try {
  Invoke-Git -GitArgs @("clone", "--depth", "1", $publicCloneUrl, $tempDir) -DisplayArgs @("clone", "--depth", "1", "https://github.com/$PublicRepo.git", $tempDir)
} catch {
  throw "克隆公开仓库失败（token 可能无 $PublicRepo 权限）"
}

# 覆盖 README.md 和 screenshots/
Copy-Item "README.md" (Join-Path $tempDir "README.md") -Force
if (Test-Path "screenshots") {
  New-Item -ItemType Directory -Force -Path (Join-Path $tempDir "screenshots") | Out-Null
  Copy-Item "screenshots/*" (Join-Path $tempDir "screenshots/") -Force
}

Push-Location $tempDir
try {
  git remote set-url origin $publicCloneUrl
  if ($LASTEXITCODE -ne 0) { throw "设置公开仓库 origin 失败" }
  git add -A
  $hasChanges = git diff --cached --quiet; $hasChanges = -not $hasChanges
  if ($hasChanges) {
    git commit -m "docs: update README and screenshots for $tag" | Out-Null
    try {
      Invoke-Git -GitArgs @("push", "origin", "HEAD") -DisplayArgs @("push", "origin", "HEAD")
    } catch {
      throw "推送公开仓库失败"
    }
    Write-Host "    公开仓库 README + 截图已更新并推送"
  } else {
    Write-Host "    公开仓库无变化，跳过推送"
  }
} finally {
  Pop-Location
  Remove-Item -Recurse -Force $tempDir
  Write-Host "    已清理临时克隆目录"
}

# ---------- 6. 完成 ----------
Write-Host "`n[6/6] 完成" -ForegroundColor Green
Write-Host "  CI 编译进度:  https://github.com/polite-007/superfofa-src/actions"
Write-Host "  Release 产物: https://github.com/$PublicRepo/releases/tag/$Version"
Write-Host "  注意：Release 由 CI 自动发布，需等 CI 跑完才会出现。`n" -ForegroundColor Cyan
