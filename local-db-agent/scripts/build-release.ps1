# Build a portable release package at: <repo>\release\agent-local
# Usage: powershell -ExecutionPolicy Bypass -File scripts\build-release.ps1
# NOTE: keep comments ASCII-only (PowerShell 5.1 reads this as ANSI otherwise).
$ErrorActionPreference = 'Stop'

$appDir = Resolve-Path (Join-Path $PSScriptRoot '..')
$outDir = Join-Path $appDir '..\release\agent-local'
Set-Location $appDir

# Stop any running agent started from a previous release, otherwise it locks
# files inside the release dir and Remove-Item below fails.
$outDirFull = [System.IO.Path]::GetFullPath($outDir)
Get-Process node -ErrorAction SilentlyContinue |
  Where-Object { $_.Path -and $_.Path.StartsWith($outDirFull, [System.StringComparison]::OrdinalIgnoreCase) } |
  ForEach-Object {
    Write-Host "Stopping running agent (PID $($_.Id)) ..."
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
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
# Back up the release .env before wiping the folder (keep user PORT/HOST).
$envBackup = $null
if (Test-Path (Join-Path $outDir '.env')) {
  $envBackup = Join-Path $env:TEMP ('agent-local-env-' + [guid]::NewGuid().ToString('N') + '.bak')
  Copy-Item (Join-Path $outDir '.env') $envBackup -Force
}
if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Join-Path $outDir 'dist') | Out-Null

Write-Host '4/8 Copying bundle + manifests ...'
Copy-Item (Join-Path $appDir 'dist\app.mjs') (Join-Path $outDir 'dist\app.mjs')
Copy-Item (Join-Path $appDir '.env.example') $outDir
Copy-Item (Join-Path $appDir 'packaging\README-deploy.txt') $outDir

# Minimal package.json: only the native module needed at runtime, so npm installs
# a few hundred files instead of tens of thousands.
$msnodesqlVersion = (Get-Content (Join-Path $appDir 'package.json') -Raw | ConvertFrom-Json).dependencies.msnodesqlv8
$minimalPkg = @"
{
  "name": "agent-local",
  "version": "1.0.0",
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
Copy-Item $nodePath -Destination (Join-Path $outDir 'node.exe')

Write-Host '7/8 Copying deploy scripts ...'
Copy-Item (Join-Path $appDir 'packaging\*') -Destination $outDir -Recurse

# Restore the backed-up .env (keep user PORT/HOST).
if ($envBackup -and (Test-Path $envBackup)) {
  Copy-Item $envBackup (Join-Path $outDir '.env') -Force
  Remove-Item $envBackup -Force
  Write-Host 'Preserved existing .env from previous release.'
}

Write-Host '8/8 Packing distribution zip ...'
$zipPath = Join-Path (Split-Path $outDir -Parent) 'agent-local.zip'
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
# Do not include the user's own .env (install.bat creates it from .env.example).
$envFile = Join-Path $outDir '.env'
$envBak = $null
if (Test-Path $envFile) { $envBak = "$envFile.distbak"; Move-Item $envFile $envBak -Force }
Compress-Archive -Path (Join-Path $outDir '*') -DestinationPath $zipPath -Force
if ($envBak) { Move-Item $envBak $envFile -Force }

$fileCount = (Get-ChildItem -Recurse -File $outDir).Count
$sizeMb = [math]::Round((Get-ChildItem -Recurse -File $outDir | Measure-Object Length -Sum).Sum / 1MB, 1)
Write-Host ''
Write-Host "Release package created: $outDir  ($fileCount files, $sizeMb MB)"
Write-Host "Distribution zip created: $zipPath"
