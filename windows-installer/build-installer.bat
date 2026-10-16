@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (
  echo Node.js is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)
call npm install || exit /b 1
call npm run dist:win || exit /b 1
echo.
echo Installer created in the dist folder.
pause
