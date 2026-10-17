@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo            DATABASE RESTORATION TOOL - RADIANT HOSPITALS HMS
echo ===============================================================================
echo Hospital: Radiant Hospital & Research Institute (RHRI)
echo.
echo [WARNING] Restoring a database backup will OVERWRITE existing records with
echo the contents of the backup file! Transactions made after this backup will be lost.
echo.

set /p BACKUP_PATH="Enter the full path to the .sql backup file to restore: "

if not exist "%BACKUP_PATH%" (
    echo [ERROR] Specified backup file does not exist: %BACKUP_PATH%
    pause
    exit /b 1
)

:: Locate psql executable
set PSQL_BIN=psql.exe
where %PSQL_BIN% >nul 2>nul
if %errorlevel% neq 0 (
    set FOUND=0
    for %%v in (18 17 16 15 14) do (
        if exist "C:\Program Files\PostgreSQL\%%v\bin\psql.exe" (
            set PSQL_BIN="C:\Program Files\PostgreSQL\%%v\bin\psql.exe"
            set FOUND=1
            goto :found_psql
        )
    )
    if !FOUND! equ 0 (
        echo [ERROR] psql executable could not be found!
        echo Please ensure PostgreSQL client tools are installed and in PATH.
        pause
        exit /b 1
    )
)
:found_psql

echo.
set /p CONFIRM="Type RESTORE in capital letters to confirm and overwrite radiant_hms database: "
if not "%CONFIRM%"=="RESTORE" (
    echo Restoration cancelled by user.
    pause
    exit /b 0
)

if "%PGPASSWORD%"=="" (
    set /p PGPASSWORD="Enter PostgreSQL password for user postgres: "
)

echo.
echo Restoring database from %BACKUP_PATH% ...
%PSQL_BIN% -U postgres -h localhost -p 5432 -d radiant_hms -f "%BACKUP_PATH%"

if %errorlevel% equ 0 (
    echo.
    echo ===============================================================================
    echo [SUCCESS] Database restored successfully!
    echo ===============================================================================
) else (
    echo.
    echo [ERROR] Restoration failed with error code %errorlevel%!
)

pause
