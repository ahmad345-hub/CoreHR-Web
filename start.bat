@echo off
echo ╔═══════════════════════════════════════╗
echo ║        CoreHR React — Starting        ║
echo ╚═══════════════════════════════════════╝
echo.

REM Start backend
echo [1/2] Starting Express backend on http://localhost:5000 ...
start "CoreHR Backend" cmd /k "cd /d %~dp0backend && node src/app.js"

REM Wait a moment then start frontend
timeout /t 2 /nobreak > nul
echo [2/2] Starting React frontend on http://localhost:3000 ...
start "CoreHR Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ✅ CoreHR is starting up!
echo    Frontend: http://localhost:3000
echo    API:      http://localhost:5000
echo.
echo Login: admin / admin123
pause
