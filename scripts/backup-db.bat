@echo off
setlocal enabledelayedexpansion

echo ===============================================================================
echo            AUTOMATED POSTGRESQL BACKUP - RADIANT HOSPITALS HMS
echo ===============================================================================
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

:: Set password for non-interactive backup execution
if "%PGPASSWORD%"=="" set PGPASSWORD=Samsung@s24

:: Execute pg_dump
"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe" -U postgres -h localhost -p 5432 -F p -b -v -f "%BACKUP_FILE%" radiant_hms

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Database backup completed successfully!
    echo File: %BACKUP_FILE%
) else (
    echo.
    echo [ERROR] Backup failed with error code %errorlevel%!
    echo Check database credentials, service status, or disk space.
)

:: Retention Policy: Delete backups older than 30 days
echo.
echo Enforcing 30-day retention cleanup...
forfiles /p "%BACKUP_DIR%" /m *.sql /d -30 /c "cmd /c del @path" 2>nul
echo Retention policy applied.
echo.
pause
