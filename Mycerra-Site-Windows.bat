@echo off
chcp 65001 >nul
title Mycerra 사이트 보기
rem Mycerra 사이트 보기 - Windows
rem 더블클릭하면: 최신 내용 받기 -> 사이트 빌드 -> http://127.0.0.1:8080/ 에서 실제 공개 사이트와 같은 화면을 띄우고 브라우저를 연다.
rem 이 파일은 저장소 폴더 안에 있어야 합니다. 바탕화면에는 "바로 가기"를 만들어 두세요.
cd /d "%~dp0"

echo.
echo  ==============================================
echo    Mycerra 사이트를 엽니다
echo  ==============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [오류] Node.js 가 설치되어 있지 않습니다.
  echo         https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요.
  echo.
  pause
  exit /b 1
)

rem 운영 도구나 사이트 보기가 이미 켜져 있으면 브라우저만 연다
node scripts\port-in-use.cjs 8080
if not errorlevel 1 (
  echo  이미 실행 중입니다. 브라우저에서 사이트를 엽니다.
  start "" http://127.0.0.1:8080/
  timeout /t 3 >nul
  exit /b 0
)

where git >nul 2>nul
if errorlevel 1 (
  echo  [주의] Git 이 없어 최신 내용을 받지 못합니다. 지금 PC의 내용으로 엽니다.
) else (
  echo  [1/3] 최신 내용을 받는 중입니다 ^(git pull^)...
  git pull --ff-only
  if errorlevel 1 echo  [주의] 최신 내용을 받지 못했습니다. 지금 PC의 내용으로 엽니다.
)

echo  [2/3] 필요한 프로그램을 확인하는 중입니다...
node scripts\needs-install.cjs
if errorlevel 1 (
  echo         처음 실행이거나 구성이 바뀌어 설치합니다. 몇 분 걸릴 수 있습니다.
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo  [오류] 프로그램 설치에 실패했습니다. 인터넷 연결을 확인하고 다시 실행하세요.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo  [3/3] 사이트를 만들고 엽니다 ^(10초 정도^). 잠시 후 브라우저가 자동으로 열립니다.
echo        주소: http://127.0.0.1:8080/
echo.
echo        이 창이 켜져 있는 동안만 주소가 열립니다. 다 보셨으면 창을 닫으세요.
echo.
call npm run site

echo.
echo  사이트 보기가 종료되었습니다.
pause
