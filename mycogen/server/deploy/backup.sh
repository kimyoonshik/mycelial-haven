#!/usr/bin/env bash
# 매일 DB와 관리 페이지에서 올린 이미지를 백업하고, 30일이 지난 백업은 지웁니다.
# mycogen-backup.timer 가 mycogen 계정으로 실행합니다(server.env 의 DATABASE_URL 사용).
# 되살리기: pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" /var/backups/mycogen/db-날짜.dump
set -euo pipefail
DIR=${BACKUP_DIR:-/var/backups/mycogen}
KEEP_DAYS=${BACKUP_KEEP_DAYS:-30}
UPLOADS=${UPLOAD_DIR:-/srv/mycogen/data/uploads}
stamp=$(date +%Y%m%d-%H%M)
umask 077

pg_dump --format=custom --no-owner --file="$DIR/db-$stamp.dump" "$DATABASE_URL"
if [ -d "$UPLOADS" ]; then
  tar -czf "$DIR/uploads-$stamp.tgz" -C "$(dirname "$UPLOADS")" "$(basename "$UPLOADS")"
fi
find "$DIR" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'uploads-*.tgz' \) -mtime +"$KEEP_DAYS" -delete
echo "백업 완료: $DIR/db-$stamp.dump"
