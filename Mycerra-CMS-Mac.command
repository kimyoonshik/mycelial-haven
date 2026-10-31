#!/bin/bash
# Mycerra 운영 도구(CMS) 실행 파일 - Mac
# 더블클릭하면: 최신 내용 받기 -> 필요하면 프로그램 설치 -> 운영 도구 실행 -> 브라우저 자동 열림
# 이 파일은 저장소(mycelial-haven) 폴더 안에 있어야 합니다. Dock이나 바탕화면에는 "가상본(alias)"을 두세요.

cd "$(dirname "$0")" || exit 1

# 터미널에서 더블클릭으로 열면 PATH가 짧을 수 있어 흔한 설치 위치를 더한다 (Homebrew, nvm, 공식 설치 파일)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"

pause_exit() { echo; read -r -p "  엔터 키를 누르면 창이 닫힙니다..." _; exit "${1:-0}"; }

echo
echo "  =============================================="
echo "    Mycerra 운영 도구를 시작합니다"
echo "  =============================================="
echo

if ! command -v node >/dev/null 2>&1; then
  echo "  [오류] Node.js 가 설치되어 있지 않습니다."
  echo "         https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요."
  pause_exit 1
fi
if ! command -v git >/dev/null 2>&1; then
  echo "  [오류] Git 이 설치되어 있지 않습니다."
  echo "         터미널에서 xcode-select --install 을 실행하거나 https://git-scm.com 에서 설치하세요."
  pause_exit 1
fi

echo "  [1/3] 최신 내용을 받는 중입니다 (git pull)..."
if ! git pull --ff-only; then
  echo
  echo "  [주의] 최신 내용을 받지 못했습니다."
  echo "         인터넷 연결, GitHub 로그인, 게시하지 않은 변경이 있는지 확인하세요."
  echo "         지금 Mac에 있는 내용으로 계속 진행합니다."
  echo
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
echo "  [3/3] 운영 도구를 엽니다. 잠시 후 브라우저가 자동으로 열립니다."
echo "        열리지 않으면 브라우저에서 http://127.0.0.1:8080/admin/content 로 접속하세요."
echo
echo "        작업이 끝나면 이 창에서 Control+C 를 누르거나 창을 닫으세요."
echo "        게시하지 않은 수정은 Mac에만 남습니다. 게시 탭에서 [게시]까지 눌러 주세요."
echo
npm run cms -- --open /admin/content

echo
echo "  운영 도구가 종료되었습니다."
pause_exit 0
