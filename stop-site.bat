@echo off
echo Stopping local website server on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000" ^| findstr "LISTENING"') do taskkill /PID %%a /F
pause
