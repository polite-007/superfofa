@echo off
setlocal

rem superfofa release wrapper for release.ps1
rem Usage:
rem   release.bat -Version ^<version^> [-Proxy proxy]
rem   release.bat ^<version^> [proxy]
rem Examples:
rem   release.bat -Version 1.4
rem   release.bat -Version 1.4 -Proxy http://127.0.0.1:7895
rem   release.bat 1.4 http://127.0.0.1:7895

set "SCRIPT_DIR=%~dp0"
set "VERSION="
set "PROXY="
set "TOKEN="

:parse_args
if "%~1"=="" goto args_done
if /i "%~1"=="-Version" (
  set "VERSION=%~2"
  shift
  shift
  goto parse_args
)
if /i "%~1"=="-Proxy" (
  set "PROXY=%~2"
  shift
  shift
  goto parse_args
)
if /i "%~1"=="-Token" (
  set "TOKEN=%~2"
  shift
  shift
  goto parse_args
)
if "%VERSION%"=="" (
  set "VERSION=%~1"
) else if "%PROXY%"=="" (
  set "PROXY=%~1"
)
shift
goto parse_args
:args_done

if "%VERSION%"=="" (
  echo [ERROR] 缺少版本号参数
  echo 用法: %~nx0 -Version ^<版本号^> [-Proxy 代理] [-Token token]
  echo 示例: %~nx0 -Version 1.4
  echo        %~nx0 -Version 1.4 -Proxy http://127.0.0.1:7895
  echo        %~nx0 -Version 1.4 -Token ghp_xxx -Proxy http://127.0.0.1:7895
  exit /b 1
)

set "PS1=%SCRIPT_DIR%release.ps1"
if not exist "%PS1%" (
  echo [ERROR] 找不到 release.ps1: %PS1%
  exit /b 1
)

if "%TOKEN%"=="" (
  if "%PROXY%"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -Version "%VERSION%"
  ) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -Version "%VERSION%" -Proxy "%PROXY%"
  )
) else (
  if "%PROXY%"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -Version "%VERSION%" -Token "%TOKEN%"
  ) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -Version "%VERSION%" -Token "%TOKEN%" -Proxy "%PROXY%"
  )
)

set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo [ERROR] 发版失败，退出码 %RC%
)
exit /b %RC%
