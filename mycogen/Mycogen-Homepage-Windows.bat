@echo off
chcp 65001 >nul
title Mycogen Homepage
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [!] Node.js가 설치되어 있지 않습니다.
  echo      https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요.
  echo.
  start "" https://nodejs.org/ko/download
  pause
  exit /b 1
)
echo.
echo  마이코젠 홈페이지를 엽니다...
echo  브라우저가 열리지 않으면 http://127.0.0.1:4777/site/ 로 접속하세요.
echo  이 창을 닫으면 종료됩니다.
echo.
node editor\server.mjs --site
if errorlevel 1 pause
