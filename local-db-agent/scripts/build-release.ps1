# Build a portable release package at: <repo>\release\agent-local
# Usage: powershell -ExecutionPolicy Bypass -File scripts\build-release.ps1
# NOTE: keep comments ASCII-only (PowerShell 5.1 reads this as ANSI otherwise).
$ErrorActionPreference = 'Stop'

$appDir = Resolve-Path (Join-Path $PSScriptRoot '..')
$outDir = Join-Path $appDir '..\release\agent-local'
Set-Location $appDir

# Retry a filesystem operation a few times: antivirus / a just-exiting process
# may hold a handle for a short while.
function Invoke-WithRetry {
  param([scriptblock]$Action, [int]$Attempts = 6, [int]$DelayMs = 500)
  for ($i = 1; $i -le $Attempts; $i++) {
    try {
      & $Action
      return $true
    } catch {
      if ($i -eq $Attempts) { return $false }
      Start-Sleep -Milliseconds $DelayMs
    }
  }
  return $false
}

# Stop any process running from the release dir (agent started from a previous
# release), otherwise it locks files inside it.
$outDirFull = [System.IO.Path]::GetFullPath($outDir)
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
  Where-Object {
    ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($outDirFull, [System.StringComparison]::OrdinalIgnoreCase)) -or
    ($_.CommandLine -and $_.CommandLine.IndexOf($outDirFull, [System.StringComparison]::OrdinalIgnoreCase) -ge 0)
  } |
  ForEach-Object {
    Write-Host "Stopping running process (PID $($_.ProcessId), $($_.Name)) ..."
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
Start-Sleep -Milliseconds 800

# Dev deps (typescript, esbuild, ...) are required to build. If node_modules is
# missing, install them first; otherwise `npx tsc` may fetch the unrelated `tsc`
# npm package and bundle.mjs cannot resolve esbuild.
$tscBin = Join-Path $appDir 'node_modules\typescript\bin\tsc'
$esbuildDir = Join-Path $appDir 'node_modules\esbuild'
if (-not (Test-Path -LiteralPath $tscBin) -or -not (Test-Path -LiteralPath $esbuildDir)) {
  Write-Host 'Installing dependencies (npm install) ...'
  npm install --no-audit --no-fund
}

Write-Host '1/8 Compiling TypeScript ...'
if (Test-Path dist) { Remove-Item dist -Recurse -Force }
& node $tscBin -p tsconfig.build.json
if ($LASTEXITCODE -ne 0) { throw "tsc failed with exit code $LASTEXITCODE" }

Write-Host '2/8 Bundling into a single file (dist/app.mjs) ...'
# All pure-JS deps are inlined, so the release no longer needs a huge node_modules.
node scripts/bundle.mjs

Write-Host '3/8 Preparing output directory ...'
# Keep the user's .env across builds. The backup lives next to the release dir so
# it survives a failed/interrupted run too; fall back to an older temp backup.
$envFile = Join-Path $outDir '.env'
$envBackup = Join-Path (Split-Path $outDir -Parent) 'agent-local.env.bak'
if (Test-Path -LiteralPath $envFile) {
  Copy-Item -LiteralPath $envFile $envBackup -Force
} elseif (-not (Test-Path -LiteralPath $envBackup)) {
  $legacy = Get-ChildItem -LiteralPath $env:TEMP -Filter 'agent-local-env-*.bak' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($legacy) { Copy-Item -LiteralPath $legacy.FullName $envBackup -Force }
}

if (Test-Path -LiteralPath $outDir) {
  # Prefer a clean delete, but the directory itself may be locked (e.g. it is
  # some process's current directory, or Explorer/AV holds a handle). In that
  # case just clear its contents in place and keep going: we only need to
  # overwrite files. The elevated uninstall.bat window in particular keeps the
  # release folder as its working directory until it is closed.
  $removed = Invoke-WithRetry { Remove-Item -LiteralPath $outDir -Recurse -Force -ErrorAction Stop }
  if (-not $removed) {
    Write-Host 'Release directory is in use; clearing its contents in place ...'
    Get-ChildItem -LiteralPath $outDir -Force | ForEach-Object {
      $item = $_.FullName
      Invoke-WithRetry { Remove-Item -LiteralPath $item -Recurse -Force -ErrorAction Stop } | Out-Null
    }
  }
}
New-Item -ItemType Directory -Force -Path (Join-Path $outDir 'dist') | Out-Null

Write-Host '4/8 Copying bundle + manifests ...'
Copy-Item (Join-Path $appDir 'dist\app.mjs') (Join-Path $outDir 'dist\app.mjs')
Copy-Item (Join-Path $appDir '.env.example') $outDir
Copy-Item (Join-Path $appDir 'packaging\README-deploy.txt') $outDir

# Minimal package.json: only the native module needed at runtime, so npm installs
# a few hundred files instead of tens of thousands.
$appPkg = Get-Content (Join-Path $appDir 'package.json') -Raw | ConvertFrom-Json
$msnodesqlVersion = $appPkg.dependencies.msnodesqlv8
$minimalPkg = @"
{
  "name": "agent-local",
  "version": "$($appPkg.version)",
  "private": true,
  "type": "module",
  "dependencies": { "msnodesqlv8": "$msnodesqlVersion" }
}
"@
Set-Content -Path (Join-Path $outDir 'package.json') -Value $minimalPkg -Encoding utf8

Write-Host '5/8 Installing minimal runtime dependencies (msnodesqlv8) ...'
Push-Location $outDir
npm install --omit=dev --no-audit --no-fund --registry https://registry.npmmirror.com
Pop-Location

# Target is Windows x64: drop prebuilt binaries for other platforms.
$prebuilds = Join-Path $outDir 'node_modules\msnodesqlv8\prebuilds'
if (Test-Path -LiteralPath $prebuilds) {
  Get-ChildItem -LiteralPath $prebuilds -Directory |
    Where-Object { $_.Name -ne 'win32-x64' } |
    ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }
}

Write-Host '6/8 Copying portable node.exe ...'
$nodePath = (Get-Command node).Source
$nodeDest = Join-Path $outDir 'node.exe'
if (Test-Path -LiteralPath $nodeDest) {
  Invoke-WithRetry { Remove-Item -LiteralPath $nodeDest -Force -ErrorAction Stop } | Out-Null
}
Copy-Item $nodePath -Destination $nodeDest -Force

Write-Host '7/8 Copying deploy scripts ...'
Copy-Item (Join-Path $appDir 'packaging\*') -Destination $outDir -Recurse

# Restore the backed-up .env (keep user PORT/HOST).
if (Test-Path -LiteralPath $envBackup) {
  Copy-Item -LiteralPath $envBackup $envFile -Force
  Remove-Item -LiteralPath $envBackup -Force
  Write-Host 'Preserved existing .env from previous release.'
}

Write-Host '8/8 Packing distribution zip ...'
$zipPath = Join-Path (Split-Path $outDir -Parent) 'agent-local.zip'
if (Test-Path $zipPath) {
  Invoke-WithRetry { Remove-Item -LiteralPath $zipPath -Force -ErrorAction Stop } | Out-Null
}
# Do not include the user's own .env (install.bat creates it from .env.example).
$envBak = $null
# A previous failed run may have left the .env renamed; recover it first.
if (-not (Test-Path $envFile) -and (Test-Path "$envFile.distbak")) {
  Move-Item "$envFile.distbak" $envFile -Force
}
if (Test-Path $envFile) { $envBak = "$envFile.distbak"; Move-Item $envFile $envBak -Force }
try {
  # Antivirus scanners (or a still-exiting process) can briefly lock the freshly
  # copied node.exe, which makes Compress-Archive fail with "file in use".
  # Retry a few times instead of failing the whole release.
  $maxAttempts = 10
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    try {
      Compress-Archive -Path (Join-Path $outDir '*') -DestinationPath $zipPath -Force
      break
    } catch {
      if ($attempt -eq $maxAttempts) { throw }
      Write-Host "Archive failed (attempt $attempt/$maxAttempts), retrying in 1s ..."
      Start-Sleep -Seconds 1
    }
  }
} finally {
  if ($envBak -and (Test-Path $envBak)) { Move-Item $envBak $envFile -Force }
}

$fileCount = (Get-ChildItem -Recurse -File $outDir).Count
$sizeMb = [math]::Round((Get-ChildItem -Recurse -File $outDir | Measure-Object Length -Sum).Sum / 1MB, 1)
Write-Host ''
Write-Host "Release package created: $outDir  ($fileCount files, $sizeMb MB)"
Write-Host "Distribution zip created: $zipPath"
