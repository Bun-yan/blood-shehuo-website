@echo off
cd /d "%~dp0"
echo Starting Blood Shehuo website...
echo.
echo Local address:
echo   http://127.0.0.1:5000/
echo.
echo If you want other devices on the same Wi-Fi/LAN to view it, try:
echo   http://%COMPUTERNAME%:5000/
echo.
echo Keep this window open while using the website.
echo Press Ctrl+C to stop the server.
echo.
python app.py
pause
