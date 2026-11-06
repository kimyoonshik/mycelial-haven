#!/bin/bash
# 마이코젠 홈페이지 편집기 (Mac) — 더블클릭으로 실행
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo " [!] Node.js가 설치되어 있지 않습니다."
  echo "     https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요."
  open "https://nodejs.org/ko/download"
  read -r -p "엔터를 누르면 창이 닫힙니다."
  exit 1
fi
echo ""
echo " 마이코젠 홈페이지 편집기를 시작합니다..."
echo " 브라우저가 열리지 않으면 http://127.0.0.1:4777 로 접속하세요."
echo " 이 창을 닫으면 편집기가 종료됩니다."
echo ""
node editor/server.mjs
