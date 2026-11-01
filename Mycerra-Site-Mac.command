#!/bin/bash
# Mycerra 사이트 보기 - Mac
# 더블클릭하면: 최신 내용 받기 -> 사이트 빌드 -> http://127.0.0.1:8080/ 에서 실제 공개 사이트와 같은 화면을 띄우고 브라우저를 연다.
# 이 파일은 저장소 폴더 안에 있어야 합니다. Dock이나 바탕화면에는 "가상본(alias)"을 두세요.

cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"

pause_exit() { echo; read -r -p "  엔터 키를 누르면 창이 닫힙니다..." _; exit "${1:-0}"; }

echo
echo "  =============================================="
echo "    Mycerra 사이트를 엽니다"
echo "  =============================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "  [오류] Node.js 가 설치되어 있지 않습니다."
  echo "         https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요."
  pause_exit 1
fi

# 운영 도구나 사이트 보기가 이미 켜져 있으면 브라우저만 연다
if node scripts/port-in-use.cjs 8080; then
  echo "  이미 실행 중입니다. 브라우저에서 사이트를 엽니다."
  open "http://127.0.0.1:8080/"
  exit 0
fi

if command -v git >/dev/null 2>&1; then
  echo "  [1/3] 최신 내용을 받는 중입니다 (git pull)..."
  git pull --ff-only || echo "  [주의] 최신 내용을 받지 못했습니다. 지금 Mac의 내용으로 엽니다."
else
  echo "  [주의] Git 이 없어 최신 내용을 받지 못합니다. 지금 Mac의 내용으로 엽니다."
fi

echo "  [2/3] 필요한 프로그램을 확인하는 중입니다..."
if ! node scripts/needs-install.cjs; then
  echo "         처음 실행이거나 구성이 바뀌어 설치합니다. 몇 분 걸릴 수 있습니다."
  if ! npm install --no-audit --no-fund; then
    echo
    echo "  [오류] 프로그램 설치에 실패했습니다. 인터넷 연결을 확인하고 다시 실행하세요."
    pause_exit 1
  fi
fi

echo
echo "  [3/3] 사이트를 만들고 엽니다 (10초 정도). 잠시 후 브라우저가 자동으로 열립니다."
echo "        주소: http://127.0.0.1:8080/"
echo
echo "        이 창이 켜져 있는 동안만 주소가 열립니다. 다 보셨으면 창을 닫으세요."
echo
npm run site

echo
echo "  사이트 보기가 종료되었습니다."
pause_exit 0
