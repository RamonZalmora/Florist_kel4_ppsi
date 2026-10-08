#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/init-local.js
npm ci --cache "${NPM_CONFIG_CACHE:-${TMPDIR:-/tmp}/bien-vendre-npm-cache}" --no-audit --no-fund
docker compose --env-file .env up -d --wait db
npm run db:migrate
npm run db:seed
npm run build
