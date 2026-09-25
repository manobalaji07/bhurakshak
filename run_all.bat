@echo off
title BhuRakshak Full Stack Launcher
echo ======================================================================
echo  BHURAKSHAK -- UNDERGROUND MINE MONITORING ^& AI COMMAND CENTER
echo ======================================================================
echo.
echo Starting FastAPI Backend Server (Port 8000)...
start "BhuRakshak Backend API (Port 8000)" cmd /k "cd /d %~dp0backend && py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

echo Starting React Vite Frontend Dashboard (Port 5173)...
start "BhuRakshak Frontend UI (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ======================================================================
echo  Both servers launched successfully!
echo  - Frontend Dashboard : http://localhost:5173
echo  - Backend API Docs   : http://localhost:8000/docs
echo ======================================================================
echo.
pause
