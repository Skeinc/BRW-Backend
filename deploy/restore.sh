#!/bin/sh
# Restore the database and uploads from a backup directory created by backup.sh.
# Usage (on the server, in the deploy dir): sh deploy/restore.sh <backup-name>   e.g. 20261024-030000
set -eu

name=${1:?Usage: sh deploy/restore.sh <backup-name>}
dir="backups/$name"
[ -f "$dir/db.dump" ] && [ -f "$dir/uploads.tar.gz" ] || { echo "Backup $dir is incomplete" >&2; exit 1; }

dc="docker compose --env-file .env.production -f docker-compose.prod.yml"

echo "This REPLACES the current database and uploads with $name. Ctrl+C to abort."
sleep 5

$dc stop web api
$dc exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < "$dir/db.dump"
$dc run --rm --no-deps --entrypoint sh -v "$PWD/$dir:/restore:ro" api \
  -c 'rm -rf /app/uploads/* /app/uploads/.[!.]* 2>/dev/null; tar -xzf /restore/uploads.tar.gz -C /app/uploads'
$dc up -d
echo "Restored $name"
