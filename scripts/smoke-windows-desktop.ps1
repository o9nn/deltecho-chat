param(
  [Parameter(Mandatory = $true)]
  [string]$Executable,

  [string]$RuntimeRoot = (Join-Path $env:TEMP "deltecho-desktop-smoke"),

  [string]$OutputPath = (Join-Path (Get-Location) "windows-desktop-smoke.json"),

  [string]$ScreenshotPath = "",

  [int]$StartupTimeoutSeconds = 45
)

$ErrorActionPreference = "Stop"

function Get-TreeStamp {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return [ordered]@{ exists = $false; fileCount = 0; totalBytes = 0; latestWriteUtc = $null }
  }

  $files = @(Get-ChildItem -LiteralPath $Path -Recurse -File -ErrorAction SilentlyContinue)
  $latest = $files | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
  return [ordered]@{
    exists = $true
    fileCount = $files.Count
    totalBytes = [long](($files | Measure-Object Length -Sum).Sum)
    latestWriteUtc = if ($latest) { $latest.LastWriteTimeUtc.ToString("o") } else { $null }
  }
}

function Get-ProcessTree {
  param([int]$RootProcessId)

  $all = @(Get-CimInstance Win32_Process)
  $ids = [System.Collections.Generic.HashSet[int]]::new()
  [void]$ids.Add($RootProcessId)
  $changed = $true
  while ($changed) {
    $changed = $false
    foreach ($process in $all) {
      if ($ids.Contains([int]$process.ParentProcessId) -and -not $ids.Contains([int]$process.ProcessId)) {
        [void]$ids.Add([int]$process.ProcessId)
        $changed = $true
      }
    }
  }

  return @($all | Where-Object { $ids.Contains([int]$_.ProcessId) } | ForEach-Object {
    [ordered]@{
      processId = [int]$_.ProcessId
      parentProcessId = [int]$_.ParentProcessId
      name = $_.Name
      executablePath = $_.ExecutablePath
      commandLine = $_.CommandLine
    }
  })
}

function Assert-True {
  param([bool]$Condition, [string]$Message)
  if (-not $Condition) { throw $Message }
}

$resolvedExecutable = (Resolve-Path -LiteralPath $Executable).Path
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputPath)
$standardRoots = @(
  (Join-Path $env:APPDATA "DeltaChat"),
  (Join-Path $env:APPDATA "DeltaChat Desktop"),
  (Join-Path $env:LOCALAPPDATA "DeltaChat"),
  (Join-Path $env:LOCALAPPDATA "DeltaChat Desktop")
)
$beforeStandard = [ordered]@{}
foreach ($path in $standardRoots) { $beforeStandard[$path] = Get-TreeStamp $path }

if (Test-Path -LiteralPath $RuntimeRoot) {
  Remove-Item -LiteralPath $RuntimeRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null
$resolvedRuntimeRoot = (Resolve-Path -LiteralPath $RuntimeRoot).Path

$previousTestDir = $env:DC_TEST_DIR
$primary = $null
$secondary = $null
$result = [ordered]@{
  passed = $false
  executable = $resolvedExecutable
  runtimeRoot = $resolvedRuntimeRoot
  startedAtUtc = [DateTime]::UtcNow.ToString("o")
  productName = $null
  fileDescription = $null
  mainWindowTitle = $null
  windowVisible = $false
  screenshotPath = $null
  processTree = @()
  accountRootExists = $false
  chromiumProfileExists = $false
  secondInstanceExited = $false
  secondInstanceRejected = $false
  standardDeltaChatUnchanged = $false
  assertions = @()
}

try {
  $env:DC_TEST_DIR = $resolvedRuntimeRoot
  $versionInfo = (Get-Item -LiteralPath $resolvedExecutable).VersionInfo
  $result.productName = $versionInfo.ProductName
  $result.fileDescription = $versionInfo.FileDescription
  Assert-True ($versionInfo.ProductName -eq "DeltEcho Chat") "Executable product name is not DeltEcho Chat"
  $result.assertions += "product-name-isolated"

  $primary = Start-Process -FilePath $resolvedExecutable -PassThru
  $deadline = [DateTime]::UtcNow.AddSeconds($StartupTimeoutSeconds)
  do {
    Start-Sleep -Milliseconds 500
    $primary.Refresh()
    $windowTitle = $primary.MainWindowTitle
    $accountRoot = Join-Path $resolvedRuntimeRoot "accounts"
    $chromiumProfile = Join-Path $resolvedRuntimeRoot "ChromiumProfile"
    if (-not $primary.HasExited -and ($windowTitle -or (Test-Path $accountRoot) -or (Test-Path $chromiumProfile))) {
      break
    }
  } while ([DateTime]::UtcNow -lt $deadline)

  Assert-True (-not $primary.HasExited) "DeltEcho exited during startup"
  $result.mainWindowTitle = $primary.MainWindowTitle
  $result.processTree = Get-ProcessTree $primary.Id
  Assert-True ($result.processTree.Count -gt 0) "No DeltEcho process tree was observable"
  Assert-True (($result.processTree | Where-Object { $_.name -eq "DeltEchoChat.exe" }).Count -gt 0) "DeltEchoChat.exe was not the desktop process root"
  $result.assertions += "deltecho-process-root"

  $windowDeadline = [DateTime]::UtcNow.AddSeconds($StartupTimeoutSeconds)
  $windowProcess = $null
  do {
    $windowProcess = Get-Process -Name "DeltEchoChat" -ErrorAction SilentlyContinue |
      Where-Object { $_.MainWindowHandle -ne 0 } |
      Select-Object -First 1
    if ($windowProcess) { break }
    Start-Sleep -Milliseconds 500
  } while ([DateTime]::UtcNow -lt $windowDeadline)
  Assert-True ($null -ne $windowProcess) "No visible DeltEcho desktop window appeared"
  $result.mainWindowTitle = $windowProcess.MainWindowTitle
  $result.windowVisible = $true
  Assert-True ($result.mainWindowTitle -match "^DeltEcho") "Visible window is not DeltEcho-branded"
  $result.assertions += "visible-deltecho-window"

  if ($ScreenshotPath) {
    $resolvedScreenshot = [System.IO.Path]::GetFullPath($ScreenshotPath)
    Add-Type -AssemblyName System.Drawing
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class DeltEchoWindowCapture {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
}
"@
    $rect = New-Object DeltEchoWindowCapture+RECT
    Assert-True ([DeltEchoWindowCapture]::GetWindowRect($windowProcess.MainWindowHandle, [ref]$rect)) "Could not read the DeltEcho window bounds"
    $width = [Math]::Max(1, $rect.Right - $rect.Left)
    $height = [Math]::Max(1, $rect.Bottom - $rect.Top)
    $bitmap = New-Object System.Drawing.Bitmap $width, $height
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, $bitmap.Size)
      $bitmap.Save($resolvedScreenshot, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $graphics.Dispose()
      $bitmap.Dispose()
    }
    $result.screenshotPath = $resolvedScreenshot
    $result.assertions += "visible-window-captured"
  }

  $accountRoot = Join-Path $resolvedRuntimeRoot "accounts"
  $chromiumProfile = Join-Path $resolvedRuntimeRoot "ChromiumProfile"
  $result.accountRootExists = Test-Path -LiteralPath $accountRoot
  $result.chromiumProfileExists = Test-Path -LiteralPath $chromiumProfile
  Assert-True $result.accountRootExists "Embedded Delta Chat core did not create the DeltEcho-owned accounts root"
  Assert-True $result.chromiumProfileExists "Electron did not create the DeltEcho-owned Chromium profile"
  $result.assertions += "embedded-core-account-root-isolated"
  $result.assertions += "chromium-profile-isolated"

  $baselineDesktopProcessIds = @(Get-Process -Name "DeltEchoChat" -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
  $secondary = Start-Process -FilePath $resolvedExecutable -PassThru
  $secondaryDeadline = [DateTime]::UtcNow.AddSeconds(30)
  $sawSecondaryDesktopProcess = $false
  do {
    Start-Sleep -Milliseconds 500
    $secondary.Refresh()
    $newDesktopProcesses = @(Get-Process -Name "DeltEchoChat" -ErrorAction SilentlyContinue | Where-Object { $_.Id -notin $baselineDesktopProcessIds })
    if ($newDesktopProcesses.Count -gt 0) {
      $sawSecondaryDesktopProcess = $true
    } elseif ($sawSecondaryDesktopProcess -or $secondary.HasExited) {
      $result.secondInstanceRejected = $true
      break
    }
  } while ([DateTime]::UtcNow -lt $secondaryDeadline)
  if (-not $result.secondInstanceRejected) {
    $survivingSecondaryDesktopProcesses = @(Get-Process -Name "DeltEchoChat" -ErrorAction SilentlyContinue | Where-Object { $_.Id -notin $baselineDesktopProcessIds })
    $result.secondInstanceRejected = $survivingSecondaryDesktopProcesses.Count -eq 0
  }
  $result.secondInstanceExited = $secondary.HasExited
  Assert-True $result.secondInstanceRejected "A second inner DeltEcho desktop process survived the profile-scoped single-instance lock"
  Assert-True (-not $primary.HasExited) "Primary DeltEcho instance exited when the second instance was launched"
  $result.assertions += "single-instance-scope-isolated"

  $afterStandard = [ordered]@{}
  foreach ($path in $standardRoots) { $afterStandard[$path] = Get-TreeStamp $path }
  $beforeJson = $beforeStandard | ConvertTo-Json -Depth 8 -Compress
  $afterJson = $afterStandard | ConvertTo-Json -Depth 8 -Compress
  $result.standardDeltaChatUnchanged = $beforeJson -eq $afterJson
  Assert-True $result.standardDeltaChatUnchanged "A standard Delta Chat profile changed during the isolated DeltEcho smoke test"
  $result.assertions += "standard-deltachat-state-untouched"

  $result.passed = $true
} catch {
  $result.error = $_.Exception.Message
  throw
} finally {
  $result.finishedAtUtc = [DateTime]::UtcNow.ToString("o")
  $result | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $resolvedOutput -Encoding UTF8

  $rootIds = @()
  if ($secondary) { $rootIds += $secondary.Id }
  if ($primary) { $rootIds += $primary.Id }
  foreach ($rootId in $rootIds) {
    $tree = @(Get-ProcessTree $rootId | Sort-Object processId -Descending)
    foreach ($process in $tree) {
      Stop-Process -Id $process.processId -Force -ErrorAction SilentlyContinue
    }
    Stop-Process -Id $rootId -Force -ErrorAction SilentlyContinue
  }
  if ($null -eq $previousTestDir) {
    Remove-Item Env:DC_TEST_DIR -ErrorAction SilentlyContinue
  } else {
    $env:DC_TEST_DIR = $previousTestDir
  }
}

Write-Output "DeltEcho Windows desktop smoke test passed."
Write-Output "Evidence: $resolvedOutput"
