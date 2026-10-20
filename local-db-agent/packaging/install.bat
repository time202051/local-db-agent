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

rem 当前脚本是提权运行的，先把可能存在的旧进程（含历史遗留的管理员进程）结束掉，
rem 否则新实例会因端口占用启动失败。
set "OLD_PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":52310 " ^| findstr LISTENING') do set "OLD_PID=%%a"
if defined OLD_PID (
  echo Stopping old agent ^(PID %OLD_PID%^) ...
  taskkill /PID %OLD_PID% /F >nul 2>&1
  ping -n 2 127.0.0.1 >nul
)

rem 用计划任务启动（RunLevel=Limited），避免 agent 以管理员身份常驻，
rem 否则后续 restart/升级无法结束进程，只能靠 UAC 提权。
echo Starting agent-local now (non-elevated) ...
schtasks /run /tn AgentLocalChat >nul 2>&1
if errorlevel 1 (
  echo [WARN] 计划任务启动失败，改用当前会话启动。
  start "" wscript.exe "%~dp0start-agent.vbs"
)

echo.
echo Done. Autostart task: AgentLocalChat (runs at every logon).
echo Service URL: http://127.0.0.1:52310
pause
