#!/usr/bin/env bash
# Raise nginx open-file / connection limits so L7 load does not trip
# "Too many open files" (errno 24) and start returning 500s for static assets.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MAIN_SNIPPET_SRC="${REPO_ROOT}/deploy/nginx/spirit-panel-main-nofile.conf"
MAIN_SNIPPET_DEST="/etc/nginx/spirit-panel-main-nofile.conf"

install -m 644 "$MAIN_SNIPPET_SRC" "$MAIN_SNIPPET_DEST"

if ! grep -qF 'spirit-panel-main-nofile.conf' /etc/nginx/nginx.conf; then
  # Insert after the pid line (still in main context, before events/http).
  if grep -qE '^[[:space:]]*pid[[:space:]]' /etc/nginx/nginx.conf; then
    sed -i '/^[[:space:]]*pid[[:space:]]/a include /etc/nginx/spirit-panel-main-nofile.conf;' /etc/nginx/nginx.conf
  else
    sed -i '1a include /etc/nginx/spirit-panel-main-nofile.conf;' /etc/nginx/nginx.conf
  fi
  echo "Included ${MAIN_SNIPPET_DEST} from nginx.conf"
fi

# Bump worker_connections if it is still the common Ubuntu default (768).
if grep -qE 'worker_connections[[:space:]]+768[[:space:]]*;' /etc/nginx/nginx.conf; then
  sed -i 's/worker_connections[[:space:]]\+768[[:space:]]*;/worker_connections 4096;/' /etc/nginx/nginx.conf
  echo "Raised worker_connections to 4096"
fi

mkdir -p /etc/systemd/system/nginx.service.d
cat >/etc/systemd/system/nginx.service.d/override.conf <<'EOF'
[Service]
LimitNOFILE=65535
EOF

systemctl daemon-reload
nginx -t
systemctl restart nginx
echo "nginx restarted with LimitNOFILE=65535 and worker_rlimit_nofile 65535"
echo "Confirm: cat /proc/\$(pgrep -o nginx)/limits | grep 'open files'"
