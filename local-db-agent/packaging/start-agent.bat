@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Starting agent-local on http://127.0.0.1:52310 ...
"%~dp0node.exe" "%~dp0dist\app.mjs"
