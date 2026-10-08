#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ ! -f .env ]; then
  docker run --rm --user "$(id -u):$(id -g)" --mount "type=bind,source=$(pwd),target=/app" -w /app node:22-alpine node scripts/init-local.js
fi
docker compose --env-file .env up -d --build --wait --wait-timeout 180
echo 'Website dan database siap. Buka http://localhost:3000/catalog (port default).'
echo 'Login tim: http://localhost:3000/login. Password awal ada di .env lokal.'
