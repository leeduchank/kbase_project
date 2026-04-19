@echo off
REM KBase Simple Migration Script for Windows
REM Usage: migrate.bat

echo ==================================
echo KBase Simple Migration
echo ==================================

echo.
echo This script will:
echo 1. Create service directories
echo 2. Copy files to each service directory
echo 3. Remove root .git
echo 4. Initialize git for each service
echo.

set /p confirm="Continue? (y/N): "
if /i not "%confirm%"=="y" goto :cancel

echo.
echo Creating service directories...

if not exist "kbase-discovery-server" mkdir kbase-discovery-server
if not exist "kbase-auth-service" mkdir kbase-auth-service
if not exist "kbase-api-gateway" mkdir kbase-api-gateway
if not exist "kbase-project-service" mkdir kbase-project-service
if not exist "kbase-storage-service" mkdir kbase-storage-service
if not exist "kbase-frontend" mkdir kbase-frontend
if not exist "kbase-infrastructure" mkdir kbase-infrastructure

echo.
echo Copying files...

if exist "kbase-discovery-server" (
    xcopy "kbase-discovery-server\*.*" "kbase-discovery-server\" /E /I /H /Y 2>nul
)
if exist "kbase-auth-service" (
    xcopy "kbase-auth-service\*.*" "kbase-auth-service\" /E /I /H /Y 2>nul
)
if exist "kbase-api-gateway" (
    xcopy "kbase-api-gateway\*.*" "kbase-api-gateway\" /E /I /H /Y 2>nul
)
if exist "kbase-project-service" (
    xcopy "kbase-project-service\*.*" "kbase-project-service\" /E /I /H /Y 2>nul
)
if exist "kbase-storage-service" (
    xcopy "kbase-storage-service\*.*" "kbase-storage-service\" /E /I /H /Y 2>nul
)
if exist "frontend" (
    xcopy "frontend\*.*" "kbase-frontend\" /E /I /H /Y 2>nul
)
if exist "docker-compose.yml" (
    copy "docker-compose.yml" "kbase-infrastructure\" >nul
)

echo.
echo Removing root .git...
if exist ".git" rmdir /s /q .git

echo.
echo ==================================
echo Migration complete!
echo ==================================
echo.
echo Next steps:
echo 1. Create GitHub repositories for each service
echo 2. Run setup-repos.bat to initialize git for each service
echo 3. Push each service to its GitHub repository
echo.
echo Happy migrating! 🚀
goto :end

:cancel
echo Operation cancelled.

:end