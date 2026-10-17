@echo off
setlocal

echo ===============================================================================
echo            DATABASE RESTORATION TOOL - RADIANT HOSPITALS HMS
echo ===============================================================================
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

echo.
set /p CONFIRM="Type RESTORE to confirm and overwrite radiant_hms database: "
if not "%CONFIRM%"=="RESTORE" (
    echo Restoration cancelled by user.
    pause
    exit /b 0
)

echo.
echo Restoring database from %BACKUP_PATH% ...
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -h localhost -p 5432 -d radiant_hms -f "%BACKUP_PATH%"

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Database restored successfully!
) else (
    echo.
    echo [ERROR] Restoration failed with error code %errorlevel%!
)

pause
