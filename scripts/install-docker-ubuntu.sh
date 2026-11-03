#!/usr/bin/env sh
set -eu
if [ "$(id -u)" -ne 0 ]; then echo 'Jalankan dengan sudo atau sebagai root.' >&2; exit 1; fi
if [ -r /etc/os-release ]; then . /etc/os-release; fi
if [ "${ID:-}" != ubuntu ]; then echo 'Skrip ini khusus Ubuntu; instal Docker sesuai dokumentasi OS Anda.' >&2; exit 1; fi
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo 'Docker dan plugin Compose sudah tersedia.'
  exit 0
fi
apt-get update
apt-get install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
arch=$(dpkg --print-architecture)
suite=${UBUNTU_CODENAME:-${VERSION_CODENAME:-}}
if [ -z "$suite" ]; then echo 'Nama versi Ubuntu tidak ditemukan.' >&2; exit 1; fi
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $suite
Components: stable
Architectures: $arch
Signed-By: /etc/apt/keyrings/docker.asc
EOF
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker compose version
