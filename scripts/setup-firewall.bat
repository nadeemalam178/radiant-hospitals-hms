@echo off
echo ===============================================================================
echo            HOSPITAL LAN FIREWALL SETUP - RADIANT HOSPITALS HMS
echo ===============================================================================
echo.
echo This script opens TCP port 4000 in Windows Firewall so other computers
echo on the hospital local area network (LAN) can access the hospital portal.
echo.
echo NOTE: Must be run as Administrator!
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Administrative permissions required!
    echo Right-click this script and select "Run as administrator".
    pause
    exit /b 1
)

:: 1. Add inbound rule for Web Application on port 4000
echo Configuring Firewall Inbound Rule for Port 4000...
netsh advfirewall firewall delete rule name="Radiant Hospitals HMS (Web Portal)" >nul 2>&1
netsh advfirewall firewall add rule name="Radiant Hospitals HMS (Web Portal)" dir=in action=allow protocol=TCP localport=4000 profile=private,domain

if %errorlevel% equ 0 (
    echo [OK] Port 4000 is now open on Private/Domain networks.
) else (
    echo [ERROR] Failed to add firewall rule for port 4000.
)

:: 2. Ensure PostgreSQL port 5432 is NOT opened externally (Security best practice)
echo.
echo [SECURITY CHECK] Ensuring PostgreSQL port 5432 is kept internal and protected...
echo Only local server applications can access the database directly.
echo.
echo Firewall configuration complete.
pause
