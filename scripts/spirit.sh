#!/usr/bin/env bash
#
# Spirit-Panel — one-command installer & updater
#
#   curl -fsSL https://raw.githubusercontent.com/SpiritFramework/SpiritPanel/main/scripts/spirit.sh -o /tmp/spirit.sh
#   sudo bash /tmp/spirit.sh
#
# Do NOT use: sudo bash <(curl ...)
# sudo closes inherited fds, so /dev/fd/N from process substitution vanishes.
#
# Interactive menu by default. Non-interactive:
#   sudo bash /tmp/spirit.sh install --domain panel.example.com --admin-email you@example.com -y
#   sudo bash /tmp/spirit.sh update -y
#
set -uo pipefail

SCRIPT_VERSION="2.0.2"

REPO_URL="${SPIRIT_REPO_URL:-https://github.com/SpiritFramework/SpiritPanel.git}"
REPO_SLUG="${SPIRIT_REPO_SLUG:-SpiritFramework/SpiritPanel}"
APP_USER="${SPIRIT_APP_USER:-spiritpanel}"
INSTALL_DIR="${SPIRIT_INSTALL_DIR:-/home/${APP_USER}/Spirit-Panel}"
SERVICE_NAME="spirit-panel-api"
NGINX_SITE="spirit-panel"
BACKUP_DIR="${SPIRIT_BACKUP_DIR:-/var/backups/spirit-panel}"
NODE_MAJOR=20
PNPM_VERSION=9
SUDOERS_FILE="/etc/sudoers.d/spirit-panel-install"

LINK_GITHUB="github.com/${REPO_SLUG}"
LINK_DISCORD="discord.gg/tyR6FF8u2a"
LINK_DOCS="github.com/${REPO_SLUG}/tree/main/docs"

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'
  C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_RED=$'\033[31m'
else
  C_RESET=""; C_BOLD=""; C_DIM=""; C_CYAN=""; C_GREEN=""; C_YELLOW=""; C_RED=""
fi

STEP=0
step() { STEP=$((STEP + 1)); printf '%s==>%s %s%s%s\n' "$C_CYAN" "$C_RESET" "$C_BOLD" "[$STEP] $*" "$C_RESET"; }
ok()   { printf '    %s+%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
info() { printf '    %s-%s %s\n' "$C_DIM" "$C_RESET" "$*"; }
warn() { printf '    %s!%s %s\n' "$C_YELLOW" "$C_RESET" "$*"; }
die()  { printf '\n%sError:%s %s\n\n' "$C_RED" "$C_RESET" "$*" >&2; exit 1; }

cleanup() {
  rm -f "$SUDOERS_FILE" 2>/dev/null || true
  [[ -n "${SPIRIT_SELF_COPY:-}" && -f "${SPIRIT_SELF_COPY:-}" ]] && rm -f "$SPIRIT_SELF_COPY" 2>/dev/null || true
}
trap cleanup EXIT
trap 'cleanup; exit 130' INT TERM HUP

banner() {
  clear 2>/dev/null || true
  printf '%s' "$C_CYAN"
  cat <<'ART'
     ____  ____ ___ ____  ___ _____
    / ___||  _ \_ _|  _ \|_ _|_   _|
    \___ \| |_) | || |_) || |  | |
     ___) |  __/| ||  _ < | |  | |
    |____/|_|  |___|_| \_\___| |_|
ART
  printf '%s' "$C_RESET"
  printf '    %sP A N E L%s\n\n' "$C_BOLD" "$C_RESET"
  printf '  %sScript Version:%s %s%s%s\n\n' "$C_BOLD" "$C_RESET" "$C_CYAN" "$SCRIPT_VERSION" "$C_RESET"

  local rows=(
    "Github:   ${LINK_GITHUB}"
    "Discord:  ${LINK_DISCORD}"
    "Docs:     ${LINK_DOCS}"
  )
  local w=0 r
  for r in "${rows[@]}"; do (( ${#r} > w )) && w=${#r}; done
  local bar
  bar="$(printf '%*s' "$((w + 4))" '' | tr ' ' '-')"
  printf '  +%s+\n' "$bar"
  for r in "${rows[@]}"; do
    printf '  |  %-*s  |\n' "$w" "$r"
  done
  printf '  +%s+\n\n' "$bar"
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

require_root() {
  [[ "$(id -u)" -eq 0 ]] || die "Run as root: sudo bash $0 $*"
}

detect_os() {
  [[ -f /etc/os-release ]] || die "No /etc/os-release — unsupported OS."
  # shellcheck disable=SC1091
  . /etc/os-release
  case "${ID:-}" in
    ubuntu|debian) ok "OS: ${PRETTY_NAME:-$ID}" ;;
    *) die "Supported OS: Ubuntu 22.04+ / Debian 12+. Found: ${PRETTY_NAME:-$ID}" ;;
  esac
}

is_installed() {
  [[ -f "${INSTALL_DIR}/apps/panel-api/package.json" ]]
}

panel_version() {
  local pkg="${INSTALL_DIR}/apps/panel-api/package.json"
  [[ -f "$pkg" ]] || { echo "unknown"; return; }
  sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$pkg" | head -n1
}

app_home() {
  getent passwd "$APP_USER" 2>/dev/null | cut -d: -f6
}

# Strip CR and surrounding quotes. Windows-edited .env files previously left
# a trailing " on DATABASE_URL so mysqldump saw spirit_panel" and failed.
env_get() {
  local key="$1" file="${INSTALL_DIR}/apps/panel-api/.env" val
  [[ -f "$file" ]] || return 1
  val="$(grep -E "^${key}=" "$file" | head -n1 | cut -d= -f2- | tr -d '\r')"
  val="${val#"${val%%[![:space:]]*}"}"
  val="${val%"${val##*[![:space:]]}"}"
  if [[ "${val}" == \"*\" ]]; then val="${val:1:${#val}-2}"
  elif [[ "${val}" == \'*\' ]]; then val="${val:1:${#val}-2}"
  fi
  printf '%s' "$val"
}

urldecode() {
  local s="${1//\\/\\\\}"
  printf '%b' "${s//%/\\x}"
}

cnf_escape() {
  local s="${1//\\/\\\\}"
  printf '%s' "${s//\"/\\\"}"
}

gen_secret() {
  openssl rand -base64 "${1:-32}" | tr -d '\n'
}

gen_password() {
  local n="${1:-24}" out
  out="$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom 2>/dev/null | head -c "$n")"
  [[ "${#out}" -eq "$n" ]] || out="$(openssl rand -base64 "$n" | tr -dc 'A-Za-z0-9' | head -c "$n")"
  printf '%s' "$out"
}

confirm() {
  local prompt="$1" default="${2:-n}" reply hint="[y/N]"
  [[ "$ASSUME_YES" == "1" ]] && return 0
  [[ ! -t 0 ]] && return 1
  [[ "$default" == "y" ]] && hint="[Y/n]"
  # Write the question to the real terminal so coloured banners cannot hide it.
  printf '  %s %s ' "$prompt" "$hint" >/dev/tty 2>/dev/null || printf '  %s %s ' "$prompt" "$hint"
  read -r reply || return 1
  reply="${reply:-$default}"
  [[ "$reply" =~ ^[Yy]$ ]]
}

ask() {
  local prompt="$1" default="${2:-}" reply
  [[ ! -t 0 ]] && { echo "$default"; return; }
  if [[ -n "$default" ]]; then
    printf '  %s [%s]: ' "$prompt" "$default" >/dev/tty 2>/dev/null || printf '  %s [%s]: ' "$prompt" "$default"
  else
    printf '  %s: ' "$prompt" >/dev/tty 2>/dev/null || printf '  %s: ' "$prompt"
  fi
  read -r reply || true
  echo "${reply:-$default}"
}

# Run a command as the panel user with a predictable environment.
# Non-login bash avoids broken .profile / nologin shells. PATH keeps the
# caller's entries (test stubs, distro tools) after our known prefixes.
# Always cd out of /root first — pnpm walks cwd upward looking for a
# workspace, and EACCES on scandir('/root') looks like "cannot run pnpm".
PNPM_BIN=""
as_app() {
  local home path_dirs workdir
  home="$(app_home)"
  path_dirs="/usr/local/bin:/usr/bin:/bin"
  [[ -n "$PNPM_BIN" ]] && path_dirs="$(dirname "$PNPM_BIN"):${path_dirs}"
  path_dirs="${path_dirs}:${PATH}"
  if [[ -n "$INSTALL_DIR" && -d "$INSTALL_DIR" ]]; then
    workdir="$INSTALL_DIR"
  elif [[ -n "$home" && -d "$home" ]]; then
    workdir="$home"
  else
    workdir="/tmp"
  fi
  runuser -u "$APP_USER" -- env \
    HOME="${home:-/home/${APP_USER}}" \
    USER="$APP_USER" \
    LOGNAME="$APP_USER" \
    PATH="$path_dirs" \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    COREPACK_HOME="${home:-/home/${APP_USER}}/.cache/node/corepack" \
    npm_config_cache="${home:-/home/${APP_USER}}/.npm" \
    bash --noprofile --norc -c "cd '${workdir}' && $1"
}

ensure_app_home() {
  local home d
  home="$(app_home)"
  [[ -n "$home" && -d "$home" ]] || return 0
  for d in .cache .cache/node .cache/node/corepack .local .local/share .local/state .config .npm; do
    mkdir -p "${home}/${d}" 2>/dev/null || true
  done
  chown "${APP_USER}:${APP_USER}" "$home" 2>/dev/null || true
  chown -R "${APP_USER}:${APP_USER}" \
    "${home}/.cache" "${home}/.local" "${home}/.config" "${home}/.npm" 2>/dev/null || true
}

acquire_lock() {
  command -v flock >/dev/null 2>&1 || return 0
  mkdir -p /var/lock 2>/dev/null || return 0
  exec 9>"/var/lock/spirit-panel.lock" 2>/dev/null || return 0
  flock -n 9 || die "Another spirit.sh run is already in progress.
If that is wrong, remove /var/lock/spirit-panel.lock and try again."
}

# ---------------------------------------------------------------------------
# Node / pnpm
# ---------------------------------------------------------------------------

node_major() {
  node -v 2>/dev/null | sed -n 's/^v\([0-9]*\).*/\1/p'
}

install_node() {
  local current
  current="$(node_major)"
  if [[ -n "$current" && "$current" -ge "$NODE_MAJOR" ]]; then
    ok "Node.js $(node -v)"
    return
  fi
  step "Installing Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null 2>&1 ||
    die "Failed to add the NodeSource repository"
  apt_install nodejs || die "Failed to install Node.js"
  [[ "$(node_major)" -ge "$NODE_MAJOR" ]] || die "Node.js ${NODE_MAJOR}+ required"
  ok "Node.js $(node -v)"
}

resolve_pnpm() {
  local candidate prefix onpath
  prefix="$(npm prefix -g 2>/dev/null || true)"
  onpath="$(command -v pnpm 2>/dev/null || true)"
  PNPM_BIN=""
  for candidate in /usr/local/bin/pnpm ${prefix:+"${prefix}/bin/pnpm"} "$onpath" /usr/bin/pnpm; do
    [[ -n "$candidate" && -x "$candidate" ]] || continue
    [[ "$(readlink -f "$candidate" 2>/dev/null)" == *corepack* ]] && continue
    PNPM_BIN="$candidate"
    return
  done
  PNPM_BIN="$onpath"
}

# A world-executable symlink in /usr/local/bin is useless if
# /usr/local/lib/node_modules is mode 700 — the panel user cannot traverse it.
repair_pnpm_permissions() {
  local groot target dir
  for dir in /usr/local /usr/local/bin /usr/local/lib /usr/local/lib/node_modules; do
    [[ -d "$dir" ]] && chmod a+rx "$dir" 2>/dev/null || true
  done
  groot="$(npm root -g --prefix /usr/local 2>/dev/null || npm root -g 2>/dev/null || true)"
  [[ -n "$groot" && -d "$groot" ]] && chmod a+rx "$groot" 2>/dev/null || true
  [[ -n "$groot" && -d "${groot}/pnpm" ]] && chmod -R a+rX "${groot}/pnpm" 2>/dev/null || true
  if [[ -n "$PNPM_BIN" ]]; then
    chmod a+rx "$PNPM_BIN" 2>/dev/null || true
    target="$(readlink -f "$PNPM_BIN" 2>/dev/null || true)"
    [[ -n "$target" && -e "$target" ]] && chmod a+rx "$target" 2>/dev/null || true
    dir="$(dirname "${target:-$PNPM_BIN}")"
    while [[ -n "$dir" && "$dir" != "/" && "$dir" != "." ]]; do
      chmod a+rx "$dir" 2>/dev/null || true
      [[ "$dir" == "/usr/local" || "$dir" == "/usr" ]] && break
      dir="$(dirname "$dir")"
    done
  fi
}

pnpm_usable() {
  id "$APP_USER" >/dev/null 2>&1 || return 0
  if [[ -n "$PNPM_BIN" ]]; then
    as_app "'${PNPM_BIN}' --version >/dev/null 2>&1"
  else
    as_app "command -v pnpm >/dev/null 2>&1 && pnpm --version >/dev/null 2>&1"
  fi
}

# Official standalone binary — no npm global prefix, no corepack, no
# /usr/local/lib/node_modules traversal. This is what fixed panels where
# `npm install -g` looked successful but spiritpanel still could not run pnpm.
install_pnpm_standalone() {
  local arch asset url dest="/usr/local/bin/pnpm" tmp
  case "$(uname -m)" in
    x86_64|amd64) arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *) return 1 ;;
  esac
  asset="pnpm-linuxstatic-${arch}"
  url="https://github.com/pnpm/pnpm/releases/download/v9.15.9/${asset}"

  mkdir -p /usr/local/bin
  chmod a+rx /usr/local /usr/local/bin 2>/dev/null || true
  tmp="$(mktemp)"
  info "Downloading ${asset}"
  if ! curl -fsSL "$url" -o "$tmp"; then
    rm -f "$tmp"
    return 1
  fi
  # Replace any broken symlink/shim sitting on the destination.
  rm -f "$dest"
  install -m 755 "$tmp" "$dest"
  rm -f "$tmp"
  PNPM_BIN="$dest"
  return 0
}

install_pnpm_via_npm() {
  local log
  log="$(mktemp)"
  mkdir -p /usr/local/bin /usr/local/lib 2>/dev/null || true
  chmod a+rx /usr/local /usr/local/bin /usr/local/lib 2>/dev/null || true

  if ! (umask 022; npm install -g --force --prefix /usr/local "pnpm@9" >"$log" 2>&1); then
    if ! (umask 022; npm install -g --force "pnpm@9" >"$log" 2>&1); then
      warn "npm install -g pnpm failed:"
      tail -n 20 "$log" | while IFS= read -r line; do info "$line"; done
      rm -f "$log"
      return 1
    fi
  fi
  rm -f "$log"
  hash -r 2>/dev/null || true
  resolve_pnpm
  repair_pnpm_permissions
  [[ -n "$PNPM_BIN" ]]
}

install_pnpm() {
  resolve_pnpm
  local resolved=""
  [[ -n "$PNPM_BIN" ]] && resolved="$(readlink -f "$PNPM_BIN" 2>/dev/null || true)"

  if [[ -n "$PNPM_BIN" && "$resolved" != *corepack* ]] && "$PNPM_BIN" --version >/dev/null 2>&1; then
    if pnpm_usable; then
      ok "pnpm $("$PNPM_BIN" --version 2>/dev/null)"
      return
    fi
    info "pnpm exists but ${APP_USER} cannot run it — repairing"
    repair_pnpm_permissions
    if pnpm_usable; then
      ok "pnpm $("$PNPM_BIN" --version 2>/dev/null) (permissions repaired)"
      return
    fi
    info "Installing a standalone pnpm binary into /usr/local/bin"
  elif [[ -n "$PNPM_BIN" ]]; then
    info "Replacing the corepack pnpm shim"
  else
    info "Installing pnpm"
  fi

  if install_pnpm_standalone; then
    ok "pnpm $("$PNPM_BIN" --version 2>/dev/null) (standalone)"
  elif install_pnpm_via_npm; then
    ok "pnpm $("$PNPM_BIN" --version 2>/dev/null)"
  else
    die "Failed to install pnpm.
Tried the standalone binary from GitHub and npm install -g.
Fix manually, then re-run update:
  curl -fsSL https://github.com/pnpm/pnpm/releases/download/v9.15.9/pnpm-linuxstatic-x64 -o /usr/local/bin/pnpm
  chmod 755 /usr/local/bin/pnpm
  runuser -u ${APP_USER} -- /usr/local/bin/pnpm --version"
  fi

  repair_pnpm_permissions
  if ! pnpm_usable; then
    warn "${APP_USER} still cannot run pnpm at ${PNPM_BIN}"
    info "As ${APP_USER}: $(as_app "'${PNPM_BIN}' --version" 2>&1 | tr '\n' ' ')"
    info "Node as ${APP_USER}: $(as_app 'command -v node; node -v' 2>&1 | tr '\n' ' ')"
    die "Stopped before installing dependencies. Nothing was restarted."
  fi
}

# ---------------------------------------------------------------------------
# System packages / user / source
# ---------------------------------------------------------------------------

apt_install() {
  DEBIAN_FRONTEND=noninteractive apt-get install -y -q "$@" >/dev/null
}

install_prerequisites() {
  step "Installing system packages"
  apt-get update -qq >/dev/null 2>&1 || true
  apt_install ca-certificates curl git gnupg unzip rsync openssl \
    mariadb-server mariadb-client redis-server nginx \
    certbot python3-certbot-nginx ||
    die "apt install failed"
  systemctl enable --now mariadb 2>/dev/null || systemctl enable --now mysql 2>/dev/null || true
  systemctl enable --now redis-server 2>/dev/null || systemctl enable --now redis 2>/dev/null || true
  systemctl enable --now nginx 2>/dev/null || true
  ok "MariaDB, Redis, nginx ready"
  install_node
  install_pnpm
}

create_app_user() {
  step "Preparing the ${APP_USER} user"
  if id "$APP_USER" >/dev/null 2>&1; then
    ok "User ${APP_USER} already exists"
  else
    adduser --disabled-password --gecos "" "$APP_USER" >/dev/null ||
      die "Failed to create user ${APP_USER}"
    ok "Created user ${APP_USER}"
  fi
  chmod o+x "/home/${APP_USER}" 2>/dev/null || true
}

fetch_source() {
  step "Fetching Spirit-Panel"
  if [[ -d "${INSTALL_DIR}/.git" ]]; then
    ok "Existing checkout at ${INSTALL_DIR}"
    return
  fi
  if is_installed; then
    ok "Existing install at ${INSTALL_DIR}"
    return
  fi
  mkdir -p "$(dirname "$INSTALL_DIR")"
  local ref_args=()
  [[ -n "$GIT_REF" ]] && ref_args=(--branch "$GIT_REF")
  git clone --depth 1 "${ref_args[@]}" "$REPO_URL" "$INSTALL_DIR" >/dev/null 2>&1 ||
    die "git clone failed from ${REPO_URL}"
  chown -R "${APP_USER}:${APP_USER}" "$INSTALL_DIR"
  ok "Cloned to ${INSTALL_DIR}"
}

# ---------------------------------------------------------------------------
# Redis / .env / panel install
# ---------------------------------------------------------------------------

configure_redis() {
  step "Securing Redis"
  local conf="/etc/redis/redis.conf"
  if [[ ! -f "$conf" ]]; then
    warn "No ${conf} — schedule worker will be disabled"
    REDIS_PASSWORD=""
    return
  fi

  local existing
  existing="$(sed -n 's/^requirepass[[:space:]]\+//p' "$conf" | tail -n1)"
  existing="${existing%[[:space:]]}"
  if [[ "$existing" == \"*\" ]]; then existing="${existing#\"}"; existing="${existing%\"}"
  elif [[ "$existing" == \'*\' ]]; then existing="${existing#\'}"; existing="${existing%\'}"
  fi

  if [[ -n "$existing" ]]; then
    REDIS_PASSWORD="$existing"
    ok "Reusing the existing Redis password"
  else
    REDIS_PASSWORD="$(gen_secret 32)"
    cp -p "$conf" "${conf}.spirit-panel.bak"
    if grep -qE '^[[:space:]]*#[[:space:]]*requirepass' "$conf"; then
      sed -i "0,/^[[:space:]]*#[[:space:]]*requirepass.*/s||requirepass ${REDIS_PASSWORD}|" "$conf"
    else
      printf '\n# Added by Spirit-Panel installer\nrequirepass %s\n' "$REDIS_PASSWORD" >> "$conf"
    fi
    ok "Set requirepass in ${conf}"
  fi

  systemctl restart redis-server 2>/dev/null || systemctl restart redis 2>/dev/null || true
  if REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli --no-auth-warning ping 2>/dev/null | grep -q PONG; then
    ok "Redis authenticated"
  else
    warn "Could not verify Redis auth — schedule worker will be disabled"
    REDIS_PASSWORD=""
  fi
}

set_env_value() {
  local file="$1" key="$2" value="$3" tmp
  tmp="$(mktemp)"
  KEY="$key" VALUE="$value" awk '
    BEGIN { key = ENVIRON["KEY"]; value = ENVIRON["VALUE"]; done = 0 }
    $0 ~ "^" key "=" && !done { print key "=\"" value "\""; done = 1; next }
    { print }
    END { if (!done) print key "=\"" value "\"" }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}

write_env_file() {
  step "Writing the environment file"
  local env_file="${INSTALL_DIR}/apps/panel-api/.env"
  local template="${INSTALL_DIR}/deploy/env/production.example"

  if [[ -f "$env_file" ]]; then
    ok "Keeping the existing .env"
    return
  fi
  [[ -f "$template" ]] || die "Missing ${template}"

  if [[ -z "$ADMIN_PASSWORD" ]]; then
    ADMIN_PASSWORD="$(gen_password 24)"
    ADMIN_PASSWORD_GENERATED=1
  elif [[ "${#ADMIN_PASSWORD}" -lt 12 ]]; then
    die "--admin-password must be at least 12 characters"
  fi

  ADMIN_EMAIL="${ADMIN_EMAIL:-admin@${PANEL_DOMAIN}}"

  mkdir -p "$(dirname "$env_file")"
  local old_umask
  old_umask="$(umask)"
  umask 077
  cp "$template" "$env_file"

  set_env_value "$env_file" JWT_SECRET "$(gen_secret 48)"
  set_env_value "$env_file" APP_KEY "$(gen_secret 32)"
  set_env_value "$env_file" API_URL "https://${PANEL_DOMAIN}"
  set_env_value "$env_file" PANEL_URL "https://${PANEL_DOMAIN}"
  set_env_value "$env_file" ADMIN_EMAIL "$ADMIN_EMAIL"
  set_env_value "$env_file" ADMIN_USERNAME "admin"
  set_env_value "$env_file" ADMIN_PASSWORD "$ADMIN_PASSWORD"

  if [[ -n "$REDIS_PASSWORD" ]]; then
    set_env_value "$env_file" REDIS_PASSWORD "$REDIS_PASSWORD"
    set_env_value "$env_file" DISABLE_SCHEDULE_WORKER "false"
  else
    set_env_value "$env_file" REDIS_PASSWORD ""
    set_env_value "$env_file" DISABLE_SCHEDULE_WORKER "true"
    warn "Schedule worker disabled (no working Redis auth)"
  fi

  chown "${APP_USER}:${APP_USER}" "$env_file"
  chmod 600 "$env_file"
  umask "$old_umask"
  ok "Wrote ${env_file}"
}

run_panel_installer() {
  step "Installing dependencies"
  ensure_app_home
  install_pnpm

  local base="cd '${INSTALL_DIR}' && unset NODE_ENV &&"
  as_app "${base} pnpm install --no-frozen-lockfile" ||
    die "pnpm install failed"
  ok "Dependencies installed"

  step "Configuring the panel"
  local args="--production --api-url 'https://${PANEL_DOMAIN}'"
  [[ -n "$ADMIN_PASSWORD" ]] && args+=" --admin-password '${ADMIN_PASSWORD}'"

  printf '%s ALL=(root) NOPASSWD: /usr/bin/mysql, /usr/bin/mariadb\n' "$APP_USER" > "$SUDOERS_FILE"
  chmod 440 "$SUDOERS_FILE"
  local rc=0
  as_app "${base} pnpm spirit-install ${args}" || rc=$?
  rm -f "$SUDOERS_FILE"
  [[ "$rc" -eq 0 ]] || die "Panel configuration failed (exit ${rc})"
  ok "Database, environment, and build ready"
}

# ---------------------------------------------------------------------------
# systemd / nginx / TLS
# ---------------------------------------------------------------------------

install_systemd() {
  step "Installing the systemd service"
  local src="${INSTALL_DIR}/deploy/systemd/${SERVICE_NAME}.service"
  local dest="/etc/systemd/system/${SERVICE_NAME}.service"
  [[ -f "$src" ]] || die "Missing ${src}"

  install -m 644 "$src" "$dest"
  sed -i \
    -e "s|^User=.*|User=${APP_USER}|" \
    -e "s|^Group=.*|Group=${APP_USER}|" \
    -e "s|^WorkingDirectory=.*|WorkingDirectory=${INSTALL_DIR}/apps/panel-api|" \
    -e "s|^EnvironmentFile=.*|EnvironmentFile=${INSTALL_DIR}/apps/panel-api/.env|" \
    "$dest"
  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME" >/dev/null 2>&1 || true
  systemctl restart "$SERVICE_NAME" || die "Failed to start ${SERVICE_NAME}. journalctl -u ${SERVICE_NAME} -n 50"
  ok "${SERVICE_NAME} enabled and started"
}

write_bootstrap_nginx() {
  local dest="$1"
  cat > "$dest" <<EOF
# Spirit-Panel — temporary HTTP bootstrap until certbot issues a certificate.
server {
    listen 80;
    listen [::]:80;
    server_name ${PANEL_DOMAIN};

    root ${INSTALL_DIR}/apps/panel-web/dist;
    index index.html;
    client_max_body_size 100M;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
  info "Wrote temporary HTTP vhost for ACME"
}

install_nginx() {
  step "Configuring nginx"
  local src="${INSTALL_DIR}/deploy/nginx/${NGINX_SITE}.conf"
  local dest="/etc/nginx/sites-available/${NGINX_SITE}"
  [[ -f "$src" ]] || die "Missing ${src}"

  if [[ -f "$dest" && "$FORCE_NGINX" != "1" ]]; then
    warn "${dest} exists — leaving your config untouched"
    info "Reference: ${src}"
  else
    install -m 644 "$src" "$dest"
    sed -i \
      -e "s|server_name .*;|server_name ${PANEL_DOMAIN};|g" \
      -e "s|root .*/apps/panel-web/dist;|root ${INSTALL_DIR}/apps/panel-web/dist;|g" \
      "$dest"
    ok "Wrote ${dest}"
  fi

  ln -sf "$dest" "/etc/nginx/sites-enabled/${NGINX_SITE}"
  rm -f /etc/nginx/sites-enabled/default

  if [[ "$WANT_TLS" == "1" && ! -d "/etc/letsencrypt/live/${PANEL_DOMAIN}" ]]; then
    write_bootstrap_nginx "$dest"
  fi

  nginx -t >/dev/null 2>&1 || { nginx -t || true; die "nginx config test failed"; }
  systemctl reload nginx || die "Failed to reload nginx"
  ok "nginx serving ${PANEL_DOMAIN}"
}

install_tls() {
  [[ "$WANT_TLS" == "1" ]] || { info "Skipping TLS (--no-tls)"; return; }
  if [[ -d "/etc/letsencrypt/live/${PANEL_DOMAIN}" ]]; then
    ok "TLS certificate already present"
    return
  fi

  step "Requesting Let's Encrypt certificate"
  local email="${LETSENCRYPT_EMAIL:-${ADMIN_EMAIL:-admin@${PANEL_DOMAIN}}}"
  if certbot --nginx -d "$PANEL_DOMAIN" --non-interactive --agree-tos -m "$email" >/dev/null 2>&1; then
    # Re-apply full config now that certs exist.
    local src="${INSTALL_DIR}/deploy/nginx/${NGINX_SITE}.conf"
    local dest="/etc/nginx/sites-available/${NGINX_SITE}"
    if [[ -f "$src" ]]; then
      install -m 644 "$src" "$dest"
      sed -i \
        -e "s|server_name .*;|server_name ${PANEL_DOMAIN};|g" \
        -e "s|root .*/apps/panel-web/dist;|root ${INSTALL_DIR}/apps/panel-web/dist;|g" \
        -e "s|panel.example.com|${PANEL_DOMAIN}|g" \
        "$dest"
      nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
    fi
    ok "TLS active for ${PANEL_DOMAIN}"
  else
    TLS_FAILED=1
    warn "certbot could not issue a certificate"
    info "Panel is serving HTTP. When DNS is ready:"
    info "  certbot --nginx -d ${PANEL_DOMAIN}"
  fi
}

fix_permissions() {
  chown -R "${APP_USER}:${APP_USER}" "$INSTALL_DIR"
  local env_file="${INSTALL_DIR}/apps/panel-api/.env"
  if [[ -f "$env_file" ]]; then
    chown "${APP_USER}:${APP_USER}" "$env_file"
    chmod 600 "$env_file"
  fi
  chmod o+x "/home/${APP_USER}" 2>/dev/null || true
  if [[ -d "${INSTALL_DIR}/apps/panel-web/dist" ]]; then
    chmod -R o+rX "${INSTALL_DIR}/apps/panel-web/dist"
  fi
}

health_check() {
  local tries="${1:-20}" i
  for ((i = 1; i <= tries; i++)); do
    curl -fsS --max-time 3 http://127.0.0.1:3000/health >/dev/null 2>&1 && return 0
    sleep 2
  done
  return 1
}

print_install_summary() {
  local scheme=https
  [[ "${TLS_FAILED:-0}" == "1" || "$WANT_TLS" != "1" ]] && scheme=http
  printf '\n%s%sSpirit-Panel is installed.%s\n\n' "$C_GREEN" "$C_BOLD" "$C_RESET"
  printf '  Panel        %s://%s\n' "$scheme" "$PANEL_DOMAIN"
  printf '  Version      %s\n' "$(panel_version)"
  printf '  Admin login  %s\n' "$ADMIN_EMAIL"
  if [[ "$ADMIN_PASSWORD_GENERATED" == "1" && -n "$ADMIN_PASSWORD" ]]; then
    printf '  Password     %s\n' "$ADMIN_PASSWORD"
    printf '\n  %sSave that password now — it is only stored in .env.%s\n' "$C_YELLOW" "$C_RESET"
  else
    printf '  Password     (the one you supplied)\n'
  fi
  printf '\n  Update:  curl -fsSL https://raw.githubusercontent.com/%s/main/scripts/spirit.sh -o /tmp/spirit.sh && sudo bash /tmp/spirit.sh update\n' "$REPO_SLUG"
  printf '  Logs:    journalctl -u %s -f\n\n' "$SERVICE_NAME"
}

# ---------------------------------------------------------------------------
# Backup / update source
# ---------------------------------------------------------------------------

backup_before_update() {
  step "Backing up"
  mkdir -p "$BACKUP_DIR"
  chmod 700 "$BACKUP_DIR"
  local stamp
  stamp="$(date +%Y%m%d-%H%M%S)"
  BACKUP_PATH="${BACKUP_DIR}/${stamp}"
  mkdir -p "$BACKUP_PATH"

  local env_file="${INSTALL_DIR}/apps/panel-api/.env"
  if [[ -f "$env_file" ]]; then
    cp -p "$env_file" "${BACKUP_PATH}/panel-api.env"
    ok "Saved .env"
  else
    warn "No .env found at ${env_file}"
  fi

  local url
  url="$(env_get DATABASE_URL || true)"
  if [[ -z "$url" ]]; then
    warn "No DATABASE_URL — skipping database dump"
    info "Backup: ${BACKUP_PATH}"
    return 0
  fi

  local rest creds hostport db user pass host port
  rest="${url#mysql://}"
  rest="${rest#mariadb://}"
  creds="${rest%@*}"
  hostport="${rest##*@}"
  db="${hostport#*/}"
  db="${db%%\?*}"
  db="${db//$'\r'/}"
  db="${db%\"}"; db="${db#\"}"
  db="${db%\'}"; db="${db#\'}"
  hostport="${hostport%%/*}"
  user="$(urldecode "${creds%%:*}")"
  pass="$(urldecode "${creds#*:}")"
  host="${hostport%%:*}"
  port="${hostport#*:}"
  [[ "$port" == "$host" || -z "$port" ]] && port=3306
  [[ -z "$host" ]] && host=127.0.0.1

  if [[ ! "$db" =~ ^[A-Za-z0-9_]+$ ]]; then
    warn "Invalid database name after parsing: '${db}'"
    confirm "Continue updating without a database backup?" "n" ||
      die "Cancelled. Back up manually, then re-run."
    info "Backup: ${BACKUP_PATH}"
    return 0
  fi

  if ! command -v mysqldump >/dev/null 2>&1; then
    warn "mysqldump not installed — skipping database dump"
    info "Backup: ${BACKUP_PATH}"
    return 0
  fi

  local out="${BACKUP_PATH}/${db}.sql"
  local err="${BACKUP_PATH}/mysqldump.err"
  local cnf="${BACKUP_PATH}/.my.cnf"
  local old_umask
  old_umask="$(umask)"
  umask 077
  cat > "$cnf" <<EOF
[client]
user="$(cnf_escape "$user")"
password="$(cnf_escape "$pass")"
host="$(cnf_escape "$host")"
port=${port}
EOF
  umask "$old_umask"

  local dumped=0
  if mysqldump --defaults-extra-file="$cnf" --single-transaction --quick \
    --routines --events "$db" > "$out" 2>"$err"; then
    dumped=1
  elif mysqldump --single-transaction --quick --routines --events "$db" \
    > "$out" 2>>"$err"; then
    dumped=1
    info "Used root socket authentication for the dump"
  fi
  rm -f "$cnf"

  if [[ "$dumped" == "1" ]]; then
    gzip -f "$out" 2>/dev/null || true
    rm -f "$err"
    ok "Dumped database '${db}'"
  else
    rm -f "$out"
    warn "Database dump failed for '${db}'"
    if [[ -s "$err" ]]; then
      local line
      while IFS= read -r line; do
        [[ -n "$line" ]] && printf '      %s\n' "$line"
      done < <(grep -v '^$' "$err" | head -n3)
      info "Full error: ${err}"
    fi
    confirm "Continue updating without a database backup?" "n" ||
      die "Cancelled. Back up manually, then re-run the update."
  fi
  info "Backup: ${BACKUP_PATH}"
}

update_source_git() {
  local before after target
  before="$(as_app "cd '${INSTALL_DIR}' && git rev-parse --short HEAD" 2>/dev/null || echo unknown)"

  if ! as_app "cd '${INSTALL_DIR}' && git diff --quiet HEAD -- . ':(exclude)pnpm-lock.yaml'" 2>/dev/null; then
    warn "Local modifications detected in ${INSTALL_DIR}"
    if confirm "Stash them and continue?" "n"; then
      as_app "cd '${INSTALL_DIR}' && git stash push -u -m 'spirit.sh update $(date -Iseconds)'" >/dev/null ||
        die "git stash failed"
      ok "Changes stashed"
    else
      die "Cancelled. Commit or revert your changes, then re-run."
    fi
  fi

  as_app "cd '${INSTALL_DIR}' && git fetch --tags --prune origin" >/dev/null 2>&1 ||
    die "git fetch failed — check network access to ${REPO_URL}"

  target="${GIT_REF:-}"
  if [[ -z "$target" ]]; then
    target="$(as_app "cd '${INSTALL_DIR}' && git rev-parse --abbrev-ref --symbolic-full-name '@{u}'" 2>/dev/null || echo origin/main)"
  fi

  as_app "cd '${INSTALL_DIR}' && git -c advice.detachedHead=false reset --hard '${target}'" >/dev/null ||
    die "git reset to ${target} failed"
  after="$(as_app "cd '${INSTALL_DIR}' && git rev-parse --short HEAD" 2>/dev/null || echo unknown)"
  ok "Updated ${before} -> ${after}"
}

update_source_tarball() {
  info "Not a git checkout — updating from the GitHub tarball"
  local ref="${GIT_REF:-main}" tmp src
  tmp="$(mktemp -d)"
  # shellcheck disable=SC2064
  trap "rm -rf '$tmp'" RETURN

  curl -fsSL "https://codeload.github.com/${REPO_SLUG}/tar.gz/${ref}" -o "${tmp}/src.tar.gz" ||
    die "Download failed for ref ${ref}"
  tar -xzf "${tmp}/src.tar.gz" -C "$tmp" || die "Could not extract the tarball"
  src="$(find "$tmp" -mindepth 1 -maxdepth 1 -type d | head -n1)"
  [[ -n "$src" ]] || die "Unexpected tarball layout"

  command -v rsync >/dev/null 2>&1 || apt_install rsync
  rsync -a --delete \
    --exclude 'apps/panel-api/.env' \
    --exclude 'node_modules/' \
    --exclude '**/node_modules/' \
    --exclude 'apps/panel-web/dist/' \
    --exclude '.turbo/' \
    "${src}/" "${INSTALL_DIR}/" || die "rsync into ${INSTALL_DIR} failed"
  chown -R "${APP_USER}:${APP_USER}" "$INSTALL_DIR"
  ok "Synced ${ref} into ${INSTALL_DIR}"
}

reexec_from_copy() {
  [[ "${SPIRIT_REEXEC:-0}" == "1" ]] && return 0
  local self copy
  self="$(readlink -f "$0" 2>/dev/null || printf '%s' "$0")"
  [[ -f "$self" ]] || return 0
  case "$self" in
    "${INSTALL_DIR}"/*) ;;
    *) return 0 ;;
  esac
  copy="$(mktemp /tmp/spirit-update.XXXXXX)" || return 0
  cp "$self" "$copy" || { rm -f "$copy"; return 0; }
  export SPIRIT_REEXEC=1 SPIRIT_SELF_COPY="$copy"
  exec bash "$copy" ${ORIGINAL_ARGS+"${ORIGINAL_ARGS[@]}"}
}

# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------

action_install() {
  require_root
  detect_os
  acquire_lock

  if [[ -z "$PANEL_DOMAIN" ]]; then
    if [[ "$ASSUME_YES" == "1" || ! -t 0 ]]; then
      die "Non-interactive install needs --domain.
Example: sudo bash $0 install --domain panel.example.com --admin-email you@example.com -y"
    fi
    PANEL_DOMAIN="$(ask "Panel domain (e.g. panel.example.com)")"
  fi
  [[ "$PANEL_DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ ]] ||
    die "Invalid domain: ${PANEL_DOMAIN}"

  if is_installed; then
    warn "Spirit-Panel already looks installed at ${INSTALL_DIR}"
    confirm "Re-run the installer over it?" "n" ||
      die "Nothing changed. Use option [2] to update instead."
  fi

  printf '\n  %sInstalling Spirit-Panel%s for %s\n\n' "$C_BOLD" "$C_RESET" "$PANEL_DOMAIN"

  install_prerequisites
  create_app_user
  fetch_source
  configure_redis
  write_env_file
  run_panel_installer
  fix_permissions
  install_systemd
  install_nginx
  install_tls
  fix_permissions

  step "Verifying"
  if health_check; then
    ok "API healthy"
  else
    warn "API is not answering /health yet"
    info "journalctl -u ${SERVICE_NAME} -n 50"
  fi

  print_install_summary
}

action_update() {
  require_root
  detect_os
  is_installed || die "No Spirit-Panel install found at ${INSTALL_DIR}. Run the installer first."
  reexec_from_copy
  acquire_lock

  local from_version
  from_version="$(panel_version)"
  printf '  %sUpdating Spirit-Panel%s (currently v%s)\n' "$C_BOLD" "$C_RESET" "$from_version"
  printf '  The API will restart and be briefly unavailable.\n\n'
  confirm "Continue?" "y" || die "Cancelled."
  printf '\n'

  backup_before_update

  step "Updating source"
  if [[ -d "${INSTALL_DIR}/.git" ]]; then
    update_source_git
  else
    update_source_tarball
  fi

  step "Installing dependencies"
  ensure_app_home
  install_pnpm
  local base="cd '${INSTALL_DIR}' && unset NODE_ENV &&"
  as_app "${base} pnpm install --no-frozen-lockfile" ||
    die "pnpm install failed. Nothing was restarted — the running version is untouched."
  ok "Dependencies up to date"

  step "Building"
  as_app "${base} pnpm build" ||
    die "Build failed. The old build is still in place; nothing was restarted."
  ok "Build complete"

  step "Applying database migrations"
  if as_app "cd '${INSTALL_DIR}/apps/panel-api' && unset NODE_ENV && pnpm exec prisma migrate deploy"; then
    ok "Migrations applied"
  else
    warn "prisma migrate deploy failed"
    info "Restore: ${BACKUP_PATH:-$BACKUP_DIR}"
    die "Stopped before restarting the API so the current version keeps running."
  fi

  step "Restarting services"
  fix_permissions >/dev/null
  systemctl restart "$SERVICE_NAME" || die "Failed to restart ${SERVICE_NAME}"
  systemctl reload nginx 2>/dev/null || true
  ok "${SERVICE_NAME} restarted"

  step "Verifying"
  if health_check; then
    ok "API healthy"
  else
    warn "API is not answering /health"
    printf '\n  Logs:    journalctl -u %s -n 80 --no-pager\n' "$SERVICE_NAME"
    printf '  Backup:  %s\n\n' "${BACKUP_PATH:-$BACKUP_DIR}"
    exit 1
  fi

  local to_version
  to_version="$(panel_version)"
  printf '\n%s%sUpdate complete.%s  v%s -> v%s\n\n' "$C_GREEN" "$C_BOLD" "$C_RESET" "$from_version" "$to_version"
  printf '  Backup:    %s\n' "${BACKUP_PATH:-none}"
  printf '  Changelog: https://github.com/%s/blob/main/docs/CHANGELOG.md\n\n' "$REPO_SLUG"
}

action_status() {
  is_installed || die "No Spirit-Panel install found at ${INSTALL_DIR}."
  printf '  %sSpirit-Panel status%s\n\n' "$C_BOLD" "$C_RESET"
  printf '    Version      %s\n' "$(panel_version)"
  printf '    Directory    %s\n' "$INSTALL_DIR"
  printf '    Panel URL    %s\n' "$(env_get API_URL || echo unset)"
  local svc
  svc="$(systemctl is-active "$SERVICE_NAME" 2>/dev/null || echo unknown)"
  if [[ "$svc" == "active" ]]; then
    printf '    API service  %sactive%s\n' "$C_GREEN" "$C_RESET"
  else
    printf '    API service  %s%s%s\n' "$C_RED" "$svc" "$C_RESET"
  fi
  if health_check 3; then
    printf '    Health       %sok%s\n\n' "$C_GREEN" "$C_RESET"
  else
    printf '    Health       %snot responding%s\n\n' "$C_YELLOW" "$C_RESET"
  fi
}

action_backup() {
  require_root
  is_installed || die "No Spirit-Panel install found at ${INSTALL_DIR}."
  acquire_lock
  backup_before_update
  printf '\n  Backup saved to %s\n\n' "$BACKUP_PATH"
}

action_uninstall() {
  require_root
  is_installed || die "No Spirit-Panel install found at ${INSTALL_DIR}."
  confirm "Really uninstall Spirit-Panel?" "n" || die "Cancelled."

  step "Backing up before removal"
  backup_before_update

  step "Stopping services"
  systemctl stop "$SERVICE_NAME" 2>/dev/null || true
  systemctl disable "$SERVICE_NAME" 2>/dev/null || true
  rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
  systemctl daemon-reload

  rm -f "/etc/nginx/sites-enabled/${NGINX_SITE}" "/etc/nginx/sites-available/${NGINX_SITE}"
  systemctl reload nginx 2>/dev/null || true

  # Guard against wiping /, /home, etc.
  if [[ -n "$INSTALL_DIR" && "$INSTALL_DIR" != "/" && "$INSTALL_DIR" == */Spirit-Panel && -f "${INSTALL_DIR}/package.json" ]]; then
    rm -rf "$INSTALL_DIR"
    ok "Removed ${INSTALL_DIR}"
  else
    warn "Refusing to delete ${INSTALL_DIR} — remove it manually if needed"
  fi
  printf '\n  Uninstall complete. Backup: %s\n\n' "${BACKUP_PATH:-none}"
}

# ---------------------------------------------------------------------------
# Menu / CLI
# ---------------------------------------------------------------------------

main_menu() {
  while true; do
    banner
    local ver="not installed"
    is_installed && ver="installed v$(panel_version)"
    printf '            %sMain Menu%s   %s\n\n' "$C_BOLD" "$C_RESET" "$ver"
    printf '  [1] Install Spirit-Panel\n'
    printf '  [2] Update Spirit-Panel\n'
    printf '  [3] Show status\n'
    printf '  [4] Back up database and .env\n'
    printf '  [5] Uninstall\n'
    printf '  [0] Exit\n\n'
    local choice=""
    if ! read -r -p "  Select an option: " choice; then
      printf '\n\n  Input closed — exiting.\n\n'
      exit 0
    fi
    case "${choice,,}" in
      1) action_install; break ;;
      2) action_update; break ;;
      3) action_status; pause_menu ;;
      4) action_backup; pause_menu ;;
      5) action_uninstall; break ;;
      0|q|quit|exit|"") printf '\n'; exit 0 ;;
      *) printf '\n  Unknown option.\n'; sleep 1 ;;
    esac
  done
}

pause_menu() {
  printf '\n'
  read -r -p "  Press Enter to return to the menu... " _ || true
}

usage() {
  cat <<EOF
Spirit-Panel installer/updater v${SCRIPT_VERSION}

Usage:
  sudo bash spirit.sh                          Interactive menu
  sudo bash spirit.sh install --domain HOST [options]
  sudo bash spirit.sh update [-y] [--ref REF]
  sudo bash spirit.sh status | backup | uninstall

Options:
  --domain DOMAIN         Public panel hostname (required for install)
  --admin-email MAIL      Admin + Let's Encrypt contact
  --admin-password PASS   Admin password (12+ chars; generated if omitted)
  --email MAIL            Let's Encrypt contact (defaults to --admin-email)
  --ref REF               Git branch/tag (install clone or update target)
  --no-tls                Skip certbot
  --force-nginx           Overwrite existing nginx site
  --install-dir DIR       Override install path
  --user NAME             Override panel system user
  -y, --yes               Never prompt
  -V, --version           Print script version
  -h, --help              Show this help

Bootstrap (download first — do not use sudo bash <(curl ...)):
  curl -fsSL https://raw.githubusercontent.com/${REPO_SLUG}/main/scripts/spirit.sh -o /tmp/spirit.sh
  sudo bash /tmp/spirit.sh
EOF
}

# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

COMMAND=""
PANEL_DOMAIN=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
LETSENCRYPT_EMAIL=""
GIT_REF=""
WANT_TLS=1
FORCE_NGINX=0
ASSUME_YES=0
TLS_FAILED=0
BACKUP_PATH=""
REDIS_PASSWORD=""
ADMIN_PASSWORD_GENERATED=0
INSTALL_DIR_SET=0
ORIGINAL_ARGS=("$@")

need_value() {
  [[ $# -ge 2 ]] || die "Option $1 needs a value. Run with --help."
  case "$2" in ""|-*) die "Option $1 needs a value (got '${2}')." ;; esac
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    install|update|status|backup|uninstall) COMMAND="$1"; shift ;;
    --domain) need_value "$@"; PANEL_DOMAIN="$2"; shift 2 ;;
    --admin-email) need_value "$@"; ADMIN_EMAIL="$2"; shift 2 ;;
    --admin-password) need_value "$@"; ADMIN_PASSWORD="$2"; shift 2 ;;
    --email) need_value "$@"; LETSENCRYPT_EMAIL="$2"; shift 2 ;;
    --ref) need_value "$@"; GIT_REF="$2"; shift 2 ;;
    --no-tls) WANT_TLS=0; shift ;;
    --force-nginx) FORCE_NGINX=1; shift ;;
    --install-dir)
      need_value "$@"
      INSTALL_DIR="${2%/}"; INSTALL_DIR_SET=1; shift 2 ;;
    --user)
      need_value "$@"
      APP_USER="$2"
      [[ "$INSTALL_DIR_SET" == "1" ]] || INSTALL_DIR="/home/${APP_USER}/Spirit-Panel"
      shift 2 ;;
    -y|--yes) ASSUME_YES=1; shift ;;
    -V|--version) printf 'spirit.sh %s\n' "$SCRIPT_VERSION"; exit 0 ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1
Run with --help for usage." ;;
  esac
done

case "$COMMAND" in
  install)   banner; action_install ;;
  update)    banner; action_update ;;
  status)    banner; action_status ;;
  backup)    banner; action_backup ;;
  uninstall) banner; action_uninstall ;;
  "")
    if [[ -t 0 ]]; then
      main_menu
    else
      usage
      die "No TTY for the interactive menu — pass a command (install, update, ...)."
    fi
    ;;
esac
