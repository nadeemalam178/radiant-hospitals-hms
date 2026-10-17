@echo off
setlocal

echo ===============================================================================
echo               STARTING RADIANT HOSPITALS ON-PREMISE SYSTEM
echo ===============================================================================
echo.

:: Ensure PostgreSQL is active
sc query postgresql-x64-18 | find "STATE" | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo Starting PostgreSQL Database Service...
    net start postgresql-x64-18
)

echo Starting Hospital Application Server on Port 4000...
cd /d "%~dp0..\backend"

:: Launch browser in 3 seconds
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:4000"

:: Start the production server
call npm start
pause
