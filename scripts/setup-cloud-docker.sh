#!/usr/bin/env bash
# Cloud runner only: forward its existing proxy and trusted CA during builds.
# Laptop users should use setup-docker.ps1 or setup-docker.sh instead.
set -euo pipefail
cd "$(dirname "$0")/.."
export DOCKER_CONFIG="${DOCKER_CONFIG:-/workspace/.docker}"
mkdir -p .local
python - <<'PY'
import json, os, pathlib, socket, urllib.parse
build = {"network": "host"}
args, hosts = {}, {}
for name in ["HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY"]:
    value = os.environ.get(name)
    if not value:
        continue
    args[name] = "${" + name + "}"
    if name != "NO_PROXY":
        hostname = urllib.parse.urlsplit(value).hostname
        if hostname:
            hosts[hostname] = socket.gethostbyname(hostname)
if args:
    build["args"] = args
if hosts:
    build["extra_hosts"] = hosts
config = {"services": {"web": {"build": build}}}
bundle = pathlib.Path('/etc/ssl/certs/ca-certificates.crt')
if bundle.is_file():
    build['secrets'] = ['npm_ca']
    config['secrets'] = {'npm_ca': {'file': str(bundle)}}
# Only variable names and DNS mappings are written, never proxy credentials.
pathlib.Path('.local/cloud-compose.json').write_text(json.dumps(config))
PY
export COMPOSE_FILE="$(pwd)/compose.yaml:$(pwd)/.local/cloud-compose.json"
bash scripts/setup-docker.sh
