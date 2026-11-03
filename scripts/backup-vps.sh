#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
if [ ! -f .env.production ]; then
  echo 'File .env.production belum ada.' >&2
  exit 1
fi
umask 077
mkdir -p .local/server-backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_dir=".local/server-backups/$stamp"
mkdir "$backup_dir"
docker compose --env-file .env.production -f compose.production.yaml exec -T db pg_dump -U florist -d bien_vendre -Fc > "$backup_dir/database.dump"
docker compose --env-file .env.production -f compose.production.yaml exec -T web tar -C /app/.local/uploads -czf - . > "$backup_dir/uploads.tar.gz"
if [ ! -s "$backup_dir/database.dump" ] || [ ! -s "$backup_dir/uploads.tar.gz" ]; then
  echo 'Backup tidak lengkap. Periksa layanan sebelum melanjutkan.' >&2
  exit 1
fi
echo "Backup database dan foto dibuat di $backup_dir. Simpan salinan aman di luar VPS."
