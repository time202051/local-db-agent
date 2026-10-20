@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem ----- self-elevate to Administrator -----
net session >nul 2>&1
if %errorlevel% neq 0 (
  rem Run the elevated copy from %TEMP% so this folder is not locked by its cwd.
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs -WorkingDirectory $env:TEMP"
  exit /b
)

echo === Remove agent-local autostart ===
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall-autostart.ps1"

rem ----- stop the running agent started from this folder -----
powershell -NoProfile -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith('%~dp0', [System.StringComparison]::OrdinalIgnoreCase) } | Stop-Process -Force -ErrorAction SilentlyContinue"

rem Leave the folder so this window does not keep it locked.
cd /d "%TEMP%"

echo Done.
pause
