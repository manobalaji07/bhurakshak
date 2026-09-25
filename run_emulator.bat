@echo off
title BhuRakshak Gateway Telemetry Emulator
echo Launching BhuRakshak ESP32 Gateway Telemetry Emulator (HTTP REST)...
cd /d %~dp0backend
python simulation/gateway_emulator.py
pause
