#!/bin/sh
# Daily backup of Postgres (pg_dump custom format) and uploads (tar.gz) into /backups/<timestamp>/.
# Runs forever and fires at BACKUP_HOUR (container time, UTC). `sh backup.sh once` runs a single backup now.
set -u

BACKUP_DIR=${BACKUP_DIR:-/backups}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-14}
BACKUP_HOUR=${BACKUP_HOUR:-03}

run_backup() {
  ts=$(date +%Y%m%d-%H%M%S)
  tmp="$BACKUP_DIR/.tmp-$ts"
  mkdir -p "$tmp" || return 1
  pg_dump -Fc -f "$tmp/db.dump" || { rm -rf "$tmp"; return 1; }
  tar -czf "$tmp/uploads.tar.gz" -C /uploads . || { rm -rf "$tmp"; return 1; }
  mv "$tmp" "$BACKUP_DIR/$ts" || return 1
  find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '2*' -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
  echo "backup $ts done"
}

if [ "${1:-}" = "once" ]; then
  run_backup
  exit $?
fi

while true; do
  now=$(date +%s)
  next=$(date -d "$(date +%F) $BACKUP_HOUR:00:00" +%s)
  [ "$next" -le "$now" ] && next=$((next + 86400))
  sleep $((next - now))
  run_backup || echo "backup FAILED" >&2
done
