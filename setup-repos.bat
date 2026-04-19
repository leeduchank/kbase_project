@echo off
REM KBase Repository Setup Script for Windows
REM Usage: setup-repos.bat

echo ==================================
echo KBase Repository Setup
echo ==================================

echo.
echo This script will setup git for each service.
echo You will need to provide GitHub repository URLs.
echo.

set /p confirm="Continue? (y/N): "
if /i not "%confirm%"=="y" goto :cancel

echo.
echo Setting up kbase-discovery-server...
cd kbase-discovery-server
if exist ".git" rmdir /s /q .git
git init
git add .
git commit -m "Initial commit"
set /p repo_url="Enter GitHub URL for kbase-discovery-server: "
if defined repo_url (
    git remote add origin %repo_url%
    git push -u origin main
)
cd ..

echo.
echo Setting up kbase-auth-service...
cd kbase-auth-service
if exist ".git" rmdir /s /q .git
git init
git add .
git commit -m "Initial commit"
set /p repo_url="Enter GitHub URL for kbase-auth-service: "
if defined repo_url (
    git remote add origin %repo_url%
    git push -u origin main
)
cd ..

echo.
echo Setting up kbase-api-gateway...
cd kbase-api-gateway
if exist ".git" rmdir /s /q .git
git init
git add .
git commit -m "Initial commit"
set /p repo_url="Enter GitHub URL for kbase-api-gateway: "
if defined repo_url (
    git remote add origin %repo_url%
    git push -u origin main
)
cd ..

echo.
echo Setting up kbase-project-service...
cd kbase-project-service
if exist ".git" rmdir /s /q .git
git init
git add .
git commit -m "Initial commit"
set /p repo_url="Enter GitHub URL for kbase-project-service: "
if defined repo_url (
    git remote add origin %repo_url%
    git push -u origin main
)
cd ..

echo.
echo Setting up kbase-storage-service...
cd kbase-storage-service
if exist ".git" rmdir /s /q .git
git init
git add .
git commit -m "Initial commit"
set /p repo_url="Enter GitHub URL for kbase-storage-service: "
if defined repo_url (
    git remote add origin %repo_url%
    git push -u origin main
)
cd ..

echo.
echo Setting up kbase-frontend...
cd kbase-frontend
if exist ".git" rmdir /s /q .git
git init
git add .
git commit -m "Initial commit"
set /p repo_url="Enter GitHub URL for kbase-frontend: "
if defined repo_url (
    git remote add origin %repo_url%
    git push -u origin main
)
cd ..

echo.
echo Setting up kbase-infrastructure...
cd kbase-infrastructure
if exist ".git" rmdir /s /q .git
git init
git add .
git commit -m "Initial commit"
set /p repo_url="Enter GitHub URL for kbase-infrastructure: "
if defined repo_url (
    git remote add origin %repo_url%
    git push -u origin main
)
cd ..

echo.
echo ==================================
echo All repositories setup complete!
echo ==================================
echo.
echo Next steps:
echo 1. Configure GitHub Secrets for each repository
echo 2. Setup EC2 infrastructure
echo 3. Test CI/CD pipelines
echo.
echo Happy coding! 🚀
goto :end

:cancel
echo Operation cancelled.

:end