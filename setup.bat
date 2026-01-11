@echo off
REM VoiceForge AI - Windows Setup Script

echo.
echo 🎙️  VoiceForge AI - Setup Script (Windows)
echo ============================================
echo.

REM Check Node.js
echo Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js not found. Please install from https://nodejs.org
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% found
echo.

REM Check npm
echo Checking npm installation...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm not found.
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo ✅ npm %NPM_VERSION% found
echo.

REM Install dependencies
echo 📦 Installing dependencies...
echo This may take a minute...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install dependencies
    exit /b 1
)

echo ✅ Dependencies installed successfully!
echo.
echo ============================================
echo ✅ Setup Complete!
echo.
echo Next steps:
echo 1. Start development server:
echo    npm run dev
echo.
echo 2. Open in your browser:
echo    http://localhost:8000
echo.
echo 3. Try generating your first audio! 🎉
echo.
echo For more information:
echo - Quick Start: QUICKSTART.md
echo - Full Docs: README.md
echo - Developer Guide: DEVELOPMENT.md
echo - Architecture: ARCHITECTURE.md
echo.
pause
