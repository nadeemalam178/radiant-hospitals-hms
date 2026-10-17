@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo            AUTOMATED POSTGRESQL BACKUP - RADIANT HOSPITALS HMS
echo ===============================================================================
echo Hospital: Radiant Hospital & Research Institute (RHRI)
echo.

set BACKUP_DIR=%~dp0..\backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Generate Timestamp (YYYYMMDD_HHMMSS)
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set BACKUP_FILE=%BACKUP_DIR%\radiant_hms_backup_%TIMESTAMP%.sql

echo Target Database: radiant_hms
echo Backup Destination: %BACKUP_FILE%
echo.

:: Locate pg_dump executable
set PGDUMP_BIN=pg_dump.exe
where %PGDUMP_BIN% >nul 2>nul
if %errorlevel% neq 0 (
    set FOUND=0
    for %%v in (18 17 16 15 14) do (
        if exist "C:\Program Files\PostgreSQL\%%v\bin\pg_dump.exe" (
            set PGDUMP_BIN="C:\Program Files\PostgreSQL\%%v\bin\pg_dump.exe"
            set FOUND=1
            goto :found_pgdump
        )
    )
    if !FOUND! equ 0 (
        echo [ERROR] pg_dump executable could not be found!
        echo Please ensure PostgreSQL client tools are installed and in PATH.
        pause
        exit /b 1
    )
)
:found_pgdump

:: Read PGPASSWORD or prompt if unset
if "%PGPASSWORD%"=="" (
    echo Note: You can set PGPASSWORD in your environment or enter it below:
    set /p PGPASSWORD="Enter PostgreSQL password for user postgres: "
)

:: Execute pg_dump
%PGDUMP_BIN% -U postgres -h localhost -p 5432 -F p -b -v -f "%BACKUP_FILE%" radiant_hms

if %errorlevel% equ 0 (
    echo.
    echo ===============================================================================
    echo [SUCCESS] Database backup completed successfully!
    echo Backup File: %BACKUP_FILE%
    echo ===============================================================================
) else (
    echo.
    echo [ERROR] Backup failed with error code %errorlevel%!
    echo Check database credentials, service status, or disk space.
)

:: Retention Policy: Delete backups older than 30 days
echo.
echo Enforcing 30-day backup retention policy...
forfiles /p "%BACKUP_DIR%" /m *.sql /d -30 /c "cmd /c del @path" 2>nul
echo Retention policy applied.
echo.
pause
