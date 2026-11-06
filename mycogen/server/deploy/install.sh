#!/usr/bin/env bash
# 마이코젠 홈페이지 서버 설치 — 사내 Ubuntu 서버(22.04 / 24.04, 192.168.0.38)
#
#   sudo bash install.sh
#
# 여러 번 실행해도 됩니다(이미 된 단계는 건너뜀).
# 처음 실행하면 GitHub 배포 키를 등록하라는 안내와 함께 멈춥니다. 등록한 뒤 같은 명령을 다시 실행하세요.
# 하는 일: 프로그램 설치(git·nginx·PostgreSQL·Node.js 22) → 서버 계정·폴더 → 저장소 받기 → DB 만들기
#          → 설정 파일(/etc/mycogen/server.env) → nginx(127.0.0.1:8080) → 자동 실행·자동 업데이트·매일 백업 등록
# 인터넷 쪽 연결(Cloudflare Tunnel)은 HOSTING.md 의 순서대로 따로 합니다.
set -euo pipefail

REPO_URL=${REPO_URL:-git@github.com:kimyoonshik/mycelial-haven.git}
BRANCH=${BRANCH:-main}
BASE=/srv/mycogen
APP=$BASE/app
ENV_FILE=/etc/mycogen/server.env

say()  { printf '\n\033[1;32m▶ %s\033[0m\n' "$*"; }
warn() { printf '\n\033[1;33m! %s\033[0m\n' "$*"; }
as_app() { runuser -u mycogen -- env HOME="$BASE" "$@"; }
pg_admin() { (cd / && runuser -u postgres -- "$@"); }

[ "$(id -u)" -eq 0 ] || { echo "관리자 권한이 필요합니다: sudo bash $0"; exit 1; }
. /etc/os-release
[ "${ID:-}" = ubuntu ] || warn "Ubuntu 가 아닙니다(${PRETTY_NAME:-알 수 없음}). 계속 진행하지만 결과를 꼭 확인하세요."
HAS_SYSTEMD=0; [ -d /run/systemd/system ] && HAS_SYSTEMD=1

say "1/8 기본 프로그램 (git, nginx, PostgreSQL)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q git nginx postgresql ca-certificates curl gnupg openssl

say "2/8 Node.js (20 이상 필요, 없으면 22 LTS 설치)"
node_major=0
command -v node >/dev/null && node_major=$(node -p 'process.versions.node.split(".")[0]')
if [ "$node_major" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -q nodejs
fi
echo "node $(node -v), npm $(npm -v)"

say "3/8 서버 계정(mycogen)과 폴더"
id mycogen >/dev/null 2>&1 || useradd --system --home-dir "$BASE" --shell /usr/sbin/nologin mycogen
install -d -o mycogen -g mycogen -m 755 "$BASE" "$BASE/www" "$BASE/data" "$BASE/data/uploads"
install -d -o mycogen -g mycogen -m 700 "$BASE/.ssh" /var/backups/mycogen
install -d -o root -g mycogen -m 750 /etc/mycogen

say "4/8 GitHub 저장소 받기 ($REPO_URL, $BRANCH)"
if [ ! -d "$APP/.git" ]; then
  if [[ $REPO_URL == git@github.com:* ]]; then
    [ -f "$BASE/.ssh/id_ed25519" ] || as_app ssh-keygen -q -t ed25519 -N '' -C "mycogen-server@$(hostname)" -f "$BASE/.ssh/id_ed25519"
    grep -qs '^github.com ' "$BASE/.ssh/known_hosts" || as_app sh -c "ssh-keyscan -t ed25519,rsa github.com >> '$BASE/.ssh/known_hosts' 2>/dev/null"
    if ! as_app git ls-remote --quiet "$REPO_URL" HEAD >/dev/null 2>&1; then
      warn "GitHub 배포 키(읽기 전용)를 등록해야 저장소를 받을 수 있습니다."
      cat <<EOF

  1) GitHub 저장소 kimyoonshik/mycelial-haven → Settings → Deploy keys → Add deploy key
  2) Title: mycogen-server (192.168.0.38)
     Key: 아래 한 줄을 그대로 붙여넣기 ('Allow write access'는 체크하지 않음)

$(cat "$BASE/.ssh/id_ed25519.pub")

  3) 저장한 뒤 이 명령을 다시 실행: sudo bash $0
EOF
      exit 2
    fi
  fi
  # mycogen 폴더만 받습니다(저장소의 다른 프로젝트는 받지 않음).
  as_app git clone --quiet --filter=blob:none --sparse --branch "$BRANCH" "$REPO_URL" "$APP"
  as_app git -C "$APP" sparse-checkout set mycogen
else
  echo "이미 받아 둠: $(as_app git -C "$APP" log -1 --format='%h %s')"
fi

say "5/8 서버 프로그램 패키지 (npm ci)"
(cd "$APP/mycogen" && as_app npm ci --omit=dev --no-audit --no-fund --loglevel=error)

say "6/8 PostgreSQL 데이터베이스 (mycogen)"
NEW_DB_PASS=''
if [ ! -f "$ENV_FILE" ]; then
  NEW_DB_PASS=$(openssl rand -hex 24)
  if [ "$(pg_admin psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='mycogen'")" = 1 ]; then
    pg_admin psql -qc "ALTER ROLE mycogen WITH LOGIN PASSWORD '$NEW_DB_PASS'"
  else
    pg_admin psql -qc "CREATE ROLE mycogen WITH LOGIN PASSWORD '$NEW_DB_PASS'"
  fi
fi
[ "$(pg_admin psql -tAc "SELECT 1 FROM pg_database WHERE datname='mycogen'")" = 1 ] || pg_admin createdb -O mycogen mycogen
echo "DB 준비됨"

say "7/8 설정 파일 ($ENV_FILE)"
NEW_ADMIN_PASS=''
if [ ! -f "$ENV_FILE" ]; then
  NEW_ADMIN_PASS=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | cut -c1-16)
  sed -e "s|^DATABASE_URL=.*|DATABASE_URL=postgres://mycogen:$NEW_DB_PASS@127.0.0.1:5432/mycogen|" \
      -e "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$NEW_ADMIN_PASS|" \
      -e "s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -hex 32)|" \
      "$APP/mycogen/server/server.env.example" > "$ENV_FILE"
  chown root:mycogen "$ENV_FILE"; chmod 640 "$ENV_FILE"
  echo "새로 만듦 (메일·Turnstile·Claude API 키는 나중에 채움)"
else
  echo "이미 있음: 그대로 둡니다"
fi

say "8/8 nginx 와 자동 실행 등록"
install -m 644 "$APP/mycogen/server/deploy/nginx-mycogen.conf" /etc/nginx/sites-available/mycogen
ln -sf /etc/nginx/sites-available/mycogen /etc/nginx/sites-enabled/mycogen
nginx -t
if [ "$HAS_SYSTEMD" = 1 ]; then
  for u in mycogen.service mycogen-update.service mycogen-update.timer mycogen-backup.service mycogen-backup.timer; do
    install -m 644 "$APP/mycogen/server/deploy/$u" "/etc/systemd/system/$u"
  done
  systemctl daemon-reload
  systemctl enable --now postgresql nginx >/dev/null
  systemctl reload nginx
  systemctl enable mycogen mycogen-update.timer mycogen-backup.timer >/dev/null
  systemctl restart mycogen
  systemctl start mycogen-update.timer mycogen-backup.timer
  printf '사이트 확인 중'
  code=000
  for _ in $(seq 1 30); do
    code=$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: www.mycogen.co.kr' http://127.0.0.1:8080/ || true)
    [ "$code" = 200 ] && break
    printf '.'; sleep 1
  done
  echo
  if [ "$code" = 200 ]; then echo "사이트 응답 정상 (http://127.0.0.1:8080)"; else warn "사이트가 아직 응답하지 않습니다. 확인: journalctl -u mycogen -n 50"; fi
else
  warn "systemd 가 없는 환경이라 자동 실행 등록은 건너뜁니다. 직접 실행: cd $APP/mycogen && set -a && . $ENV_FILE && set +a && node server/server.mjs"
fi

say "설치 완료"
if [ -n "$NEW_ADMIN_PASS" ]; then
  cat <<EOF
  관리 페이지 로그인 (이 비밀번호는 지금 한 번만 보여 줍니다. 안전한 곳에 적어 두세요)
    아이디: admin
    비밀번호: $NEW_ADMIN_PASS
    바꾸려면: sudo nano $ENV_FILE  (ADMIN_PASSWORD) → sudo systemctl restart mycogen
EOF
fi
cat <<EOF

  다음 순서 (HOSTING.md 참고)
    1. Cloudflare Tunnel 연결: www.mycogen.co.kr → http://127.0.0.1:8080, info.mycogen.co.kr → http://127.0.0.1:4781
    2. $ENV_FILE 에 메일(SMTP)·Turnstile·Claude API 키 채우기 → sudo systemctl restart mycogen
    3. 상태 확인: systemctl status mycogen / journalctl -u mycogen -f
EOF
