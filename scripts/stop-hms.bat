@echo off
echo Stopping Radiant Hospitals HMS server process...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":4000" ^| findstr "LISTENING"') do (
    echo Terminating Process ID: %%a
    taskkill /F /PID %%a
)

echo Hospital server stopped.
pause
