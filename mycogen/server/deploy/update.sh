#!/usr/bin/env bash
# GitHub main 에 새 내용이 있으면 받아서 서버를 다시 켭니다(다시 켜면 사이트도 새로 만들어짐).
# mycogen-update.timer 가 5분마다 root 로 실행합니다. 손으로 바로 반영하려면: sudo systemctl start mycogen-update
set -euo pipefail
BASE=/srv/mycogen
APP=$BASE/app
as_app() { runuser -u mycogen -- env HOME="$BASE" "$@"; }

cd "$APP"
as_app git fetch --quiet origin main
old=$(as_app git rev-parse HEAD)
new=$(as_app git rev-parse origin/main)
if [ "$old" = "$new" ]; then exit 0; fi

deps_changed=$(as_app git diff --name-only "$old" "$new" -- mycogen/package.json mycogen/package-lock.json)
# 서버 쪽 사본은 고치지 않는 것이 원칙이라, main 과 똑같이 맞춥니다.
as_app git reset --hard --quiet origin/main
if [ -n "$deps_changed" ]; then
  (cd "$APP/mycogen" && as_app npm ci --omit=dev --no-audit --no-fund)
fi
systemctl restart mycogen
echo "업데이트: ${old:0:7} → ${new:0:7}"
