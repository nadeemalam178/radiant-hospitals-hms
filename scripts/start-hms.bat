@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo               STARTING RADIANT HOSPITALS ON-PREMISE SYSTEM
echo ===============================================================================
echo Hospital: Radiant Hospital & Research Institute (RHRI)
echo Port:     4000
echo.

:: Ensure PostgreSQL service is active
for %%s in (postgresql-x64-18 postgresql-x64-17 postgresql-x64-16 postgresql-x64-15 postgresql) do (
    sc query %%s 2>nul | find "STATE" | find "RUNNING" >nul
    if !errorlevel! neq 0 (
        net start %%s >nul 2>nul
    )
)

echo Starting Hospital Application Server on Port 4000...
cd /d "%~dp0..\backend"

:: Launch browser in 3 seconds
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:4000"

:: Start production Node.js server
call npm start
pause
