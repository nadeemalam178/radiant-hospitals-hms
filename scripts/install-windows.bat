@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo            RADIANT HOSPITALS HMS - WINDOWS ON-PREMISE INSTALLER
echo ===============================================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH!
    echo Please install Node.js LTS (v20 or newer) from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Detected Node.js: %NODE_VER%

:: 2. Check PostgreSQL
echo.
echo Checking local PostgreSQL service...
sc query postgresql-x64-18 | find "STATE" | find "RUNNING" >nul
if %errorlevel% equ 0 (
    echo [OK] PostgreSQL 18 Service is RUNNING.
) else (
    echo [NOTICE] Attempting to start PostgreSQL service...
    net start postgresql-x64-18 >nul 2>nul
    if %errorlevel% equ 0 (
        echo [OK] PostgreSQL service started successfully.
    ) else (
        echo [WARNING] Could not verify PostgreSQL Windows service. Ensure PostgreSQL 18 is active.
    )
)

:: 3. Setup Backend
echo.
echo ===============================================================================
echo Setting up Backend API and Database Client...
echo ===============================================================================
cd /d "%~dp0..\backend"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend npm install failed!
    pause
    exit /b 1
)

echo Generating Prisma Client...
call npm run prisma:generate

echo Compiling Backend TypeScript...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Backend build failed!
    pause
    exit /b 1
)

:: 4. Setup Frontend
echo.
echo ===============================================================================
echo Setting up and Compiling Production Frontend SPA...
echo ===============================================================================
cd /d "%~dp0..\frontend"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend npm install failed!
    pause
    exit /b 1
)

echo Building Frontend Static Assets for Offline LAN Serving...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b 1
)

cd /d "%~dp0.."
echo.
echo ===============================================================================
echo              INSTALLATION & BUILD COMPLETED SUCCESSFULLY!
echo ===============================================================================
echo.
echo Next Steps:
echo 1. Verify your database password in .env:
echo    DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/radiant_hms?schema=public"
echo 2. Run "npx prisma db push" inside the backend folder to initialize tables.
echo 3. Run "scripts\start-hms.bat" to start the hospital portal on your LAN.
echo 4. Run "scripts\setup-firewall.bat" (as Administrator) to allow other hospital computers.
echo.
pause
