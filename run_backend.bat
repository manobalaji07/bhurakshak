@echo off
title BhuRakshak Backend API Server
echo Starting BhuRakshak FastAPI Backend Server on http://localhost:8000 ...
cd /d %~dp0backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
