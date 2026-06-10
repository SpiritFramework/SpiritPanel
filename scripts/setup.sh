#!/usr/bin/env bash
# Deprecated alias — use ./install or pnpm spirit-install
set -euo pipefail
cd "$(dirname "$0")/.."
exec pnpm spirit-install "$@"
