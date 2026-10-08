#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .local/backups
backup=".local/backups/bien-vendre-$(date -u +%Y%m%dT%H%M%SZ).sql"
umask 077
docker compose --env-file .env exec -T db pg_dump -U florist -d bien_vendre > "$backup"
test -s "$backup"
echo "Database backup saved under .local/backups (ignored by Git)."
