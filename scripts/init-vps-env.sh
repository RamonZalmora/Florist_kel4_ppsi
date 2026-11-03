#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
if [ -e .env.production ]; then
  echo 'File .env.production sudah ada dan tidak ditimpa.'
  exit 0
fi
if ! command -v openssl >/dev/null 2>&1; then
  echo 'OpenSSL diperlukan untuk membuat password database.' >&2
  exit 1
fi
umask 077
password=$(openssl rand -hex 32)
printf 'SITE_ADDRESS=bienvendre.id\nPOSTGRES_PASSWORD=%s\n' "$password" > .env.production
chmod 600 .env.production
echo 'Konfigurasi privat .env.production dibuat untuk bienvendre.id.'
