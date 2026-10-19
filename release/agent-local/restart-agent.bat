@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Stopping old agent on port 52310 ...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":52310 " ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
ping -n 2 127.0.0.1 >nul

echo Starting agent ...
start "" wscript.exe "%~dp0start-agent.vbs"
echo Done. Agent should be running at http://127.0.0.1:52310
