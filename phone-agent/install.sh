#!/usr/bin/env bash
# 전화 비서 브리지 설치 — Raspberry Pi OS (64-bit, Debian 13 "Trixie" 기반. 화면 없는 Lite 로 충분)
#
#   curl -fsSL https://raw.githubusercontent.com/kimyoonshik/mycelial-haven/claude/youthful-hamilton-8pwl6s/phone-agent/install.sh | bash
#
# sudo 가 되는 일반 사용자로 실행합니다(root 로 실행하지 않음). 여러 번 실행해도 되고, 다시 실행하면 최신 코드로 바뀝니다.
# 하는 일: 프로그램 설치(블루투스·PipeWire·파이썬) → 코드 받기 → 오디오·블루투스 설정 → 웹 화면 자동 실행 등록
# 설치 뒤 순서: phone-agent setup → phone-agent pair → phone-agent status → phone-agent probe <내 다른 전화번호>
set -euo pipefail

REPO_URL=${REPO_URL:-https://github.com/kimyoonshik/mycelial-haven.git}
BRANCH=${BRANCH:-claude/youthful-hamilton-8pwl6s}
SRC=$HOME/phone-agent-src
APP=$SRC/phone-agent
VENV=$HOME/.local/share/phone-agent/venv

say()  { printf '\n\033[1;32m▶ %s\033[0m\n' "$*"; }
warn() { printf '\n\033[1;33m! %s\033[0m\n' "$*"; }

if [ "$(id -u)" -eq 0 ]; then
  warn "root 가 아닌 일반 사용자로 실행하세요. (오디오와 웹 화면이 그 사용자 계정으로 돕니다)"
  exit 1
fi

say "프로그램 설치"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  git python3-venv bluez pipewire pipewire-bin wireplumber libspa-0.2-bluetooth dbus-user-session

# 휴대폰 발신 기능(Telephony)은 PipeWire 1.4 부터 들어 있습니다.
pw_version=$(pw-cat --version | awk 'END { print $NF }')
if ! dpkg --compare-versions "$pw_version" ge 1.4; then
  warn "PipeWire $pw_version 입니다. 1.4 이상이 필요합니다. 최신 Raspberry Pi OS(Trixie 기반)로 다시 설치해 주세요."
  exit 1
fi

say "코드 받기 ($BRANCH)"
if [ -d "$SRC/.git" ]; then
  git -C "$SRC" fetch -q --depth 1 origin "$BRANCH"
  git -C "$SRC" reset -q --hard FETCH_HEAD
else
  git clone -q --depth 1 --filter=blob:none --sparse --branch "$BRANCH" "$REPO_URL" "$SRC"
  git -C "$SRC" sparse-checkout set phone-agent
fi

say "파이썬 환경"
mkdir -p "$(dirname "$VENV")"
[ -x "$VENV/bin/pip" ] || python3 -m venv "$VENV"
"$VENV/bin/pip" install -q --upgrade pip
"$VENV/bin/pip" install -q -e "$APP"
sudo ln -sf "$VENV/bin/phone-agent" /usr/local/bin/phone-agent

say "오디오·블루투스 설정"
mkdir -p ~/.config/pipewire/pipewire.conf.d ~/.config/wireplumber/wireplumber.conf.d ~/.config/systemd/user
cp "$APP/system/pipewire.conf"    ~/.config/pipewire/pipewire.conf.d/50-phone-agent.conf
cp "$APP/system/wireplumber.conf" ~/.config/wireplumber/wireplumber.conf.d/50-phone-agent.conf
cp "$APP/system/phone-agent.service" ~/.config/systemd/user/phone-agent.service
sudo rfkill unblock bluetooth || true
sudo systemctl enable -q --now bluetooth

say "자동 실행 등록"
sudo loginctl enable-linger "$USER"      # 로그인하지 않아도 부팅하면 이 사용자의 서비스가 뜹니다
systemctl --user daemon-reload
systemctl --user enable -q pipewire.socket pipewire.service wireplumber.service phone-agent.service
systemctl --user restart pipewire.service wireplumber.service phone-agent.service

say "설치했습니다. 이어서 아래를 차례로 실행하세요."
cat <<'NEXT'
  phone-agent setup     이름·웹 화면 비밀번호·ElevenLabs API 키 입력
  phone-agent pair      아이폰과 블루투스 페어링
  phone-agent status    모든 항목이 [확인]인지 점검
  phone-agent probe 01012345678   (내 다른 전화나 사무실 전화로) 발신·음성 시험
NEXT
