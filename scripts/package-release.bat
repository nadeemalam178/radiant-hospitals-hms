@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo         RADIANT HOSPITALS HMS - PRODUCTION RELEASE PACKAGER
echo ===============================================================================
echo.

set ROOT_DIR=%~dp0..
set BUILD_DIR=%ROOT_DIR%\dist-release
set RELEASE_NAME=radiant-hms-v1.0.0
set STAGING_DIR=%BUILD_DIR%\%RELEASE_NAME%
set ZIP_FILE=%BUILD_DIR%\%RELEASE_NAME%.zip

echo [1/5] Building Frontend and Backend production artifacts...
cd /d "%ROOT_DIR%"
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed. Fix compiler errors before packaging.
    exit /b 1
)

echo.
echo [2/5] Preparing clean staging directory: %STAGING_DIR% ...
if exist "%STAGING_DIR%" rmdir /s /q "%STAGING_DIR%"
if exist "%ZIP_FILE%" del /f /q "%ZIP_FILE%"
mkdir "%STAGING_DIR%"
mkdir "%STAGING_DIR%\backend"
mkdir "%STAGING_DIR%\backend\dist"
mkdir "%STAGING_DIR%\backend\prisma"
mkdir "%STAGING_DIR%\frontend"
mkdir "%STAGING_DIR%\frontend\dist"
mkdir "%STAGING_DIR%\scripts"
mkdir "%STAGING_DIR%\docs"

echo.
echo [3/5] Copying clean runtime files into distribution package...

:: Backend compiled code & configuration
xcopy /e /i /y "%ROOT_DIR%\backend\dist" "%STAGING_DIR%\backend\dist" >nul
xcopy /e /i /y "%ROOT_DIR%\backend\prisma" "%STAGING_DIR%\backend\prisma" >nul
copy /y "%ROOT_DIR%\backend\package.json" "%STAGING_DIR%\backend\" >nul
copy /y "%ROOT_DIR%\backend\package-lock.json" "%STAGING_DIR%\backend\" >nul

:: CRITICAL SECURITY: Never copy developer's private .env file; copy .env.example as .env.template
copy /y "%ROOT_DIR%\backend\.env.example" "%STAGING_DIR%\backend\.env.template" >nul

:: Frontend pre-compiled static assets
xcopy /e /i /y "%ROOT_DIR%\frontend\dist" "%STAGING_DIR%\frontend\dist" >nul

:: Automation & Operations scripts
copy /y "%ROOT_DIR%\scripts\install-windows.bat" "%STAGING_DIR%\scripts\" >nul
copy /y "%ROOT_DIR%\scripts\start-hms.bat" "%STAGING_DIR%\scripts\" >nul
copy /y "%ROOT_DIR%\scripts\stop-hms.bat" "%STAGING_DIR%\scripts\" >nul
copy /y "%ROOT_DIR%\scripts\setup-firewall.bat" "%STAGING_DIR%\scripts\" >nul
copy /y "%ROOT_DIR%\scripts\backup-db.bat" "%STAGING_DIR%\scripts\" >nul
copy /y "%ROOT_DIR%\scripts\restore-db.bat" "%STAGING_DIR%\scripts\" >nul

:: Root scripts and documentation
copy /y "%ROOT_DIR%\package.json" "%STAGING_DIR%\" >nul
xcopy /e /i /y "%ROOT_DIR%\docs" "%STAGING_DIR%\docs" >nul
copy /y "%ROOT_DIR%\README.md" "%STAGING_DIR%\" >nul

echo.
echo [4/5] Compressing into client distribution ZIP archive...
powershell -Command "Compress-Archive -Path '%STAGING_DIR%' -DestinationPath '%ZIP_FILE%' -Force"
if %errorlevel% neq 0 (
    echo [ERROR] Failed to generate release ZIP archive!
    exit /b 1
)

echo.
echo [5/5] Cleaning up temporary staging files...
rmdir /s /q "%STAGING_DIR%"

echo.
echo ===============================================================================
echo [SUCCESS] CLIENT DISTRIBUTION PACKAGE GENERATED!
echo ===============================================================================
echo File: %ZIP_FILE%
echo.
echo This ZIP archive contains pre-compiled assets, versioned migrations,
echo sanitized configuration templates, and operations scripts for Windows.
echo ===============================================================================
echo.
