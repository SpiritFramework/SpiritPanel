#!/usr/bin/env bash
# Lock panel origin 80/443 to Cloudflare edge IPs only.
# Use when panel.example.com is orange-clouded so attackers cannot flood the
# server IP and bypass Cloudflare challenges / WAF.
#
# Keeps OpenSSH reachable from anywhere (change that if you use a bastion).
# FeatherWings nodes must reach the panel via the Cloudflare hostname (HTTPS),
# not the origin IP, once this is enabled.
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (sudo)." >&2
  exit 1
fi

command -v ufw >/dev/null 2>&1 || { echo "ufw is required" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 1; }

echo "Fetching Cloudflare IP ranges..."
mapfile -t CF_V4 < <(curl -fsSL https://www.cloudflare.com/ips-v4)
mapfile -t CF_V6 < <(curl -fsSL https://www.cloudflare.com/ips-v6)

ufw allow OpenSSH comment 'Spirit Panel admin SSH' || true

# Drop previous Spirit CF allow rules so re-runs stay idempotent.
while ufw status numbered | grep -E 'Spirit CF origin' >/dev/null 2>&1; do
  num="$(ufw status numbered | grep -E 'Spirit CF origin' | head -1 | sed -n 's/^\[\([0-9]\+\)\].*/\1/p')"
  [[ -n "$num" ]] || break
  yes | ufw delete "$num" >/dev/null
done

# Prefer deleting broad Nginx Full if present — replace with CF-only.
ufw delete allow 'Nginx Full' >/dev/null 2>&1 || true
ufw delete allow 80/tcp >/dev/null 2>&1 || true
ufw delete allow 443/tcp >/dev/null 2>&1 || true

for cidr in "${CF_V4[@]}"; do
  [[ -n "$cidr" ]] || continue
  ufw allow proto tcp from "$cidr" to any port 80,443 comment 'Spirit CF origin'
done
for cidr in "${CF_V6[@]}"; do
  [[ -n "$cidr" ]] || continue
  ufw allow proto tcp from "$cidr" to any port 80,443 comment 'Spirit CF origin'
done

ufw --force enable
ufw reload
echo
ufw status numbered
echo
echo "Origin 80/443 now accept Cloudflare only."
echo "Confirm DNS is Proxied (orange cloud) before relying on this."
echo "Restore public HTTP(S): sudo ufw allow 'Nginx Full' && remove Spirit CF origin rules."
