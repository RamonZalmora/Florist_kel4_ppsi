#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
if [ ! -f .env.production ]; then
  echo 'File .env.production belum ada.' >&2
  exit 1
fi
if [ -n "$(git status --porcelain --untracked-files=normal)" ]; then
  echo 'Ada perubahan lokal di VPS. Simpan atau commit dahulu sebelum update.' >&2
  exit 1
fi
sh scripts/backup-vps.sh
git pull --ff-only origin main
docker compose --env-file .env.production -f compose.production.yaml up -d --build
docker compose --env-file .env.production -f compose.production.yaml ps
echo 'Pembaruan dimulai. Periksa website dan kesehatan layanan.'
