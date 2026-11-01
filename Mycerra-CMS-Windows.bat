@echo off
chcp 65001 >nul
title Mycerra 운영 도구
rem Mycerra 운영 도구(CMS) 실행 파일 - Windows
rem 더블클릭하면: 최신 내용 받기 -> 필요하면 프로그램 설치 -> 운영 도구 실행 -> 브라우저 자동 열림
rem 이 파일은 저장소(mycelial-haven) 폴더 안에 있어야 합니다. 바탕화면에는 "바로 가기"를 만들어 두세요.
cd /d "%~dp0"

echo.
echo  ==============================================
echo    Mycerra 운영 도구를 시작합니다
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
where git >nul 2>nul
if errorlevel 1 (
  echo  [오류] Git 이 설치되어 있지 않습니다.
  echo         https://git-scm.com 에서 설치한 뒤 다시 실행하세요.
  echo.
  pause
  exit /b 1
)

echo  [1/3] 최신 내용을 받는 중입니다...
node scripts\update.cjs

echo  [2/3] 필요한 프로그램을 확인하는 중입니다...
node scripts\needs-install.cjs
if errorlevel 1 (
  echo         처음 실행이거나 구성이 바뀌어 설치합니다. 몇 분 걸릴 수 있습니다.
  call npm ci --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo  [오류] 프로그램 설치에 실패했습니다. 인터넷 연결을 확인하고 다시 실행하세요.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo  [3/3] 운영 도구를 엽니다. 잠시 후 브라우저가 자동으로 열립니다.
echo        열리지 않으면 브라우저에서 http://127.0.0.1:8080/admin/content 로 접속하세요.
echo.
echo        작업이 끝나면 이 검은 창을 닫으세요 ^(또는 Ctrl+C^).
echo        게시하지 않은 수정은 PC에만 남습니다. 게시 탭에서 [게시]까지 눌러 주세요.
echo.
call npm run cms -- --open /admin/content

echo.
echo  운영 도구가 종료되었습니다.
pause
