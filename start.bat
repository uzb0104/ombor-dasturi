@echo off
title Ombor Dasturi - Mahalliy Server
echo ===================================================
echo   Ombor va Do'kon Boshqaruvi Dasturi Ishga Tushmoqda...
echo ===================================================
echo.

:: Backend serverni orqa fonda ishga tushirish
cd backend
start /b node server.js

:: 2 sek kutiladi
timeout /t 2 /nobreak >nul

:: Frontend serverni ishga tushirish va brauzerda ochish
cd ..
start http://localhost:4173
npm run preview -- --port 4173 --host
