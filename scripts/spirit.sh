#!/usr/bin/env bash
#
# Spirit-Panel installer / updater
#
#   curl -fsSL https://raw.githubusercontent.com/SpiritFramework/SpiritPanel/main/scripts/spirit.sh -o /tmp/spirit.sh
#   sudo bash /tmp/spirit.sh
#
# Download first rather than `sudo bash <(curl ...)`: process substitution
# hands bash a /dev/fd path from the calling shell, and sudo closes inherited
# descriptors, so bash fails with "/dev/fd/63: No such file or directory".
#
# Runs standalone: it clones the panel itself, so it does not need to live
# inside a checkout. Interactive menu by default; every action also has a
# non-interactive form for automation. See --help.
#
set -uo pipefail

SCRIPT_VERSION="1.0.0"

REPO_URL="${SPIRIT_REPO_URL:-https://github.com/SpiritFramework/SpiritPanel.git}"
REPO_SLUG="${SPIRIT_REPO_SLUG:-SpiritFramework/SpiritPanel}"
APP_USER="${SPIRIT_APP_USER:-spiritpanel}"
INSTALL_DIR="${SPIRIT_INSTALL_DIR:-/home/${APP_USER}/Spirit-Panel}"
SERVICE_NAME="spirit-panel-api"
NGINX_SITE="spirit-panel"
BACKUP_DIR="${SPIRIT_BACKUP_DIR:-/var/backups/spirit-panel}"
NODE_MAJOR=20
PNPM_VERSION=9

LINK_GITHUB="github.com/${REPO_SLUG}"
LINK_DISCORD="discord.gg/tyR6FF8u2a"
LINK_DOCS="github.com/${REPO_SLUG}/tree/main/docs"

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

if [[ -t 1 ]] && [[ "${NO_COLOR:-}" == "" ]]; then
  C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'
  C_CYAN=$'\033[36m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_RED=$'\033[31m'
else
  C_RESET=""; C_BOLD=""; C_DIM=""; C_CYAN=""; C_GREEN=""; C_YELLOW=""; C_RED=""
fi

STEP=0

# Anything that must not outlive the run, however it ends. The sudoers grant
# below is the important one: it lets the panel user call mysql as root, and
# leaving it behind after a Ctrl-C would be a standing privilege escalation.
SUDOERS_FILE="/etc/sudoers.d/spirit-panel-install"
CLEANUP_PATHS=()
CLEANUP_DONE=0

cleanup() {
  [[ "$CLEANUP_DONE" == "1" ]] && return 0
  CLEANUP_DONE=1
  rm -f "$SUDOERS_FILE" 2>/dev/null || true
  [[ -n "${SPIRIT_SELF_COPY:-}" ]] && rm -f "$SPIRIT_SELF_COPY" 2>/dev/null || true
  local p
  for p in ${CLEANUP_PATHS+"${CLEANUP_PATHS[@]}"}; do
    [[ -n "$p" ]] && rm -rf "$p" 2>/dev/null || true
  done
}

on_signal() {
  cleanup
  printf '\n%sInterrupted.%s Nothing further was changed.\n\n' "$C_YELLOW" "$C_RESET" >&2
  exit 130
}

trap cleanup EXIT
trap on_signal INT TERM HUP

step() { STEP=$((STEP + 1)); printf '%s==>%s %s%s%s\n' "$C_CYAN" "$C_RESET" "$C_BOLD" "[$STEP] $*" "$C_RESET"; }
ok()   { printf '    %s+%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
info() { printf '    %s-%s %s\n' "$C_DIM" "$C_RESET" "$*"; }
warn() { printf '    %s!%s %s\n' "$C_YELLOW" "$C_RESET" "$*"; }
die()  { printf '\n%sError:%s %s\n\n' "$C_RED" "$C_RESET" "$*" >&2; exit 1; }

banner() {
  clear 2>/dev/null || true
  printf '%s' "$C_CYAN"
  # Pure ASCII on purpose: renders identically over SSH in any locale, where
  # box-drawing characters often arrive as mojibake.
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

  # Width is measured from the content so a long link can never break the box.
  local rows=(
    "Github:   ${LINK_GITHUB}"
    "Discord:  ${LINK_DISCORD}"
    "Docs:     ${LINK_DOCS}"
  )
  local width=0 row rule
  for row in "${rows[@]}"; do
    (( ${#row} > width )) && width=${#row}
  done
  rule="$(printf '%*s' "$((width + 4))" '' | tr ' ' '-')"

  printf '  %s+%s+%s\n' "$C_CYAN" "$rule" "$C_RESET"
  for row in "${rows[@]}"; do
    printf '  %s|%s  %s%-*s%s  %s|%s\n' \
      "$C_CYAN" "$C_RESET" "$C_CYAN" "$width" "$row" "$C_RESET" "$C_CYAN" "$C_RESET"
  done
  printf '  %s+%s+%s\n\n' "$C_CYAN" "$rule" "$C_RESET"
}

# ---------------------------------------------------------------------------
# Environment checks
# ---------------------------------------------------------------------------

require_root() {
  if [[ "$(id -u)" != "0" ]]; then
    die "This action needs root. Re-run as:
  sudo bash $0"
  fi
}

detect_os() {
  [[ -r /etc/os-release ]] || die "Cannot read /etc/os-release - unsupported system."
  # shellcheck disable=SC1091
  . /etc/os-release
  OS_ID="${ID:-unknown}"
  OS_NAME="${PRETTY_NAME:-$OS_ID}"
  case "$OS_ID" in
    ubuntu | debian) ;;
    *) die "Unsupported OS: ${OS_NAME}. Spirit-Panel installs on Ubuntu 22.04+ or Debian 12+." ;;
  esac
}

is_installed() { [[ -f "${INSTALL_DIR}/package.json" ]]; }

# `rm -rf "$INSTALL_DIR"` is only ever safe on something that really is a panel
# checkout. --install-dir takes arbitrary input, so refuse system directories
# and anything that does not look like the panel.
safe_to_remove() {
  local d="${1:-}"
  [[ -n "$d" && "$d" == /* ]] || return 1
  [[ "$d" != *".."* ]] || return 1
  case "$d" in
    / | /bin | /boot | /dev | /etc | /home | /lib | /media | /mnt | /opt | \
    /proc | /root | /run | /sbin | /srv | /sys | /tmp | /usr | /var) return 1 ;;
  esac
  # At least two path components, so /anything-toplevel is out.
  [[ "$d" == /*/?* ]] || return 1
  [[ -f "${d}/package.json" ]] || return 1
  return 0
}

# Run a command as the panel user, with a login shell so nvm/npm paths resolve.
app_home() {
  getent passwd "$APP_USER" 2>/dev/null | cut -d: -f6
}

# Absolute path to a pnpm the panel user can execute. Set by resolve_pnpm.
PNPM_BIN=""

as_app() {
  local home pathfix=""
  home="$(app_home)"
  # `bash -l` rebuilds PATH from /etc/profile, which does not necessarily
  # include the prefix npm installed pnpm into, so put it back explicitly
  # rather than trusting the panel user's login PATH.
  [[ -n "$PNPM_BIN" ]] && pathfix="PATH='$(dirname "$PNPM_BIN")':\$PATH "
  # Corepack defaults its cache to $HOME/.cache/node/corepack and aborts with
  # EACCES if that path is root-owned, which happens easily on a box where
  # root has run node tooling in the panel user's home. Pin it somewhere we
  # know is writable and never prompt for a download.
  runuser -u "$APP_USER" -- bash -lc \
    "export ${pathfix}COREPACK_ENABLE_DOWNLOAD_PROMPT=0${home:+ COREPACK_HOME='${home}/.cache/node/corepack'}; $1"
}

# Root-run tooling leaves root-owned dotdirs in the panel user's home, and
# every later pnpm/npm/corepack call as that user then fails with EACCES.
# Create the caches the toolchain writes to and hand them to the panel user.
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

# Percent-decode a URL component. Backslashes are doubled first so printf %b
# cannot turn a literal \n or \t in a password into whitespace, and + is left
# alone because it is a literal plus in the userinfo part of a URL.
urldecode() {
  local s="${1//\\/\\\\}"
  printf '%b' "${s//%/\\x}"
}

# Escape a value for a double-quoted my.cnf entry. Quoting matters because an
# unquoted # would start a comment and swallow the rest of a password.
cnf_escape() {
  local s="${1//\\/\\\\}"
  printf '%s' "${s//\"/\\\"}"
}

# Read a key from the panel .env without sourcing it.
env_get() {
  local key="$1" file="${INSTALL_DIR}/apps/panel-api/.env"
  [[ -f "$file" ]] || return 1
  sed -n "s/^${key}=//p" "$file" | head -n1 | sed -e 's/^"//' -e 's/"$//'
}

panel_version() {
  local pkg="${INSTALL_DIR}/apps/panel-api/package.json"
  [[ -f "$pkg" ]] || { echo "unknown"; return; }
  sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$pkg" | head -n1
}

confirm() {
  local prompt="$1" default="${2:-n}" reply
  if [[ "$ASSUME_YES" == "1" ]]; then return 0; fi
  # Always talk to the controlling terminal. After a colored banner, some
  # remote shells (or a redirected stdin) leave `read -p` waiting with no
  # visible prompt, which looks like a hang.
  local tty="/dev/tty"
  if [[ ! -r "$tty" || ! -w "$tty" ]]; then
    if [[ ! -t 0 ]]; then
      return 1
    fi
    tty=""
  fi
  local hint="[y/N]"
  [[ "$default" == "y" ]] && hint="[Y/n]"
  # Print the question ourselves so it is never swallowed by a stuck -p.
  printf '  %s %s ' "$prompt" "$hint" >/dev/tty 2>/dev/null || printf '  %s %s ' "$prompt" "$hint"
  if [[ -n "$tty" ]]; then
    read -r reply <"$tty" || return 1
  else
    read -r reply || return 1
  fi
  reply="${reply:-$default}"
  [[ "$reply" =~ ^[Yy]$ ]]
}

ask() {
  local prompt="$1" default="${2:-}" reply
  local tty="/dev/tty"
  if [[ ! -r "$tty" || ! -w "$tty" ]]; then
    if [[ ! -t 0 ]]; then echo "$default"; return; fi
    tty=""
  fi
  if [[ -n "$default" ]]; then
    printf '  %s [%s]: ' "$prompt" "$default" >/dev/tty 2>/dev/null || printf '  %s [%s]: ' "$prompt" "$default"
  else
    printf '  %s: ' "$prompt" >/dev/tty 2>/dev/null || printf '  %s: ' "$prompt"
  fi
  if [[ -n "$tty" ]]; then
    read -r reply <"$tty" || true
  else
    read -r reply || true
  fi
  echo "${reply:-$default}"
}

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

apt_install() {
  DEBIAN_FRONTEND=noninteractive apt-get install -y -q "$@" >/dev/null
}

install_prerequisites() {
  step "Installing system packages"

  export DEBIAN_FRONTEND=noninteractive
  apt-get update -q >/dev/null || die "apt-get update failed"

  apt_install ca-certificates curl git gnupg unzip rsync openssl ||
    die "Failed to install base packages"
  ok "Base tools (git, curl, rsync, openssl)"

  apt_install mariadb-server mariadb-client || die "Failed to install MariaDB"
  systemctl enable --now mariadb >/dev/null 2>&1 || true
  ok "MariaDB"

  apt_install redis-server || die "Failed to install Redis"
  systemctl enable --now redis-server >/dev/null 2>&1 || true
  ok "Redis"

  apt_install nginx || die "Failed to install nginx"
  systemctl enable --now nginx >/dev/null 2>&1 || true
  ok "nginx"

  if [[ "$WANT_TLS" == "1" ]]; then
    apt_install certbot python3-certbot-nginx || warn "certbot install failed - skipping TLS"
    ok "certbot"
  fi

  install_node
  install_pnpm
}

node_major() {
  command -v node >/dev/null 2>&1 || { echo 0; return; }
  node -v 2>/dev/null | sed -e 's/^v//' -e 's/\..*//'
}

install_node() {
  local current
  current="$(node_major)"
  if [[ "$current" -ge "$NODE_MAJOR" ]]; then
    ok "Node.js $(node -v)"
    return
  fi
  info "Installing Node.js ${NODE_MAJOR}.x (found: ${current:-none})"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash - >/dev/null 2>&1 ||
    die "Failed to add the NodeSource repository"
  apt_install nodejs || die "Failed to install Node.js"
  [[ "$(node_major)" -ge "$NODE_MAJOR" ]] || die "Node.js ${NODE_MAJOR}+ required after install"
  ok "Node.js $(node -v)"
}

install_pnpm() {
  resolve_pnpm

  local resolved=""
  [[ -n "$PNPM_BIN" ]] && resolved="$(readlink -f "$PNPM_BIN" 2>/dev/null || true)"

  if [[ -n "$PNPM_BIN" && "$resolved" != *corepack* ]] && "$PNPM_BIN" --version >/dev/null 2>&1; then
    # Root being able to run pnpm proves nothing - the install runs as the
    # panel user.
    if pnpm_usable_by_app; then
      ok "pnpm $("$PNPM_BIN" --version 2>/dev/null)"
      return
    fi
    info "pnpm exists but ${APP_USER} cannot run it - repairing permissions"
    repair_pnpm_permissions
    if pnpm_usable_by_app; then
      ok "pnpm $("$PNPM_BIN" --version 2>/dev/null) (permissions repaired)"
      return
    fi
    info "Reinstalling pnpm where every user can reach it"
  elif [[ -n "$PNPM_BIN" ]]; then
    # Node's deb ships a corepack shim named pnpm. It resolves fine but
    # downloads the real pnpm on first use into the calling user's cache,
    # which fails for the panel user.
    info "Replacing the corepack pnpm shim with a real install"
  fi

  # umask 022 because npm applies the invoking shell's umask to what it
  # writes; under a hardened umask (077) the global install lands mode 700 and
  # only root can run it. --prefix /usr/local because npm's configured prefix
  # may be somewhere the panel user cannot read at all.
  (umask 022; npm install -g --force --prefix /usr/local "pnpm@${PNPM_VERSION}" >/dev/null 2>&1) ||
    (umask 022; npm install -g --force "pnpm@${PNPM_VERSION}" >/dev/null 2>&1) ||
    die "Failed to install pnpm ${PNPM_VERSION}"
  hash -r 2>/dev/null || true
  resolve_pnpm
  [[ -n "$PNPM_BIN" ]] || die "pnpm is not on PATH after installing it"
  repair_pnpm_permissions
  ok "pnpm $("$PNPM_BIN" --version 2>/dev/null)"
}

# Find pnpm as an absolute path, preferring one that is not a corepack shim.
# `command -v` alone is not enough: npm's global prefix is not necessarily on
# the current PATH, and an older broken copy can shadow a newer good one.
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
  # Nothing clean found; fall back to whatever is on PATH so the caller can
  # see it is a corepack shim and replace it.
  PNPM_BIN="$onpath"
}

pnpm_usable_by_app() {
  # During a fresh install the panel user may not exist yet.
  id "$APP_USER" >/dev/null 2>&1 || return 0
  as_app "command -v pnpm >/dev/null 2>&1 && pnpm --version >/dev/null 2>&1"
}

# Re-open a global install that root's umask made private.
repair_pnpm_permissions() {
  local groot target
  groot="$(npm root -g 2>/dev/null || true)"
  [[ -n "$groot" && -d "${groot}/pnpm" ]] &&
    chmod -R a+rX "${groot}/pnpm" 2>/dev/null || true
  if [[ -n "$PNPM_BIN" ]]; then
    chmod a+rx "$PNPM_BIN" 2>/dev/null || true
    target="$(readlink -f "$PNPM_BIN" 2>/dev/null || true)"
    [[ -n "$target" && -e "$target" ]] && chmod a+rx "$target" 2>/dev/null || true
  fi
}

# Safety net before the long dependency step, so a toolchain problem surfaces
# in seconds rather than halfway through an install.
verify_pnpm_for_app_user() {
  pnpm_usable_by_app && return 0
  repair_pnpm_permissions
  pnpm_usable_by_app && { ok "Repaired pnpm permissions for ${APP_USER}"; return 0; }

  warn "${APP_USER} cannot run pnpm"
  info "pnpm resolved to: ${PNPM_BIN:-not found}"
  if [[ -n "$PNPM_BIN" ]]; then
    info "  $(ls -l "$PNPM_BIN" 2>/dev/null || echo 'cannot stat')"
    local target
    target="$(readlink -f "$PNPM_BIN" 2>/dev/null || true)"
    [[ -n "$target" && "$target" != "$PNPM_BIN" ]] &&
      info "  -> $(ls -l "$target" 2>/dev/null || echo "broken symlink: ${target}")"
  fi
  info "As ${APP_USER}: $(as_app 'command -v pnpm || echo "pnpm not on PATH"' 2>&1 | tail -n1)"
  info "Reinstall it manually, then re-run this update:"
  info "  umask 022 && npm install -g --force --prefix /usr/local pnpm@${PNPM_VERSION}"
  die "Stopped before installing dependencies. Nothing was changed."
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
  # nginx (www-data) must be able to traverse into the web root.
  chmod o+x "/home/${APP_USER}" 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# Source checkout
# ---------------------------------------------------------------------------

fetch_source() {
  step "Fetching Spirit-Panel"
  if [[ -d "${INSTALL_DIR}/.git" ]]; then
    ok "Existing checkout at ${INSTALL_DIR}"
    return
  fi
  if is_installed; then
    ok "Existing (non-git) install at ${INSTALL_DIR}"
    return
  fi

  mkdir -p "$(dirname "$INSTALL_DIR")"
  local ref_args=""
  [[ -n "$GIT_REF" ]] && ref_args="--branch ${GIT_REF}"
  # shellcheck disable=SC2086
  git clone --depth 1 $ref_args "$REPO_URL" "$INSTALL_DIR" >/dev/null 2>&1 ||
    die "git clone failed from ${REPO_URL}"
  chown -R "${APP_USER}:${APP_USER}" "$INSTALL_DIR"
  ok "Cloned to ${INSTALL_DIR}"
}

# ---------------------------------------------------------------------------
# Panel install
# ---------------------------------------------------------------------------

gen_secret() {
  openssl rand -base64 "${1:-32}" | tr -d '\n'
}

# For the admin password specifically: alphanumeric only. base64 output is
# fine for a machine-read secret, but a human has to read this one off a
# terminal and type it into a login form, and +/= invite transcription errors.
gen_password() {
  local n="${1:-24}" out
  out="$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom 2>/dev/null | head -c "$n")"
  # /dev/urandom should always be there; fall back rather than return empty.
  [[ "${#out}" -eq "$n" ]] || out="$(openssl rand -base64 "$n" | tr -dc 'A-Za-z0-9' | head -c "$n")"
  printf '%s' "$out"
}

# Redis needs a password because the API refuses to boot in production with the
# schedule worker enabled and REDIS_PASSWORD unset (secret-validation.ts). A
# password in .env that Redis does not enforce fails just as hard ("Client sent
# AUTH, but no password is set"), so both sides are configured together here.
configure_redis() {
  step "Securing Redis"
  local conf="/etc/redis/redis.conf"

  if [[ ! -f "$conf" ]]; then
    warn "No ${conf} - disabling the schedule worker instead"
    REDIS_PASSWORD=""
    return
  fi

  local existing
  existing="$(sed -n 's/^requirepass[[:space:]]\+//p' "$conf" | tail -n1)"
  # redis.conf allows the value to be quoted; keeping the quotes would put a
  # password into .env that Redis never accepts.
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
    # Replace a commented-out requirepass if present, else append.
    if grep -qE '^[[:space:]]*#[[:space:]]*requirepass' "$conf"; then
      sed -i "0,/^[[:space:]]*#[[:space:]]*requirepass.*/s||requirepass ${REDIS_PASSWORD}|" "$conf"
    else
      printf '\n# Added by Spirit-Panel installer\nrequirepass %s\n' "$REDIS_PASSWORD" >> "$conf"
    fi
    ok "Set requirepass in ${conf}"
  fi

  systemctl restart redis-server 2>/dev/null || systemctl restart redis 2>/dev/null || true

  # REDISCLI_AUTH rather than -a: the latter puts the password in ps output.
  if REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli --no-auth-warning ping 2>/dev/null | grep -q PONG; then
    ok "Redis authenticated"
  else
    warn "Could not verify Redis auth - the schedule worker will be disabled"
    REDIS_PASSWORD=""
  fi
}

# The panel's production seed requires ADMIN_EMAIL, ADMIN_USERNAME and a strong
# ADMIN_PASSWORD to already be in .env, so the file is written before
# spirit-install runs. DATABASE_URL is deliberately left as the CHANGE_ME
# placeholder: spirit-install treats that as "not configured" and provisions the
# database itself, then writes the real URL back.
write_env_file() {
  step "Writing the environment file"
  local env_file="${INSTALL_DIR}/apps/panel-api/.env"
  local template="${INSTALL_DIR}/deploy/env/production.example"

  if [[ -f "$env_file" ]]; then
    ok "Keeping the existing .env"
    info "Delete it first if you want a clean configuration"
    return
  fi
  [[ -f "$template" ]] || die "Missing ${template}"

  if [[ -z "$ADMIN_PASSWORD" ]]; then
    ADMIN_PASSWORD="$(gen_password 24)"
    ADMIN_PASSWORD_GENERATED=1
  elif [[ "${#ADMIN_PASSWORD}" -lt 12 ]]; then
    die "--admin-password must be at least 12 characters (the seed rejects weaker ones)."
  fi

  local admin_email="${ADMIN_EMAIL:-admin@${PANEL_DOMAIN}}"
  ADMIN_EMAIL="$admin_email"

  mkdir -p "$(dirname "$env_file")"
  # umask is process-wide, so restore it - otherwise every file written later
  # in the run (the nginx vhost, for one) silently comes out mode 600.
  local old_umask
  old_umask="$(umask)"
  umask 077
  cp "$template" "$env_file"

  set_env_value "$env_file" JWT_SECRET "$(gen_secret 48)"
  set_env_value "$env_file" APP_KEY "$(gen_secret 32)"
  set_env_value "$env_file" API_URL "https://${PANEL_DOMAIN}"
  set_env_value "$env_file" PANEL_URL "https://${PANEL_DOMAIN}"
  set_env_value "$env_file" ADMIN_EMAIL "$admin_email"
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
  ok "Wrote ${env_file} with generated secrets"
}

# Replace KEY=... (quoting the value) or append it if the key is absent.
set_env_value() {
  local file="$1" key="$2" value="$3" tmp
  tmp="$(mktemp)"
  # Use awk so the value is never re-interpreted as a sed replacement pattern.
  KEY="$key" VALUE="$value" awk '
    BEGIN { key = ENVIRON["KEY"]; value = ENVIRON["VALUE"]; done = 0 }
    $0 ~ "^" key "=" && !done { print key "=\"" value "\""; done = 1; next }
    { print }
    END { if (!done) print key "=\"" value "\"" }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
}

run_panel_installer() {
  step "Installing dependencies"
  ensure_app_home
  resolve_pnpm
  verify_pnpm_for_app_user

  # NODE_ENV=production makes pnpm skip devDependencies, which the installer
  # (tsx), the build (vite, tsc) and Prisma all need.
  local base="cd '${INSTALL_DIR}' && unset NODE_ENV &&"

  as_app "${base} pnpm install --no-frozen-lockfile" ||
    die "pnpm install failed. Check ${INSTALL_DIR} ownership and disk space."
  ok "Dependencies installed"

  step "Configuring the panel"
  # Only flags spirit-install actually accepts; --admin-email is not one of
  # them, which is why the email goes into .env above.
  local args="--production --api-url 'https://${PANEL_DOMAIN}'"
  [[ -n "$ADMIN_PASSWORD" ]] && args+=" --admin-password '${ADMIN_PASSWORD}'"

  # spirit-install provisions the database via `sudo mysql`, so the panel user
  # needs passwordless sudo for that one command during install. The EXIT trap
  # removes it too, in case this run is interrupted before the line below.
  printf '%s ALL=(root) NOPASSWD: /usr/bin/mysql, /usr/bin/mariadb\n' "$APP_USER" > "$SUDOERS_FILE"
  chmod 440 "$SUDOERS_FILE"

  local rc=0
  as_app "${base} pnpm spirit-install ${args}" || rc=$?
  rm -f "$SUDOERS_FILE"

  [[ "$rc" -eq 0 ]] || die "Panel configuration failed (exit ${rc}). See the output above."
  ok "Database, environment, and build ready"
}

install_systemd() {
  step "Installing the systemd service"
  local src="${INSTALL_DIR}/deploy/systemd/${SERVICE_NAME}.service"
  local dest="/etc/systemd/system/${SERVICE_NAME}.service"
  [[ -f "$src" ]] || die "Missing ${src}"

  install -m 644 "$src" "$dest"
  # Retarget the unit if this install does not use the default paths.
  sed -i \
    -e "s|^User=.*|User=${APP_USER}|" \
    -e "s|^Group=.*|Group=${APP_USER}|" \
    -e "s|^WorkingDirectory=.*|WorkingDirectory=${INSTALL_DIR}/apps/panel-api|" \
    -e "s|^EnvironmentFile=.*|EnvironmentFile=${INSTALL_DIR}/apps/panel-api/.env|" \
    "$dest"

  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME" >/dev/null 2>&1 || true
  systemctl restart "$SERVICE_NAME" || die "Failed to start ${SERVICE_NAME}. Run: journalctl -u ${SERVICE_NAME} -n 50"
  ok "${SERVICE_NAME} enabled and started"
}

install_nginx() {
  step "Configuring nginx"
  local src="${INSTALL_DIR}/deploy/nginx/${NGINX_SITE}.conf"
  local dest="/etc/nginx/sites-available/${NGINX_SITE}"
  [[ -f "$src" ]] || die "Missing ${src}"

  if [[ -f "$dest" ]] && [[ "$FORCE_NGINX" != "1" ]]; then
    warn "${dest} exists - leaving your config untouched"
    info "Reference config: ${src}"
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

  # The shipped config references certbot paths that do not exist yet. Serve
  # plain HTTP first so certbot can complete the http-01 challenge.
  if [[ "$WANT_TLS" == "1" ]] && [[ ! -d "/etc/letsencrypt/live/${PANEL_DOMAIN}" ]]; then
    write_bootstrap_nginx "$dest"
  fi

  nginx -t >/dev/null 2>&1 || {
    nginx -t || true
    die "nginx config test failed. Fix ${dest} and run: systemctl reload nginx"
  }
  systemctl reload nginx || die "Failed to reload nginx"
  ok "nginx serving ${PANEL_DOMAIN}"
}

# Minimal HTTP-only vhost used until certbot has issued a certificate.
write_bootstrap_nginx() {
  local dest="$1"
  cat > "$dest" <<EOF
# Spirit-Panel - bootstrap (HTTP only).
# Replaced by the full config in deploy/nginx/${NGINX_SITE}.conf once TLS exists.
server {
    listen 80;
    listen [::]:80;
    server_name ${PANEL_DOMAIN};

    root ${INSTALL_DIR}/apps/panel-web/dist;
    index index.html;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:3000/health;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
  info "Installed a temporary HTTP vhost for the TLS challenge"
}

setup_tls() {
  [[ "$WANT_TLS" == "1" ]] || { info "Skipping TLS (--no-tls)"; return; }

  step "Requesting a TLS certificate"
  if [[ -d "/etc/letsencrypt/live/${PANEL_DOMAIN}" ]]; then
    ok "Certificate already present for ${PANEL_DOMAIN}"
  else
    mkdir -p /var/www/html
    if ! certbot --nginx -n --agree-tos -m "$LETSENCRYPT_EMAIL" \
      -d "$PANEL_DOMAIN" --redirect >/dev/null 2>&1; then
      warn "certbot could not issue a certificate for ${PANEL_DOMAIN}"
      info "Point DNS at this server, then run: certbot --nginx -d ${PANEL_DOMAIN}"
      TLS_FAILED=1
      return
    fi
    ok "Certificate issued"
  fi

  # Now that certs exist, install the full hardened config.
  local src="${INSTALL_DIR}/deploy/nginx/${NGINX_SITE}.conf"
  local dest="/etc/nginx/sites-available/${NGINX_SITE}"
  install -m 644 "$src" "$dest"
  sed -i \
    -e "s|server_name .*;|server_name ${PANEL_DOMAIN};|g" \
    -e "s|root .*/apps/panel-web/dist;|root ${INSTALL_DIR}/apps/panel-web/dist;|g" \
    -e "s|ssl_certificate .*;|ssl_certificate /etc/letsencrypt/live/${PANEL_DOMAIN}/fullchain.pem;|g" \
    -e "s|ssl_certificate_key .*;|ssl_certificate_key /etc/letsencrypt/live/${PANEL_DOMAIN}/privkey.pem;|g" \
    "$dest"

  if nginx -t >/dev/null 2>&1; then
    systemctl reload nginx
    ok "Full nginx config active (HTTPS, security headers, cache rules)"
  else
    warn "Full config failed validation - restoring the working bootstrap vhost"
    write_bootstrap_nginx "$dest"
    nginx -t >/dev/null 2>&1 && systemctl reload nginx
  fi
}

fix_permissions() {
  step "Setting permissions"
  chown -R "${APP_USER}:${APP_USER}" "$INSTALL_DIR"
  local env_file="${INSTALL_DIR}/apps/panel-api/.env"
  if [[ -f "$env_file" ]]; then
    chown "${APP_USER}:${APP_USER}" "$env_file"
    chmod 600 "$env_file"
    ok ".env locked to ${APP_USER} (600)"
  fi
  chmod o+x "/home/${APP_USER}" 2>/dev/null || true
  if [[ -d "${INSTALL_DIR}/apps/panel-web/dist" ]]; then
    chmod -R o+rX "${INSTALL_DIR}/apps/panel-web/dist"
    ok "Web root readable by nginx"
  fi
}

configure_firewall() {
  command -v ufw >/dev/null 2>&1 || return 0
  ufw status 2>/dev/null | grep -q "Status: active" || return 0
  step "Updating firewall rules"
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  ok "Allowed SSH, HTTP, HTTPS (3000/3306/6379 stay closed)"
}

# Two concurrent runs would fight over apt, the checkout and systemd. Hold a
# lock for anything that mutates the system.
acquire_lock() {
  command -v flock >/dev/null 2>&1 || return 0
  mkdir -p /var/lock 2>/dev/null || return 0
  exec 9>"/var/lock/spirit-panel.lock" 2>/dev/null || return 0
  if ! flock -n 9; then
    die "Another spirit.sh run is already in progress.
If that is wrong, remove /var/lock/spirit-panel.lock and try again."
  fi
}

# A build that dies from ENOSPC halfway through is far more annoying than one
# that refuses to start, so check first.
require_disk_space() {
  local need_mb="${1:-2048}" target="${2:-$INSTALL_DIR}" probe avail mount
  probe="$target"
  while [[ -n "$probe" && "$probe" != "/" && ! -d "$probe" ]]; do
    probe="$(dirname "$probe")"
  done
  avail="$(df -Pm "$probe" 2>/dev/null | awk 'NR==2 {print $4}')"
  [[ "$avail" =~ ^[0-9]+$ ]] || return 0
  (( avail >= need_mb )) && return 0

  mount="$(df -Ph "$probe" 2>/dev/null | awk 'NR==2 {print $6}')"
  warn "Only ${avail} MB free on ${mount:-$probe}; the install and build need roughly ${need_mb} MB"
  confirm "Continue anyway?" "n" || die "Cancelled. Free up some disk space and re-run."
}

# Backups are never pruned by anything else, and a database dump per update
# adds up on a small disk.
prune_backups() {
  local keep="${SPIRIT_BACKUP_KEEP:-10}" old
  [[ "$keep" =~ ^[0-9]+$ ]] && (( keep > 0 )) || return 0
  [[ -d "$BACKUP_DIR" ]] || return 0
  # Directory names are timestamps, so lexical order is chronological.
  while IFS= read -r old; do
    [[ -n "$old" ]] || continue
    rm -rf "${BACKUP_DIR:?}/${old}" 2>/dev/null || true
  done < <(cd "$BACKUP_DIR" 2>/dev/null && ls -1 2>/dev/null | sort | head -n "-${keep}")
}

health_check() {
  local tries="${1:-20}" i
  for ((i = 1; i <= tries; i++)); do
    if curl -fsS --max-time 3 http://127.0.0.1:3000/health >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------

action_install() {
  require_root
  detect_os
  acquire_lock
  require_disk_space 3072

  if is_installed && [[ "$ASSUME_YES" != "1" ]]; then
    warn "Spirit-Panel is already installed at ${INSTALL_DIR} (v$(panel_version))"
    confirm "Re-run the installer over it?" "n" ||
      die "Nothing changed. Use option [2] to update instead."
  fi

  printf '  %sInstalling Spirit-Panel on %s%s\n\n' "$C_DIM" "$OS_NAME" "$C_RESET"

  if [[ -z "$PANEL_DOMAIN" ]]; then
    [[ -t 0 ]] || die "--domain is required when running non-interactively."
    printf '  The panel needs a domain that already points at this server.\n'
    printf '  %sFeatherWings uses it as remote: in config.yml.%s\n\n' "$C_DIM" "$C_RESET"
    PANEL_DOMAIN="$(ask 'Panel domain (e.g. panel.example.com)')"
  fi
  PANEL_DOMAIN="${PANEL_DOMAIN#http://}"
  PANEL_DOMAIN="${PANEL_DOMAIN#https://}"
  PANEL_DOMAIN="${PANEL_DOMAIN%%/*}"
  [[ -n "$PANEL_DOMAIN" ]] || die "A panel domain is required."
  [[ "$PANEL_DOMAIN" =~ ^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]] ||
    die "'${PANEL_DOMAIN}' does not look like a domain name."

  if [[ -z "$ADMIN_EMAIL" ]] && [[ -t 0 ]]; then
    ADMIN_EMAIL="$(ask 'Admin email' "admin@${PANEL_DOMAIN}")"
  fi
  [[ -n "$LETSENCRYPT_EMAIL" ]] || LETSENCRYPT_EMAIL="$ADMIN_EMAIL"

  if [[ "$WANT_TLS" == "1" ]] && [[ -z "$LETSENCRYPT_EMAIL" ]]; then
    WANT_TLS=0
    warn "No email given - skipping automatic TLS"
  fi

  printf '\n'
  info "Domain:      ${PANEL_DOMAIN}"
  info "Install dir: ${INSTALL_DIR}"
  info "Run as:      ${APP_USER}"
  info "TLS:         $([[ "$WANT_TLS" == "1" ]] && echo "certbot (${LETSENCRYPT_EMAIL})" || echo "skipped")"
  printf '\n'

  if ! confirm "Continue?" "y"; then
    die "Cancelled."
  fi
  printf '\n'

  install_prerequisites
  create_app_user
  fetch_source
  configure_redis
  write_env_file
  run_panel_installer
  install_systemd
  install_nginx
  setup_tls
  fix_permissions
  configure_firewall

  step "Verifying"
  if health_check; then
    ok "API healthy on 127.0.0.1:3000"
  else
    warn "API did not answer /health yet"
    info "Check: journalctl -u ${SERVICE_NAME} -n 50 --no-pager"
  fi

  print_install_summary
}

print_install_summary() {
  local scheme="https"
  [[ "$WANT_TLS" == "1" ]] && [[ "${TLS_FAILED:-0}" == "0" ]] || scheme="http"

  local admin_email admin_pass
  admin_email="$(env_get ADMIN_EMAIL || echo "admin@example.com")"
  admin_pass="$(env_get ADMIN_PASSWORD || echo "")"

  printf '\n%s%sSpirit-Panel is installed.%s\n\n' "$C_GREEN" "$C_BOLD" "$C_RESET"
  printf '  %sPanel%s        %s://%s\n' "$C_BOLD" "$C_RESET" "$scheme" "$PANEL_DOMAIN"
  printf '  %sVersion%s      %s\n' "$C_BOLD" "$C_RESET" "$(panel_version)"
  printf '  %sAdmin login%s  %s\n' "$C_BOLD" "$C_RESET" "$admin_email"
  if [[ "$ADMIN_PASSWORD_GENERATED" == "1" && -n "$admin_pass" ]]; then
    printf '  %sPassword%s     %s\n' "$C_BOLD" "$C_RESET" "$admin_pass"
    printf '\n  %sSave that password now - it is only stored in .env.%s\n' "$C_YELLOW" "$C_RESET"
  else
    # Do not echo a password the operator chose; they already have it.
    printf '  %sPassword%s     %s(the one you supplied)%s\n' "$C_BOLD" "$C_RESET" "$C_DIM" "$C_RESET"
  fi
  printf '\n  Next steps:\n'
  if [[ "${TLS_FAILED:-0}" == "1" ]]; then
    printf '    1. Point DNS at this server, then: certbot --nginx -d %s\n' "$PANEL_DOMAIN"
    printf '    2. Admin -> Locations, then Nodes, to add a FeatherWings node\n'
  else
    printf '    1. Open %s://%s/admin and log in\n' "$scheme" "$PANEL_DOMAIN"
    printf '    2. Admin -> Locations, then Nodes, to add a FeatherWings node\n'
  fi
  printf '    3. Admin -> Settings to disable public registration and set SMTP\n'
  printf '\n  Logs:    journalctl -u %s -f\n' "$SERVICE_NAME"
  printf '  Update:  sudo bash %s update\n\n' "$INSTALL_DIR/scripts/spirit.sh"
}

# ---------------------------------------------------------------------------
# Update
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
  url="$(env_get DATABASE_URL || echo "")"
  if [[ -z "$url" ]]; then
    warn "No DATABASE_URL - skipping database dump"
    return 0
  fi

  # mysql://user:pass@host:port/database?params
  #
  # Split the credentials on the *last* @ and the host on the *first* /, so a
  # password containing @ or / survives. Prisma requires percent-encoding in
  # this URL, so both halves of the credentials need decoding before mysqldump
  # sees them - that decode is why a generated password used to fail here.
  local rest creds hostport db user pass host port
  rest="${url#mysql://}"
  creds="${rest%@*}"
  hostport="${rest##*@}"
  db="${hostport#*/}"
  db="${db%%\?*}"
  hostport="${hostport%%/*}"
  user="$(urldecode "${creds%%:*}")"
  pass="$(urldecode "${creds#*:}")"
  host="${hostport%%:*}"
  port="${hostport#*:}"
  [[ "$port" == "$host" || -z "$port" ]] && port=3306
  [[ -z "$host" ]] && host=127.0.0.1

  if ! command -v mysqldump >/dev/null 2>&1; then
    warn "mysqldump not installed - skipping database dump"
    return 0
  fi

  local out="${BACKUP_PATH}/${db}.sql"
  local err="${BACKUP_PATH}/mysqldump.err"
  local cnf="${BACKUP_PATH}/.my.cnf"

  # A defaults file keeps the password off the command line, where it would be
  # visible in ps output.
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
    # Fallback: on Debian/Ubuntu MariaDB the root account authenticates over
    # the unix socket, so a plain root dump works even when the panel's own
    # credentials do not.
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
    # Show the reason instead of swallowing it - almost always access denied
    # or an unreachable host, and the user cannot decide safely without it.
    if [[ -s "$err" ]]; then
      local line
      while IFS= read -r line; do
        [[ -n "$line" ]] && printf '      %s\n' "$line"
      done < <(grep -v '^$' "$err" | head -n3)
      info "Full error: ${err}"
    fi
    if ! confirm "Continue updating without a database backup?" "n"; then
      die "Cancelled. Back up manually, then re-run the update."
    fi
  fi
  prune_backups
  info "Backup: ${BACKUP_PATH}"
}

update_source_git() {
  local before after
  before="$(as_app "cd '${INSTALL_DIR}' && git rev-parse --short HEAD" 2>/dev/null || echo "unknown")"

  if ! as_app "cd '${INSTALL_DIR}' && git diff --quiet HEAD -- . ':(exclude)pnpm-lock.yaml'" 2>/dev/null; then
    warn "Local modifications detected in ${INSTALL_DIR}"
    if confirm "Stash them and continue?" "n"; then
      as_app "cd '${INSTALL_DIR}' && git stash push -u -m 'spirit.sh update $(date -Iseconds)'" >/dev/null ||
        die "git stash failed"
      ok "Changes stashed (restore with: git stash pop)"
    else
      die "Cancelled. Commit or revert your changes, then re-run."
    fi
  fi

  as_app "cd '${INSTALL_DIR}' && git fetch --tags --prune origin" >/dev/null 2>&1 ||
    die "git fetch failed - check network access to ${REPO_URL}"

  local target="$GIT_REF"
  if [[ -z "$target" ]]; then
    target="$(as_app "cd '${INSTALL_DIR}' && git rev-parse --abbrev-ref --symbolic-full-name '@{u}'" 2>/dev/null || echo "origin/main")"
  fi

  as_app "cd '${INSTALL_DIR}' && git checkout --quiet '${target}' -- . 2>/dev/null || git -c advice.detachedHead=false checkout --quiet '${target}'" ||
    die "git checkout ${target} failed"
  as_app "cd '${INSTALL_DIR}' && git -c advice.detachedHead=false reset --hard '${target}'" >/dev/null ||
    die "git reset to ${target} failed"

  after="$(as_app "cd '${INSTALL_DIR}' && git rev-parse --short HEAD" 2>/dev/null || echo "unknown")"
  if [[ "$before" == "$after" ]]; then
    ok "Already at the newest commit (${after})"
  else
    ok "Updated ${before} -> ${after}"
  fi
}

update_source_tarball() {
  info "Not a git checkout - updating from the release tarball"
  local ref="${GIT_REF:-main}" tmp
  tmp="$(mktemp -d)"
  # shellcheck disable=SC2064
  trap "rm -rf '$tmp'" RETURN

  local url="https://codeload.github.com/${REPO_SLUG}/tar.gz/${ref}"
  curl -fsSL "$url" -o "${tmp}/src.tar.gz" ||
    die "Download failed: ${url}"
  tar -xzf "${tmp}/src.tar.gz" -C "$tmp" || die "Could not extract the tarball"

  # GitHub tarballs contain a single top-level directory named REPO-REF.
  # Match on "the one directory inside" rather than its name, which varies
  # with the branch or tag being installed.
  local src
  src="$(find "$tmp" -mindepth 1 -maxdepth 1 -type d | head -n1)"
  [[ -n "$src" ]] || die "Unexpected tarball layout: no directory inside ${url}"

  command -v rsync >/dev/null 2>&1 || apt_install rsync

  # Never touch secrets, installed modules, or build output.
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

# The update overwrites this very file. git and rsync both replace files by
# rename, so the running copy keeps its old inode and survives - but this
# script is meant to be run from inside the checkout it updates, so re-exec
# from a copy outside the tree and stop relying on that detail.
reexec_from_copy() {
  [[ "${SPIRIT_REEXEC:-0}" == "1" ]] && return 0
  local self copy
  self="$(readlink -f "$0" 2>/dev/null || printf '%s' "$0")"
  [[ -f "$self" ]] || return 0
  case "$self" in
    "${INSTALL_DIR}"/*) ;;
    *) return 0 ;;
  esac
  copy="$(mktemp /tmp/spirit-update.XXXXXX 2>/dev/null)" || return 0
  cp "$self" "$copy" 2>/dev/null || { rm -f "$copy"; return 0; }
  export SPIRIT_REEXEC=1 SPIRIT_SELF_COPY="$copy"
  exec bash "$copy" ${ORIGINAL_ARGS+"${ORIGINAL_ARGS[@]}"}
}

action_update() {
  require_root
  detect_os
  is_installed || die "No Spirit-Panel install found at ${INSTALL_DIR}. Run the installer first."
  # Re-exec before taking the lock, so only the surviving process holds it.
  reexec_from_copy
  acquire_lock
  require_disk_space 2048

  local from_version
  from_version="$(panel_version)"

  printf '  %sUpdating Spirit-Panel%s (currently v%s)\n' "$C_BOLD" "$C_RESET" "$from_version"
  printf '  The API will restart and be briefly unavailable.\n\n'
  if ! confirm "Continue?" "y"; then
    die "Cancelled."
  fi
  printf '\n'

  backup_before_update

  step "Updating source"
  if [[ -d "${INSTALL_DIR}/.git" ]]; then
    update_source_git
  else
    update_source_tarball
  fi

  step "Installing dependencies"
  # A panel installed before this script existed may have a corepack pnpm
  # shim and root-owned caches in the panel user's home; both break the
  # install as the panel user, so normalise them here too.
  install_pnpm
  ensure_app_home
  verify_pnpm_for_app_user
  local base="cd '${INSTALL_DIR}' && unset NODE_ENV &&"
  as_app "${base} pnpm install --no-frozen-lockfile" ||
    die "pnpm install failed. Nothing was restarted, so the running version is untouched."
  ok "Dependencies up to date"

  step "Building"
  as_app "${base} pnpm build" || die "Build failed. The old build is still in place; nothing was restarted."
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
    printf '\n  %sThe update applied but the API did not come back up.%s\n' "$C_YELLOW" "$C_RESET"
    printf '  Logs:    journalctl -u %s -n 80 --no-pager\n' "$SERVICE_NAME"
    printf '  Backup:  %s\n\n' "${BACKUP_PATH:-$BACKUP_DIR}"
    exit 1
  fi

  local to_version
  to_version="$(panel_version)"
  printf '\n%s%sUpdate complete.%s  v%s -> v%s\n\n' "$C_GREEN" "$C_BOLD" "$C_RESET" "$from_version" "$to_version"
  printf '  Backup:    %s\n' "${BACKUP_PATH:-none}"
  printf '  Changelog: https://github.com/%s/blob/main/docs/CHANGELOG.md\n\n' "$REPO_SLUG"
}

# ---------------------------------------------------------------------------
# Status / backup / uninstall
# ---------------------------------------------------------------------------

action_status() {
  is_installed || die "No Spirit-Panel install found at ${INSTALL_DIR}."

  printf '  %sSpirit-Panel status%s\n\n' "$C_BOLD" "$C_RESET"
  printf '    Version      %s\n' "$(panel_version)"
  printf '    Directory    %s\n' "$INSTALL_DIR"
  printf '    Panel URL    %s\n' "$(env_get API_URL || echo 'unset')"

  local svc
  svc="$(systemctl is-active "$SERVICE_NAME" 2>/dev/null || echo 'unknown')"
  if [[ "$svc" == "active" ]]; then
    printf '    API service  %sactive%s\n' "$C_GREEN" "$C_RESET"
  else
    printf '    API service  %s%s%s\n' "$C_RED" "$svc" "$C_RESET"
  fi

  for unit in nginx mariadb redis-server; do
    local state
    state="$(systemctl is-active "$unit" 2>/dev/null || echo 'unknown')"
    printf '    %-12s %s\n' "$unit" "$state"
  done

  printf '\n'
  if curl -fsS --max-time 3 http://127.0.0.1:3000/health >/dev/null 2>&1; then
    ok "Health endpoint responding"
    local ready
    ready="$(curl -fsS --max-time 5 http://127.0.0.1:3000/health/ready 2>/dev/null || echo '')"
    [[ -n "$ready" ]] && info "ready: ${ready}"
  else
    warn "Health endpoint not responding on 127.0.0.1:3000"
    info "journalctl -u ${SERVICE_NAME} -n 50 --no-pager"
  fi
  printf '\n'
}

action_backup() {
  require_root
  is_installed || die "No Spirit-Panel install found at ${INSTALL_DIR}."
  acquire_lock
  backup_before_update
  printf '\n%s%sBackup complete.%s  %s\n\n' "$C_GREEN" "$C_BOLD" "$C_RESET" "${BACKUP_PATH}"
}

action_uninstall() {
  require_root
  is_installed || die "No Spirit-Panel install found at ${INSTALL_DIR}."
  acquire_lock

  printf '\n  %sThis removes the panel service, nginx site, and %s%s\n' "$C_YELLOW" "$INSTALL_DIR" "$C_RESET"
  printf '  %sThe database and its user are left untouched.%s\n\n' "$C_DIM" "$C_RESET"
  confirm "Really uninstall Spirit-Panel?" "n" || die "Cancelled."

  step "Backing up before removal"
  backup_before_update

  step "Removing services"
  systemctl disable --now "$SERVICE_NAME" >/dev/null 2>&1 || true
  rm -f "/etc/systemd/system/${SERVICE_NAME}.service"
  systemctl daemon-reload
  ok "Service removed"

  rm -f "/etc/nginx/sites-enabled/${NGINX_SITE}" "/etc/nginx/sites-available/${NGINX_SITE}"
  systemctl reload nginx 2>/dev/null || true
  ok "nginx site removed"

  if safe_to_remove "$INSTALL_DIR"; then
    rm -rf "$INSTALL_DIR"
    ok "Removed ${INSTALL_DIR}"
  else
    warn "Refusing to delete '${INSTALL_DIR}' - it does not look like a panel checkout"
    info "Remove it by hand if that is really what you want"
  fi

  printf '\n%sSpirit-Panel uninstalled.%s\n' "$C_BOLD" "$C_RESET"
  printf '  Backup kept at: %s\n' "${BACKUP_PATH}"
  printf '  Drop the database manually if you no longer need it.\n\n'
}

# ---------------------------------------------------------------------------
# Menu
# ---------------------------------------------------------------------------

main_menu() {
  while true; do
    banner

    local state
    if is_installed; then
      state="${C_GREEN}installed${C_RESET} ${C_DIM}v$(panel_version)${C_RESET}"
    else
      state="${C_DIM}not installed${C_RESET}"
    fi
    printf '            %sMain Menu%s   %b\n\n' "$C_BOLD" "$C_RESET" "$state"

    printf '  %s[1]%s Install Spirit-Panel\n' "$C_CYAN" "$C_RESET"
    printf '  %s[2]%s Update Spirit-Panel\n' "$C_CYAN" "$C_RESET"
    printf '  %s[3]%s Show status\n' "$C_CYAN" "$C_RESET"
    printf '  %s[4]%s Back up database and .env\n' "$C_CYAN" "$C_RESET"
    printf '  %s[5]%s Uninstall\n' "$C_CYAN" "$C_RESET"
    printf '  %s[0]%s Exit\n\n' "$C_CYAN" "$C_RESET"

    local choice
    # A failed read means stdin closed. Without this the empty choice falls
    # through to the default branch and the menu loops forever.
    if ! read -r -p "  Select an option: " choice; then
      printf '\n\n  Input closed - exiting.\n\n'
      exit 0
    fi
    printf '\n'

    case "${choice// /}" in
      1) action_install; break ;;
      2) action_update; break ;;
      3) action_status; pause_menu ;;
      4) action_backup; pause_menu ;;
      5) action_uninstall; break ;;
      0 | q | Q | quit | exit) printf '  Bye.\n\n'; exit 0 ;;
      "") ;;
      *) printf '  %sUnknown option: %s%s\n' "$C_YELLOW" "$choice" "$C_RESET"; sleep 1 ;;
    esac
  done
}

pause_menu() {
  printf '\n'
  read -r -p "  Press Enter to return to the menu... " _ || true
}

usage() {
  cat <<EOF
Spirit-Panel installer / updater (v${SCRIPT_VERSION})

  curl -fsSL https://raw.githubusercontent.com/${REPO_SLUG}/main/scripts/spirit.sh -o /tmp/spirit.sh
  sudo bash /tmp/spirit.sh [command] [options]

  Already installed? Use the copy in the checkout:
  sudo bash ${INSTALL_DIR}/scripts/spirit.sh update

Commands:
  (none)              Interactive menu
  install             Install the panel
  update              Update an existing install
  status              Show service and health status
  backup              Dump the database and copy .env
  uninstall           Remove the service, nginx site, and app directory

Options:
  --domain DOMAIN     Panel domain, e.g. panel.example.com
  --admin-email MAIL  Admin account email (also used for Let's Encrypt)
  --admin-password P  Admin password (generated if omitted)
  --email MAIL        Let's Encrypt contact, if different from --admin-email
  --ref REF           Branch or tag to install/update to (default: main)
  --no-tls            Skip certbot; serve plain HTTP
  --force-nginx       Overwrite an existing nginx site config
  --install-dir DIR   Install location (default: ${INSTALL_DIR})
  --user USER         System user to own and run the panel (default: ${APP_USER})
  -y, --yes           Assume yes; never prompt
  -h, --help          Show this help

Examples:
  # Unattended install
  sudo bash /tmp/spirit.sh install --domain panel.example.com --admin-email me@example.com -y

  # Update to a specific release
  sudo bash /tmp/spirit.sh update --ref V1.3.0.1 -y

  # Install without TLS (behind an existing proxy)
  sudo bash /tmp/spirit.sh install --domain panel.example.com --no-tls -y

  # Fully non-interactive, no temp file (a pipe survives sudo; the
  # interactive menu does not, since it needs stdin)
  curl -fsSL https://raw.githubusercontent.com/${REPO_SLUG}/main/scripts/spirit.sh \\
    | sudo bash -s -- update -y
EOF
}

# ---------------------------------------------------------------------------
# Entry point
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

# Options that take a value must actually get one. Without this check a
# trailing `--domain` leaves $# unchanged (shift 2 fails with only one
# argument left) and the parse loop spins forever.
need_value() {
  [[ $# -ge 2 ]] || die "Option $1 needs a value.
Run with --help for usage."
  case "$2" in
    "" | -*) die "Option $1 needs a value (got '${2}').
Run with --help for usage." ;;
  esac
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    install | update | status | backup | uninstall)
      COMMAND="$1"; shift ;;
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
      # Only derive the install directory when it was not given explicitly,
      # so --install-dir and --user are order-independent.
      [[ "$INSTALL_DIR_SET" == "1" ]] || INSTALL_DIR="/home/${APP_USER}/Spirit-Panel"
      shift 2 ;;
    -y | --yes) ASSUME_YES=1; shift ;;
    -V | --version) printf 'spirit.sh %s\n' "$SCRIPT_VERSION"; exit 0 ;;
    -h | --help) usage; exit 0 ;;
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
      die "No TTY for the interactive menu - pass a command (install, update, ...)."
    fi
    ;;
esac
