@echo off
REM VoiceMaster Server Startup Script
REM This ensures server runs from correct directory

echo ========================================
echo VoiceMaster AI - Server Startup
echo ========================================
echo.

REM Navigate to src directory
cd /d "%~dp0src"

echo Current Directory: %CD%
echo.

REM Check if files exist
echo Checking files...
if exist "index.html" (
    echo [OK] index.html found
) else (
    echo [ERROR] index.html NOT found! Wrong directory?
    pause
    exit /b 1
)

if exist "public\tts-web\piper-tts-web.js" (
    echo [OK] piper-tts-web.js found
) else (
    echo [ERROR] piper-tts-web.js NOT found!
    pause
    exit /b 1
)

if exist "public\tts-web\onnx\zh_CN-huayan-medium.onnx" (
    echo [OK] Chinese voice model found
) else (
    echo [WARN] Chinese voice model not found
)

echo.
echo ========================================
echo Starting HTTP Server on port 8080...
echo ========================================
echo.
echo Open browser to: http://localhost:8080
echo.
echo Press Ctrl+C to stop server
echo.

REM Start HTTP server
npx http-server -p 8080 --cors

pause
