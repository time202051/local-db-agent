@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":52310 " ^| findstr LISTENING') do set "PID=%%a"

if defined PID (
  echo Stopping old agent ^(PID %PID%^) ...
  taskkill /PID %PID% /F >nul 2>&1
  ping -n 2 127.0.0.1 >nul
)

set "STILL="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":52310 " ^| findstr LISTENING') do set "STILL=%%a"
if defined STILL (
  echo [ERROR] 无法停止 PID %STILL%，通常是权限不足。
  echo         请右键“以管理员身份运行”本脚本，或者用 uninstall.bat 卸载后重新 install.bat。
  exit /b 1
)

echo Starting agent ^(non-elevated^) ...
schtasks /run /tn AgentLocalChat >nul 2>&1
if errorlevel 1 (
  echo [ERROR] 启动失败：找不到计划任务 AgentLocalChat，请重新运行 install.bat。
  exit /b 1
)
echo Done. Agent should be running at http://127.0.0.1:52310
