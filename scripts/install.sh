#!/usr/bin/env bash
# Spirit-Panel installer (works with: bash scripts/install.sh)
set -euo pipefail
cd "$(dirname "$0")/.."
exec pnpm spirit-install "$@"
