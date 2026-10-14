#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci --cache "${NPM_CONFIG_CACHE:-${TMPDIR:-/tmp}/bien-vendre-npm-cache}" --no-audit --no-fund
npm run setup
