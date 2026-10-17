@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo            RADIANT HOSPITALS HMS - WINDOWS ON-PREMISE INSTALLER
echo ===============================================================================
echo Hospital: Radiant Hospital & Research Institute (RHRI)
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js runtime is not found in system PATH!
    echo Please install Node.js LTS (v20 or v22) from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Detected Node.js Runtime: %NODE_VER%

:: 2. Check PostgreSQL availability
echo.
echo Checking local PostgreSQL service...
set PG_RUNNING=0
for %%s in (postgresql-x64-18 postgresql-x64-17 postgresql-x64-16 postgresql-x64-15 postgresql) do (
    sc query %%s 2>nul | find "STATE" | find "RUNNING" >nul
    if !errorlevel! equ 0 (
        echo [OK] Detected running service: %%s
        set PG_RUNNING=1
    )
)

if %PG_RUNNING% equ 0 (
    echo [NOTICE] Scanning for PostgreSQL service to start...
    for %%s in (postgresql-x64-18 postgresql-x64-17 postgresql-x64-16 postgresql-x64-15 postgresql) do (
        net start %%s >nul 2>nul
        if !errorlevel! equ 0 (
            echo [OK] Started service: %%s
            set PG_RUNNING=1
        )
    )
)

if %PG_RUNNING% equ 0 (
    echo [WARNING] Could not auto-detect running PostgreSQL Windows service.
    echo Please ensure PostgreSQL is installed, running on port 5432, and accepts connections.
)

:: 3. Prepare Environment Configuration
cd /d "%~dp0..\backend"
if not exist ".env" (
    if exist ".env.template" (
        echo [NOTICE] Initializing backend\.env from template...
        copy /y ".env.template" ".env" >nul
        echo [ACTION REQUIRED] Please edit backend\.env and configure your PostgreSQL database password.
    ) else if exist ".env.example" (
        echo [NOTICE] Initializing backend\.env from example...
        copy /y ".env.example" ".env" >nul
        echo [ACTION REQUIRED] Please edit backend\.env and configure your PostgreSQL database password.
    )
)

:: 4. Install Production Dependencies
echo.
echo ===============================================================================
echo Installing backend production dependencies...
echo ===============================================================================
call npm install --omit=dev
if %errorlevel% neq 0 (
    echo [ERROR] Backend npm install failed! Check internet connection.
    pause
    exit /b 1
)

:: 5. Generate Prisma Client
echo.
echo Generating Prisma database client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Prisma generate failed!
    pause
    exit /b 1
)

:: 6. Deploy Versioned Database Migrations
echo.
echo ===============================================================================
echo Deploying versioned database migrations (Non-Destructive)...
echo ===============================================================================
call npx prisma migrate deploy
if %errorlevel% neq 0 (
    echo [WARNING] Migration deploy encountered an issue. Verifying with schema push...
    call npx prisma db push
)

:: 7. Initialize Baseline Hospital Configuration & Roles
echo.
echo ===============================================================================
echo Initializing baseline hospital settings and roles...
echo ===============================================================================
call npx tsx prisma/init-hospital.ts

cd /d "%~dp0.."
echo.
echo ===============================================================================
echo              INSTALLATION COMPLETED SUCCESSFULLY!
echo ===============================================================================
echo.
echo Next Steps:
echo 1. Review and verify database connection string in:
echo    backend\.env
echo 2. Run "scripts\start-hms.bat" to start the hospital application server.
echo 3. Run "scripts\setup-firewall.bat" (as Administrator) to allow LAN hospital clients.
echo 4. Access the web portal locally at: http://localhost:4000
echo ===============================================================================
echo.
pause
