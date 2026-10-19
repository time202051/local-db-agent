@echo off
chcp 65001 >nul
cd /d "%~dp0"

rem ----- self-elevate to Administrator -----
net session >nul 2>&1
if %errorlevel% neq 0 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo === Install agent-local autostart ===
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-autostart.ps1"
if errorlevel 1 (
  echo [FAILED] Could not register autostart.
  pause
  exit /b 1
)

rem ----- create .env on first run (defaults: PORT=52310, HOST=127.0.0.1) -----
if not exist "%~dp0.env" if exist "%~dp0.env.example" copy /y "%~dp0.env.example" "%~dp0.env" >nul

echo Starting agent-local now ...
start "" wscript.exe "%~dp0start-agent.vbs"

echo.
echo Done. Autostart task: AgentLocalChat (runs at every logon).
echo Service URL: http://127.0.0.1:52310
pause
