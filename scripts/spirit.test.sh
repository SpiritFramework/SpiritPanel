#!/usr/bin/env bash
#
# Tests for scripts/spirit.sh
#
#   bash scripts/spirit.test.sh
#
# The installer drives apt, systemd, nginx, certbot, mysql and Redis, none of
# which exist in a test environment. Rather than restructure the script for
# injection, this harness puts stub executables first on PATH and points the
# script at a sandbox root. That runs the real control flow - argument parsing,
# ordering, .env generation, idempotency, failure handling - and lets each test
# assert on the commands the stubs recorded.
#
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${SCRIPT_DIR}/spirit.sh"

PASS=0
FAIL=0
FAILED_NAMES=()

RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; DIM=$'\033[2m'; BOLD=$'\033[1m'; RESET=$'\033[0m'

# ---------------------------------------------------------------------------
# Harness
# ---------------------------------------------------------------------------

SANDBOX=""

setup_sandbox() {
  SANDBOX="$(mktemp -d)"
  export SANDBOX
  mkdir -p "$SANDBOX/bin" "$SANDBOX/log" "$SANDBOX/etc/redis" \
    "$SANDBOX/etc/nginx/sites-available" "$SANDBOX/etc/nginx/sites-enabled" \
    "$SANDBOX/etc/systemd/system" "$SANDBOX/etc/sudoers.d" "$SANDBOX/backups"

  export CMDLOG="$SANDBOX/log/commands.log"
  : > "$CMDLOG"

  # /etc/os-release lookalike, read via `. /etc/os-release`.
  cat > "$SANDBOX/os-release" <<'EOF'
ID=ubuntu
PRETTY_NAME="Ubuntu 24.04 LTS (sandbox)"
EOF

  # Debian ships redis.conf with requirepass present but commented out.
  cat > "$SANDBOX/etc/redis/redis.conf" <<'EOF'
bind 127.0.0.1 -::1
port 6379
# requirepass foobared
appendonly no
EOF

  make_stubs
  export PATH="$SANDBOX/bin:$PATH"
}

teardown_sandbox() {
  [[ -n "$SANDBOX" && -d "$SANDBOX" ]] && rm -rf "$SANDBOX"
  SANDBOX=""
}

# Every stub logs its invocation so tests can assert on ordering and arguments.
make_stubs() {
  local logger='printf "%s %s\n" "$(basename "$0")" "$*" >> "$CMDLOG"'

  _stub() {
    local name="$1"; shift
    {
      printf '#!/usr/bin/env bash\n'
      printf 'printf "%%s %%s\\n" "%s" "$*" >> "$CMDLOG"\n' "$name"
      cat
    } > "$SANDBOX/bin/$name"
    chmod +x "$SANDBOX/bin/$name"
  }

  _stub apt-get <<'EOF'
exit 0
EOF

  _stub systemctl <<'EOF'
case "${1:-}" in
  is-active)
    case "${2:-}" in
      *) echo active ;;
    esac
    ;;
esac
exit 0
EOF

  _stub nginx <<'EOF'
# -t validates config; succeed unless a test asked for failure.
if [[ "${SPIRIT_TEST_NGINX_FAIL:-0}" == "1" ]]; then
  echo "nginx: configuration file test failed" >&2
  exit 1
fi
exit 0
EOF

  _stub certbot <<'EOF'
if [[ "${SPIRIT_TEST_CERTBOT_FAIL:-0}" == "1" ]]; then
  exit 1
fi
mkdir -p "$SANDBOX/etc/letsencrypt/live/${SPIRIT_TEST_DOMAIN:-panel.example.com}"
exit 0
EOF

  _stub redis-cli <<'EOF'
echo PONG
exit 0
EOF

  _stub adduser <<'EOF'
exit 0
EOF

  _stub id <<'EOF'
# Root for privilege checks; report the panel user as existing only when a
# test has created it.
if [[ "${1:-}" == "-u" ]]; then echo 0; exit 0; fi
if [[ -f "$SANDBOX/user-exists" ]]; then exit 0; fi
exit 1
EOF

  _stub runuser <<'EOF'
# runuser -u USER -- bash -lc "CMD"  ->  run CMD directly in the sandbox.
cmd=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -u) shift 2 ;;
    --) shift ;;
    bash) shift ;;
    -lc) cmd="$2"; shift 2 ;;
    *) shift ;;
  esac
done
if [[ "${SPIRIT_TEST_PNPM_FAIL:-0}" == "1" ]] && [[ "$cmd" == *"pnpm install"* ]]; then
  exit 1
fi
if [[ "${SPIRIT_TEST_BUILD_FAIL:-0}" == "1" ]] && [[ "$cmd" == *"pnpm build"* ]]; then
  exit 1
fi
if [[ "${SPIRIT_TEST_MIGRATE_FAIL:-0}" == "1" ]] && [[ "$cmd" == *"migrate deploy"* ]]; then
  exit 1
fi
bash -c "$cmd"
EOF

  _stub pnpm <<'EOF'
[[ "${1:-}" == "--version" ]] && { echo "9.15.9"; exit 0; }
# spirit-install normally writes DATABASE_URL back into .env after
# provisioning the database; emulate just that side effect.
for arg in "$@"; do
  if [[ "$arg" == "spirit-install" ]]; then
    envf="${SPIRIT_TEST_INSTALL_DIR}/apps/panel-api/.env"
    if [[ -f "$envf" ]]; then
      tmp="$(mktemp)"
      sed 's|^DATABASE_URL=.*|DATABASE_URL="mysql://spirit_panel:seeded-pw@127.0.0.1:3306/spirit_panel"|' \
        "$envf" > "$tmp"
      mv "$tmp" "$envf"
    fi
    mkdir -p "${SPIRIT_TEST_INSTALL_DIR}/apps/panel-web/dist"
    echo "<html></html>" > "${SPIRIT_TEST_INSTALL_DIR}/apps/panel-web/dist/index.html"
  fi
done
exit 0
EOF

  _stub curl <<'EOF'
# Health checks and the NodeSource script both come through curl.
for arg in "$@"; do
  case "$arg" in
    *"/health"*)
      if [[ "${SPIRIT_TEST_HEALTH_FAIL:-0}" == "1" ]]; then exit 1; fi
      echo '{"status":"ok"}'; exit 0 ;;
    *nodesource*) echo "true"; exit 0 ;;
    *codeload*|*tar.gz*)
      # Emulate downloading a release tarball.
      out=""
      prev=""
      for a in "$@"; do
        [[ "$prev" == "-o" ]] && out="$a"
        prev="$a"
      done
      if [[ -n "$out" ]] && [[ -n "${SPIRIT_TEST_TARBALL:-}" ]]; then
        cp "$SPIRIT_TEST_TARBALL" "$out"
      fi
      exit 0 ;;
  esac
done
exit 0
EOF

  _stub mysqldump <<'EOF'
# Record the credentials we were handed, then behave like the real thing:
# reject a wrong password on stderr. The previous stub succeeded regardless,
# which is why a percent-encoded password silently broke the dump in the field.
cnf=""
for arg in "$@"; do
  case "$arg" in --defaults-extra-file=*) cnf="${arg#*=}" ;; esac
done

if [[ -n "$cnf" && -f "$cnf" ]]; then
  cp "$cnf" "$SANDBOX/last-mysqldump.cnf"
  got="$(sed -n 's/^password="\{0,1\}//p' "$cnf" | sed 's/"$//')"
  printf '%s\n' "$got" > "$SANDBOX/last-mysqldump-password"
else
  # No defaults file means the root socket fallback.
  echo "socket" > "$SANDBOX/last-mysqldump-socket"
  if [[ "${SPIRIT_TEST_SOCKET_DUMP_FAIL:-0}" == "1" ]]; then
    echo "mysqldump: Got error: 1045: Access denied for user 'root'@'localhost'" >&2
    exit 2
  fi
  echo "-- dump"
  exit 0
fi

if [[ "${SPIRIT_TEST_DUMP_FAIL:-0}" == "1" ]]; then
  echo "mysqldump: Got error: 1045: Access denied for user 'spirit_panel'@'localhost' (using password: YES)" >&2
  exit 2
fi

# When a test declares the password the panel really has, enforce it.
if [[ -n "${SPIRIT_TEST_EXPECT_DB_PASSWORD:-}" && "$got" != "$SPIRIT_TEST_EXPECT_DB_PASSWORD" ]]; then
  echo "mysqldump: Got error: 1045: Access denied for user (using password: YES)" >&2
  exit 2
fi
echo "-- dump"
exit 0
EOF

  _stub getent <<'EOF'
# getent passwd <user> -> the sandbox home, so app_home/ensure_app_home work.
if [[ "${1:-}" == "passwd" ]]; then
  printf '%s:x:1001:1001::%s:/bin/bash\n' "${2:-spiritpanel}" "$SANDBOX/apphome"
  exit 0
fi
exit 2
EOF

  _stub gzip <<'EOF'
exit 0
EOF

  _stub chown <<'EOF'
# Ownership changes cannot be verified in the sandbox, so record the call and
# succeed. Tests assert on the recorded arguments instead.
exit 0
EOF

  _stub node <<'EOF'
[[ "${1:-}" == "-v" ]] && { echo "v20.19.0"; exit 0; }
exit 0
EOF

  _stub npm <<'EOF'
# Emulate `npm install -g pnpm@x` taking over /usr/bin/pnpm from the corepack
# shim: promote the shim in bin/corepack/ to a plain global pnpm.
if [[ "$*" == *"pnpm@"* && -f "$SANDBOX/bin/corepack/pnpm" ]]; then
  cp "$SANDBOX/bin/corepack/pnpm" "$SANDBOX/bin/pnpm"
  chmod +x "$SANDBOX/bin/pnpm"
  rm -f "$SANDBOX/bin/corepack/pnpm"
fi
exit 0
EOF

  _stub ufw <<'EOF'
[[ "${1:-}" == "status" ]] && { echo "Status: inactive"; exit 0; }
exit 0
EOF

  _stub openssl <<'EOF'
# Deterministic, long enough to pass the 12-char admin password rule.
echo "TESTSECRET0123456789abcdefGHIJKLMNOP+/=="
exit 0
EOF

  _stub tar <<'EOF'
# Extract for real when asked; the sandbox builds genuine tarballs.
exec /usr/bin/tar "$@"
EOF

  # Git Bash has no rsync, so emulate the subset the updater uses:
  # rsync -a --delete --exclude PAT ... SRC/ DEST/
  _stub rsync <<'EOF'
excludes=()
positional=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --exclude) excludes+=("$2"); shift 2 ;;
    --exclude=*) excludes+=("${1#--exclude=}"); shift ;;
    -a | --delete | -*) shift ;;
    *) positional+=("$1"); shift ;;
  esac
done
src="${positional[0]%/}"
dest="${positional[1]%/}"
[[ -d "$src" && -n "$dest" ]] || exit 1

is_excluded() {
  local rel="$1" pat p
  for pat in "${excludes[@]}"; do
    p="${pat%/}"
    p="${p#\*\*/}"
    case "$rel" in
      "$p" | "$p"/* | */"$p" | */"$p"/*) return 0 ;;
    esac
  done
  return 1
}

# Copy everything not excluded.
while IFS= read -r f; do
  rel="${f#./}"
  is_excluded "$rel" && continue
  mkdir -p "${dest}/$(dirname "$rel")"
  cp -p "${src}/${rel}" "${dest}/${rel}"
done < <(cd "$src" && find . -type f)

# --delete: drop files in dest that are gone upstream, honouring excludes.
while IFS= read -r f; do
  rel="${f#./}"
  is_excluded "$rel" && continue
  [[ -f "${src}/${rel}" ]] || rm -f "${dest}/${rel}"
done < <(cd "$dest" && find . -type f)
exit 0
EOF

  # Logged so permission handling can be asserted: msys cannot represent POSIX
  # modes, so checking the filesystem would always report 644.
  _stub chmod <<'EOF'
/usr/bin/chmod "$@" 2>/dev/null
exit 0
EOF
}

# Build a fake panel checkout so fetch/update have something to work on.
make_fake_checkout() {
  local dir="$1" version="${2:-1.3.0.1}" git_repo="${3:-yes}"
  mkdir -p "$dir/apps/panel-api/prisma" "$dir/apps/panel-web" \
    "$dir/deploy/systemd" "$dir/deploy/nginx" "$dir/deploy/env"

  cat > "$dir/package.json" <<EOF
{ "name": "spirit-panel", "version": "${version}" }
EOF
  cat > "$dir/apps/panel-api/package.json" <<EOF
{ "name": "@spirit/panel-api", "version": "${version}" }
EOF

  cat > "$dir/deploy/env/production.example" <<'EOF'
DATABASE_URL="mysql://spirit_panel:CHANGE_ME@127.0.0.1:3306/spirit_panel"
JWT_SECRET="CHANGE_ME_GENERATE_WITH_OPENSSL"
APP_KEY="CHANGE_ME_GENERATE_WITH_OPENSSL"
API_URL="https://panel.example.com"
PANEL_URL="https://panel.example.com"
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD="CHANGE_ME_GENERATE_WITH_OPENSSL"
ADMIN_EMAIL=admin@example.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD="CHANGE_ME_STRONG_ADMIN_PASSWORD"
EOF

  cat > "$dir/deploy/systemd/spirit-panel-api.service" <<'EOF'
[Unit]
Description=Spirit-Panel API

[Service]
User=spiritpanel
Group=spiritpanel
WorkingDirectory=/home/spiritpanel/Spirit-Panel/apps/panel-api
EnvironmentFile=/home/spiritpanel/Spirit-Panel/apps/panel-api/.env
ExecStart=/usr/bin/node dist/index.js
EOF

  cat > "$dir/deploy/nginx/spirit-panel.conf" <<'EOF'
server {
    listen 443 ssl;
    server_name panel.example.com;
    root /home/spiritpanel/Spirit-Panel/apps/panel-web/dist;
    ssl_certificate /etc/letsencrypt/live/panel.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/panel.example.com/privkey.pem;
}
EOF

  if [[ "$git_repo" == "yes" ]]; then
    ( cd "$dir" &&
      git init -q -b main 2>/dev/null &&
      git -c user.email=t@t -c user.name=t add -A 2>/dev/null &&
      git -c user.email=t@t -c user.name=t commit -qm init 2>/dev/null ) || true
  fi
}

# Give a checkout a real upstream holding a newer commit, so the git update
# path exercises an actual fetch/reset rather than a stubbed one.
make_origin_with_newer_commit() {
  local dir="$1" new_version="$2"
  local origin="$SANDBOX/origin.git"
  local work="$SANDBOX/origin-work"

  git init -q --bare -b main "$origin"
  ( cd "$dir" &&
    git remote add origin "$origin" &&
    git -c user.email=t@t -c user.name=t push -q -u origin main ) >/dev/null 2>&1

  git clone -q "$origin" "$work" >/dev/null 2>&1
  # A release bump: new version plus a file that must land in the checkout.
  sed -i "s|\"version\": \"[^\"]*\"|\"version\": \"${new_version}\"|" \
    "$work/apps/panel-api/package.json"
  echo "shipped in ${new_version}" > "$work/UPDATED.md"
  ( cd "$work" &&
    git -c user.email=t@t -c user.name=t add -A &&
    git -c user.email=t@t -c user.name=t commit -qm "release ${new_version}" &&
    git -c user.email=t@t -c user.name=t push -q origin main ) >/dev/null 2>&1
}

# Run spirit.sh with sandbox paths substituted for real system paths.
run_spirit() {
  local sandboxed="$SANDBOX/spirit.sh"
  sed \
    -e "s|/etc/os-release|$SANDBOX/os-release|g" \
    -e "s|/etc/systemd/system|$SANDBOX/etc/systemd/system|g" \
    -e "s|/etc/nginx|$SANDBOX/etc/nginx|g" \
    -e "s|/etc/redis/redis.conf|$SANDBOX/etc/redis/redis.conf|g" \
    -e "s|/etc/letsencrypt|$SANDBOX/etc/letsencrypt|g" \
    -e "s|/etc/sudoers.d|$SANDBOX/etc/sudoers.d|g" \
    -e "s|/var/www/html|$SANDBOX/var/www/html|g" \
    "$TARGET" > "$sandboxed"
  if [[ "${SPIRIT_TEST_TRACE:-0}" == "1" ]]; then
    bash -x "$sandboxed" "$@" 2>&1
  else
    bash "$sandboxed" "$@" 2>&1
  fi
}

# ---------------------------------------------------------------------------
# Assertions
# ---------------------------------------------------------------------------

CURRENT_TEST=""
TEST_ERRORS=""

it() {
  CURRENT_TEST="$1"
  TEST_ERRORS=""
}

expect_contains() {
  local haystack="$1" needle="$2" label="${3:-output}"
  if [[ "$haystack" != *"$needle"* ]]; then
    TEST_ERRORS+="      expected ${label} to contain: ${needle}"$'\n'
  fi
}

expect_not_contains() {
  local haystack="$1" needle="$2" label="${3:-output}"
  if [[ "$haystack" == *"$needle"* ]]; then
    TEST_ERRORS+="      expected ${label} NOT to contain: ${needle}"$'\n'
  fi
}

expect_file_contains() {
  local file="$1" needle="$2"
  if [[ ! -f "$file" ]]; then
    TEST_ERRORS+="      missing file: ${file}"$'\n'
  elif ! grep -qF -- "$needle" "$file"; then
    TEST_ERRORS+="      ${file} does not contain: ${needle}"$'\n'
  fi
}

expect_file_exists() {
  [[ -f "$1" ]] || TEST_ERRORS+="      missing file: $1"$'\n'
}

expect_eq() {
  local actual="$1" expected="$2" label="${3:-value}"
  if [[ "$actual" != "$expected" ]]; then
    TEST_ERRORS+="      ${label}: expected '${expected}', got '${actual}'"$'\n'
  fi
}

SKIPPED=0

# Used where the harness itself cannot emulate a dependency faithfully. The
# real behaviour still needs checking on a Linux host.
skip() {
  SKIPPED=$((SKIPPED + 1))
  printf '  %s~%s %s %s(skipped: %s)%s\n' "$YELLOW" "$RESET" "$1" "$DIM" "$2" "$RESET"
}

done_test() {
  if [[ -z "$TEST_ERRORS" ]]; then
    PASS=$((PASS + 1))
    printf '  %s+%s %s\n' "$GREEN" "$RESET" "$CURRENT_TEST"
  else
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$CURRENT_TEST")
    printf '  %sx%s %s\n' "$RED" "$RESET" "$CURRENT_TEST"
    printf '%s' "$TEST_ERRORS"
  fi
}

section() { printf '\n%s%s%s\n' "$BOLD" "$1" "$RESET"; }

# SPIRIT_TEST_DEBUG=1 prints the captured run output, for diagnosing a failure.
dbg() {
  [[ "${SPIRIT_TEST_DEBUG:-0}" == "1" ]] || return 0
  printf '%s----- %s -----%s\n%s\n%s---------------%s\n' \
    "$DIM" "${1:-output}" "$RESET" "${2:-}" "$DIM" "$RESET"
}

# ---------------------------------------------------------------------------
# Tests: CLI surface
# ---------------------------------------------------------------------------

section "Command line interface"

setup_sandbox
out="$(run_spirit --help)"
it "--help lists install and update"
expect_contains "$out" "install" "help"
expect_contains "$out" "update" "help"
expect_contains "$out" "--domain" "help"
expect_contains "$out" "--no-tls" "help"
done_test

it "rejects unknown options"
out="$(run_spirit --bogus)"
expect_contains "$out" "Unknown option" "output"
done_test

it "install refuses to run without a domain when non-interactive"
out="$(run_spirit install -y < /dev/null)"
expect_contains "$out" "--domain is required" "output"
done_test

it "install validates the domain shape"
out="$(run_spirit install --domain "not a domain" -y < /dev/null)"
expect_contains "$out" "does not look like a domain" "output"
done_test

it "install strips a scheme and path from --domain"
out="$(run_spirit install --domain "https://panel.example.com/admin" --no-tls -y < /dev/null)"
expect_not_contains "$out" "does not look like a domain" "output"
done_test

it "rejects an admin password the seed would reject"
export SPIRIT_TEST_INSTALL_DIR="$SANDBOX/panel"
make_fake_checkout "$SANDBOX/panel"
out="$(SPIRIT_INSTALL_DIR="$SANDBOX/panel" run_spirit install \
  --domain panel.example.com --admin-password short --no-tls -y < /dev/null)"
expect_contains "$out" "at least 12 characters" "output"
done_test
teardown_sandbox

# ---------------------------------------------------------------------------
# Tests: install
# ---------------------------------------------------------------------------

section "Install"

setup_sandbox
export SPIRIT_TEST_DOMAIN="panel.example.com"
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR"
touch "$SANDBOX/user-exists"

install_out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/backups" \
  run_spirit install --domain panel.example.com --admin-email ops@example.com -y < /dev/null)"
ENVF="$INSTALL_DIR/apps/panel-api/.env"

it "completes and reports success"
expect_contains "$install_out" "Spirit-Panel is installed" "output"
done_test

it "writes .env with generated secrets, not placeholders"
expect_file_exists "$ENVF"
expect_not_contains "$(cat "$ENVF" 2>/dev/null || echo)" "CHANGE_ME_GENERATE" ".env"
expect_file_contains "$ENVF" 'JWT_SECRET="TESTSECRET'
expect_file_contains "$ENVF" 'APP_KEY="TESTSECRET'
done_test

it "sets the admin email the seed requires"
expect_file_contains "$ENVF" 'ADMIN_EMAIL="ops@example.com"'
expect_file_contains "$ENVF" 'ADMIN_USERNAME="admin"'
done_test

it "sets a strong admin password and prints it"
expect_file_contains "$ENVF" 'ADMIN_PASSWORD="TESTSECRET'
expect_contains "$install_out" "TESTSECRET" "output"
done_test

it "points API_URL and PANEL_URL at the domain over https"
expect_file_contains "$ENVF" 'API_URL="https://panel.example.com"'
expect_file_contains "$ENVF" 'PANEL_URL="https://panel.example.com"'
done_test

it "leaves DATABASE_URL for spirit-install to provision"
expect_file_contains "$ENVF" 'DATABASE_URL="mysql://spirit_panel:seeded-pw@'
done_test

it "does not pass --admin-email to spirit-install"
# spirit-install aborts on unknown flags, so this must never appear.
expect_not_contains "$(grep 'spirit-install' "$CMDLOG" || echo)" "--admin-email" "pnpm invocation"
expect_contains "$(grep 'spirit-install' "$CMDLOG" || echo)" "--production" "pnpm invocation"
done_test

it "unsets NODE_ENV so pnpm installs devDependencies"
# With NODE_ENV=production, pnpm skips tsx/vite/tsc and the build fails.
expect_contains "$(cat "$SANDBOX/spirit.sh")" "unset NODE_ENV" "script"
done_test

it "configures Redis auth on both sides"
expect_file_contains "$SANDBOX/etc/redis/redis.conf" "requirepass"
redis_pw="$(sed -n 's/^requirepass[[:space:]]\+//p' "$SANDBOX/etc/redis/redis.conf" | tail -n1)"
expect_file_contains "$ENVF" "REDIS_PASSWORD=\"${redis_pw}\""
expect_file_contains "$ENVF" 'DISABLE_SCHEDULE_WORKER="false"'
done_test

it "retargets the systemd unit at the install directory"
UNIT="$SANDBOX/etc/systemd/system/spirit-panel-api.service"
expect_file_exists "$UNIT"
expect_file_contains "$UNIT" "WorkingDirectory=$INSTALL_DIR/apps/panel-api"
expect_file_contains "$UNIT" "EnvironmentFile=$INSTALL_DIR/apps/panel-api/.env"
done_test

it "enables and starts the service"
expect_contains "$(cat "$CMDLOG")" "systemctl enable spirit-panel-api" "commands"
expect_contains "$(cat "$CMDLOG")" "systemctl restart spirit-panel-api" "commands"
done_test

it "enables the nginx site with the right root"
expect_file_exists "$SANDBOX/etc/nginx/sites-available/spirit-panel"
expect_file_contains "$SANDBOX/etc/nginx/sites-available/spirit-panel" "$INSTALL_DIR/apps/panel-web/dist"
done_test

it "validates nginx before reloading it"
cmds="$(cat "$CMDLOG")"
nginx_t_line="$(grep -n 'nginx -t' "$CMDLOG" | head -n1 | cut -d: -f1)"
reload_line="$(grep -n 'systemctl reload nginx' "$CMDLOG" | head -n1 | cut -d: -f1)"
if [[ -z "$nginx_t_line" ]]; then
  TEST_ERRORS+="      nginx -t was never run"$'\n'
elif [[ -n "$reload_line" ]] && (( nginx_t_line > reload_line )); then
  TEST_ERRORS+="      nginx reloaded before validation"$'\n'
fi
done_test

it "removes the temporary install sudoers rule"
if [[ -f "$SANDBOX/etc/sudoers.d/spirit-panel-install" ]]; then
  TEST_ERRORS+="      sudoers rule was left behind"$'\n'
fi
done_test

it "locks .env to 600 and makes the web root readable by nginx"
expect_contains "$(cat "$CMDLOG")" "chmod 600 ${ENVF}" "commands"
expect_contains "$(cat "$CMDLOG")" "chmod -R o+rX ${INSTALL_DIR}/apps/panel-web/dist" "commands"
done_test
teardown_sandbox

section "Install - TLS handling"

setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
export SPIRIT_TEST_DOMAIN="panel.example.com"
make_fake_checkout "$INSTALL_DIR"
touch "$SANDBOX/user-exists"

it "serves HTTP first so the ACME challenge can complete"
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" run_spirit install \
  --domain panel.example.com --admin-email a@b.com -y < /dev/null)"
# The full config references certs that do not exist yet, so a bootstrap
# vhost must be written before certbot runs.
expect_contains "$out" "temporary HTTP vhost" "output"
expect_contains "$(cat "$CMDLOG")" "certbot" "commands"
done_test

it "installs the hardened config after certbot succeeds"
expect_file_contains "$SANDBOX/etc/nginx/sites-available/spirit-panel" "letsencrypt/live/panel.example.com"
expect_contains "$out" "Full nginx config active" "output"
done_test
teardown_sandbox

setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR"
touch "$SANDBOX/user-exists"

it "keeps serving HTTP when certbot fails instead of breaking nginx"
out="$(SPIRIT_TEST_CERTBOT_FAIL=1 SPIRIT_INSTALL_DIR="$INSTALL_DIR" run_spirit install \
  --domain panel.example.com --admin-email a@b.com -y < /dev/null)"
expect_contains "$out" "could not issue a certificate" "output"
expect_contains "$out" "Spirit-Panel is installed" "output"
# Must advertise http, not a broken https URL.
expect_contains "$out" "http://panel.example.com" "output"
done_test
teardown_sandbox

setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR"
touch "$SANDBOX/user-exists"

it "--no-tls skips certbot entirely"
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" run_spirit install \
  --domain panel.example.com --admin-email a@b.com --no-tls -y < /dev/null)"
expect_contains "$out" "Skipping TLS" "output"
expect_not_contains "$(cat "$CMDLOG")" "certbot" "commands"
done_test
teardown_sandbox

section "Install - failure and idempotency"

setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR"
touch "$SANDBOX/user-exists"

it "aborts if pnpm install fails, before touching systemd"
out="$(SPIRIT_TEST_PNPM_FAIL=1 SPIRIT_INSTALL_DIR="$INSTALL_DIR" run_spirit install \
  --domain panel.example.com --admin-email a@b.com --no-tls -y < /dev/null)"
expect_contains "$out" "pnpm install failed" "output"
expect_not_contains "$(cat "$CMDLOG")" "systemctl restart spirit-panel-api" "commands"
done_test
teardown_sandbox

setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR"
touch "$SANDBOX/user-exists"
mkdir -p "$INSTALL_DIR/apps/panel-api"
cat > "$INSTALL_DIR/apps/panel-api/.env" <<'EOF'
DATABASE_URL="mysql://existing:pw@127.0.0.1:3306/spirit_panel"
JWT_SECRET="EXISTING_SECRET_DO_NOT_TOUCH"
ADMIN_EMAIL="original@example.com"
ADMIN_PASSWORD="original-password-123"
EOF

it "re-running the installer preserves an existing .env"
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" run_spirit install \
  --domain panel.example.com --no-tls -y < /dev/null)"
expect_contains "$out" "Keeping the existing .env" "output"
expect_file_contains "$INSTALL_DIR/apps/panel-api/.env" "EXISTING_SECRET_DO_NOT_TOUCH"
expect_file_contains "$INSTALL_DIR/apps/panel-api/.env" 'ADMIN_EMAIL="original@example.com"'
done_test

it "does not clobber a customised nginx site without --force-nginx"
printf 'server { server_name custom.example.com; # hand edited\n}\n' \
  > "$SANDBOX/etc/nginx/sites-available/spirit-panel"
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" run_spirit install \
  --domain panel.example.com --no-tls -y < /dev/null)"
expect_contains "$out" "leaving your config untouched" "output"
expect_file_contains "$SANDBOX/etc/nginx/sites-available/spirit-panel" "hand edited"
done_test

it "--force-nginx does overwrite it"
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" run_spirit install \
  --domain panel.example.com --no-tls --force-nginx -y < /dev/null)"
expect_not_contains "$(cat "$SANDBOX/etc/nginx/sites-available/spirit-panel")" "hand edited" "nginx site"
done_test
teardown_sandbox

# ---------------------------------------------------------------------------
# Tests: update
# ---------------------------------------------------------------------------

section "Update"

setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR" "1.3.0.0"
make_origin_with_newer_commit "$INSTALL_DIR" "1.3.0.2"
touch "$SANDBOX/user-exists"
mkdir -p "$INSTALL_DIR/apps/panel-api"
cat > "$INSTALL_DIR/apps/panel-api/.env" <<'EOF'
DATABASE_URL="mysql://spirit_panel:secretpw@127.0.0.1:3306/spirit_panel"
JWT_SECRET="KEEP_ME"
API_URL="https://panel.example.com"
ADMIN_EMAIL="ops@example.com"
EOF

it "refuses to update when nothing is installed"
out="$(SPIRIT_INSTALL_DIR="$SANDBOX/nope" run_spirit update -y < /dev/null)"
expect_contains "$out" "No Spirit-Panel install found" "output"
done_test

update_out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/backups" \
  run_spirit update -y < /dev/null)"
dbg "update" "$update_out"

it "completes and reports the version change"
expect_contains "$update_out" "Update complete" "output"
expect_contains "$update_out" "1.3.0.0 -> v1.3.0.2" "output"
done_test

it "actually pulls the new commit into the checkout"
expect_file_exists "$INSTALL_DIR/UPDATED.md"
expect_eq "$(sed -n 's/.*"version"[^"]*"\([^"]*\)".*/\1/p' "$INSTALL_DIR/apps/panel-api/package.json" | head -n1)" \
  "1.3.0.2" "version after git update"
done_test

it "backs up .env before changing anything"
found=""
for d in "$SANDBOX"/backups/*/; do
  [[ -f "${d}panel-api.env" ]] && found="${d}panel-api.env"
done
if [[ -z "$found" ]]; then
  TEST_ERRORS+="      no .env backup was written"$'\n'
else
  grep -qF "KEEP_ME" "$found" || TEST_ERRORS+="      .env backup has the wrong contents"$'\n'
fi
done_test

it "dumps the database before changing anything"
expect_contains "$(cat "$CMDLOG")" "mysqldump" "commands"
dump_line="$(grep -n 'mysqldump' "$CMDLOG" | head -n1 | cut -d: -f1)"
restart_line="$(grep -n 'systemctl restart spirit-panel-api' "$CMDLOG" | head -n1 | cut -d: -f1)"
if [[ -n "$dump_line" && -n "$restart_line" ]] && (( dump_line > restart_line )); then
  TEST_ERRORS+="      database dumped after the service restarted"$'\n'
fi
done_test

it "never writes the database password on the mysqldump command line"
expect_not_contains "$(cat "$CMDLOG")" "secretpw" "commands"
expect_contains "$(cat "$CMDLOG")" "defaults-extra-file" "commands"
done_test

it "preserves .env across the update"
expect_file_contains "$INSTALL_DIR/apps/panel-api/.env" "KEEP_ME"
expect_file_contains "$INSTALL_DIR/apps/panel-api/.env" 'ADMIN_EMAIL="ops@example.com"'
done_test

it "runs migrations and restarts in the right order"
mig_line="$(grep -n 'migrate deploy' "$CMDLOG" | head -n1 | cut -d: -f1)"
restart_line="$(grep -n 'systemctl restart spirit-panel-api' "$CMDLOG" | head -n1 | cut -d: -f1)"
if [[ -z "$mig_line" ]]; then
  TEST_ERRORS+="      prisma migrate deploy never ran"$'\n'
elif [[ -n "$restart_line" ]] && (( mig_line > restart_line )); then
  TEST_ERRORS+="      migrations ran after the restart"$'\n'
fi
done_test

it "health checks after restarting"
expect_contains "$update_out" "API healthy" "output"
done_test
teardown_sandbox

section "Update - failure handling"

setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR"
make_origin_with_newer_commit "$INSTALL_DIR" "1.3.0.2"
mkdir -p "$INSTALL_DIR/apps/panel-api"
echo 'DATABASE_URL="mysql://u:p@127.0.0.1:3306/spirit_panel"' > "$INSTALL_DIR/apps/panel-api/.env"

it "a failed build does not restart the service"
out="$(SPIRIT_TEST_BUILD_FAIL=1 SPIRIT_INSTALL_DIR="$INSTALL_DIR" \
  SPIRIT_BACKUP_DIR="$SANDBOX/backups" run_spirit update -y < /dev/null)"
expect_contains "$out" "Build failed" "output"
expect_contains "$out" "nothing was restarted" "output"
expect_not_contains "$(cat "$CMDLOG")" "systemctl restart spirit-panel-api" "commands"
done_test
teardown_sandbox

setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR"
make_origin_with_newer_commit "$INSTALL_DIR" "1.3.0.2"
mkdir -p "$INSTALL_DIR/apps/panel-api"
echo 'DATABASE_URL="mysql://u:p@127.0.0.1:3306/spirit_panel"' > "$INSTALL_DIR/apps/panel-api/.env"

it "a failed migration stops before restarting, keeping the old version live"
out="$(SPIRIT_TEST_MIGRATE_FAIL=1 SPIRIT_INSTALL_DIR="$INSTALL_DIR" \
  SPIRIT_BACKUP_DIR="$SANDBOX/backups" run_spirit update -y < /dev/null)"
expect_contains "$out" "migrate deploy failed" "output"
expect_contains "$out" "keeps running" "output"
expect_not_contains "$(cat "$CMDLOG")" "systemctl restart spirit-panel-api" "commands"
done_test
teardown_sandbox

setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR"
make_origin_with_newer_commit "$INSTALL_DIR" "1.3.0.2"
mkdir -p "$INSTALL_DIR/apps/panel-api"
echo 'DATABASE_URL="mysql://u:p@127.0.0.1:3306/spirit_panel"' > "$INSTALL_DIR/apps/panel-api/.env"

it "reports a non-zero exit when the API does not come back"
out="$(SPIRIT_TEST_HEALTH_FAIL=1 SPIRIT_INSTALL_DIR="$INSTALL_DIR" \
  SPIRIT_BACKUP_DIR="$SANDBOX/backups" run_spirit update -y < /dev/null)"
rc=$?
expect_contains "$out" "not answering /health" "output"
expect_contains "$out" "journalctl" "output"
done_test
teardown_sandbox

section "Update - non-git (zip) installs"

setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
# A zip deploy: same layout, no .git directory.
make_fake_checkout "$INSTALL_DIR" "1.3.0.0" "no"
mkdir -p "$INSTALL_DIR/apps/panel-api"
cat > "$INSTALL_DIR/apps/panel-api/.env" <<'EOF'
DATABASE_URL="mysql://u:p@127.0.0.1:3306/spirit_panel"
JWT_SECRET="ZIP_INSTALL_SECRET"
EOF
# Something that must survive, and something that must be replaced.
mkdir -p "$INSTALL_DIR/node_modules/left-alone"
echo "keep" > "$INSTALL_DIR/node_modules/left-alone/marker"

# Build a genuine release tarball for curl to "download".
STAGE="$SANDBOX/stage/SpiritPanel-main"
make_fake_checkout "$STAGE" "1.3.0.2" "no"
echo "new file" > "$STAGE/NEWFILE.md"
( cd "$SANDBOX/stage" && /usr/bin/tar -czf "$SANDBOX/release.tar.gz" "SpiritPanel-main" )
export SPIRIT_TEST_TARBALL="$SANDBOX/release.tar.gz"

# The tarball path needs a faithful rsync. Git Bash has none, and the harness
# emulation is not accurate enough to assert against, so these run only where
# a real rsync exists (i.e. Linux, where the panel is actually deployed).
if [[ -x /usr/bin/rsync ]]; then
  it "falls back to the release tarball when there is no .git"
  out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/backups" \
    run_spirit update -y < /dev/null)"
  dbg "tarball update" "$out"
  expect_contains "$out" "release tarball" "output"
  expect_contains "$out" "Update complete" "output"
  done_test

  it "brings in the new files"
  expect_file_exists "$INSTALL_DIR/NEWFILE.md"
  expect_eq "$(sed -n 's/.*"version"[^"]*"\([^"]*\)".*/\1/p' "$INSTALL_DIR/apps/panel-api/package.json" | head -n1)" \
    "1.3.0.2" "version after tarball update"
  done_test

  it "does not delete .env or node_modules during the sync"
  expect_file_contains "$INSTALL_DIR/apps/panel-api/.env" "ZIP_INSTALL_SECRET"
  expect_file_exists "$INSTALL_DIR/node_modules/left-alone/marker"
  done_test
else
  skip "release-tarball update path" "no real rsync on this host"
fi
teardown_sandbox

# ---------------------------------------------------------------------------
# Tests: status / backup
# ---------------------------------------------------------------------------

section "Status and backup"

setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR" "1.3.0.1"
mkdir -p "$INSTALL_DIR/apps/panel-api"
cat > "$INSTALL_DIR/apps/panel-api/.env" <<'EOF'
DATABASE_URL="mysql://spirit_panel:pw@127.0.0.1:3306/spirit_panel"
API_URL="https://panel.example.com"
EOF

it "status reports version, URL and service state"
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" run_spirit status < /dev/null)"
expect_contains "$out" "1.3.0.1" "output"
expect_contains "$out" "https://panel.example.com" "output"
expect_contains "$out" "active" "output"
done_test

it "status warns when health checks fail"
out="$(SPIRIT_TEST_HEALTH_FAIL=1 SPIRIT_INSTALL_DIR="$INSTALL_DIR" run_spirit status < /dev/null)"
expect_contains "$out" "not responding" "output"
done_test

it "backup writes .env and a database dump"
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/backups2" \
  run_spirit backup -y < /dev/null)"
expect_contains "$out" "Backup complete" "output"
found=""
for d in "$SANDBOX"/backups2/*/; do
  [[ -f "${d}panel-api.env" ]] && found="yes"
done
[[ -n "$found" ]] || TEST_ERRORS+="      no backup directory was created"$'\n'
done_test

it "a failed dump does not silently pass"
# Both the credentialed dump and the root-socket fallback have to fail before
# the script is allowed to report a problem.
out="$(SPIRIT_TEST_DUMP_FAIL=1 SPIRIT_TEST_SOCKET_DUMP_FAIL=1 \
  SPIRIT_INSTALL_DIR="$INSTALL_DIR" \
  SPIRIT_BACKUP_DIR="$SANDBOX/backups3" run_spirit backup -y < /dev/null)"
expect_contains "$out" "dump failed" "output"
done_test
teardown_sandbox

# ---------------------------------------------------------------------------
# Tests: database credential handling
#
# Regression cover for a dump that failed on a real install: Prisma requires
# DATABASE_URL to be percent-encoded, and the generated password was being
# handed to mysqldump still encoded.
# ---------------------------------------------------------------------------

section "Database credentials"

# Pure-function checks on the helpers, pulled straight out of spirit.sh.
eval "$(sed -n '/^urldecode()/,/^}/p;/^cnf_escape()/,/^}/p' "$TARGET")"

parse_db_url() {
  local url="$1" rest creds hostport db user pass host port
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
  printf 'user=[%s] pass=[%s] host=[%s] port=[%s] db=[%s]\n' \
    "$user" "$pass" "$host" "$port" "$db"
}

it "decodes a percent-encoded password"
expect_eq "$(parse_db_url 'mysql://spirit:p%40ss%3Aw%2Frd%23x@127.0.0.1:3306/spirit_panel')" \
  'user=[spirit] pass=[p@ss:w/rd#x] host=[127.0.0.1] port=[3306] db=[spirit_panel]' "parsed url"
done_test

it "splits credentials on the last @ so an unencoded @ survives"
expect_eq "$(parse_db_url 'mysql://spirit:has@sign@127.0.0.1:3306/spirit_panel')" \
  'user=[spirit] pass=[has@sign] host=[127.0.0.1] port=[3306] db=[spirit_panel]' "parsed url"
done_test

it "strips query parameters from the database name"
expect_eq "$(parse_db_url 'mysql://spirit:pw@db.internal:3307/spirit_panel?connection_limit=5')" \
  'user=[spirit] pass=[pw] host=[db.internal] port=[3307] db=[spirit_panel]' "parsed url"
done_test

it "defaults the port when the URL omits it"
expect_eq "$(parse_db_url 'mysql://spirit:pw@localhost/spirit_panel')" \
  'user=[spirit] pass=[pw] host=[localhost] port=[3306] db=[spirit_panel]' "parsed url"
done_test

it "treats + as a literal and does not expand backslash escapes"
expect_eq "$(parse_db_url 'mysql://spirit:a+b\nc@127.0.0.1:3306/spirit_panel')" \
  'user=[spirit] pass=[a+b\nc] host=[127.0.0.1] port=[3306] db=[spirit_panel]' "parsed url"
done_test

it "escapes my.cnf metacharacters"
expect_eq "$(cnf_escape 'a"b')" 'a\"b' "quote"
expect_eq "$(cnf_escape 'a\b')" 'a\\b' "backslash"
done_test

setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR" "1.3.0.2"
mkdir -p "$INSTALL_DIR/apps/panel-api"
# The encoded form of  p@ss:w/rd#x  exactly as Prisma requires it.
cat > "$INSTALL_DIR/apps/panel-api/.env" <<'EOF'
DATABASE_URL="mysql://spirit_panel:p%40ss%3Aw%2Frd%23x@127.0.0.1:3306/spirit_panel"
API_URL="https://panel.example.com"
EOF

it "hands mysqldump the decoded password, not the encoded one"
out="$(SPIRIT_TEST_EXPECT_DB_PASSWORD='p@ss:w/rd#x' \
  SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/b-enc" \
  run_spirit backup -y < /dev/null)"
dbg "encoded-password backup" "$out"
expect_contains "$out" "Dumped database" "output"
expect_eq "$(cat "$SANDBOX/last-mysqldump-password" 2>/dev/null)" 'p@ss:w/rd#x' "password given to mysqldump"
done_test

it "still keeps the password off the command line"
expect_not_contains "$(cat "$CMDLOG")" 'p@ss:w/rd' "commands"
done_test

it "falls back to root socket authentication when the panel credentials fail"
rm -f "$SANDBOX/last-mysqldump-socket"
out="$(SPIRIT_TEST_DUMP_FAIL=1 SPIRIT_INSTALL_DIR="$INSTALL_DIR" \
  SPIRIT_BACKUP_DIR="$SANDBOX/b-fallback" run_spirit backup -y < /dev/null)"
dbg "socket fallback" "$out"
expect_contains "$out" "root socket authentication" "output"
expect_contains "$out" "Dumped database" "output"
expect_file_exists "$SANDBOX/last-mysqldump-socket"
done_test

it "surfaces the real mysqldump error instead of swallowing it"
out="$(SPIRIT_TEST_DUMP_FAIL=1 SPIRIT_TEST_SOCKET_DUMP_FAIL=1 \
  SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/b-err" \
  run_spirit backup -y < /dev/null)"
dbg "dump error surfaced" "$out"
expect_contains "$out" "Access denied" "output"
done_test
teardown_sandbox

# ---------------------------------------------------------------------------
# Tests: Node toolchain
#
# Regression cover for an update that died with
#   EACCES: permission denied, mkdir '/home/spiritpanel/.cache/node/corepack/v1'
# because `command -v pnpm` found Node's corepack shim, which then tried to
# download the real pnpm into a root-owned cache in the panel user's home.
# ---------------------------------------------------------------------------

section "Node toolchain"

setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR" "1.3.0.0"
make_origin_with_newer_commit "$INSTALL_DIR" "1.3.0.2"
touch "$SANDBOX/user-exists"
mkdir -p "$INSTALL_DIR/apps/panel-api"
cat > "$INSTALL_DIR/apps/panel-api/.env" <<'EOF'
DATABASE_URL="mysql://spirit_panel:secretpw@127.0.0.1:3306/spirit_panel"
API_URL="https://panel.example.com"
EOF

# Move pnpm into a directory named corepack so `readlink -f` reports a
# corepack-backed path, which is how the script recognises the shim. A real
# directory avoids depending on symlink support in the test environment.
mkdir -p "$SANDBOX/bin/corepack"
mv "$SANDBOX/bin/pnpm" "$SANDBOX/bin/corepack/pnpm"
export PATH="$SANDBOX/bin/corepack:$PATH"

# A root-owned cache in the panel user's home is the condition that triggers
# the EACCES; ensure_app_home has to create and hand over these directories.
mkdir -p "$SANDBOX/apphome"

corepack_out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/backups" \
  run_spirit update -y < /dev/null)"
dbg "corepack update" "$corepack_out"

it "detects the corepack pnpm shim and replaces it"
expect_contains "$corepack_out" "Replacing the corepack pnpm shim" "output"
expect_contains "$(cat "$CMDLOG")" "npm install -g --force pnpm@" "commands"
done_test

it "still completes the update afterwards"
expect_contains "$corepack_out" "Update complete" "output"
done_test

it "prepares the panel user's caches so pnpm can write to them"
for d in .cache/node/corepack .local/share .config .npm; do
  [[ -d "$SANDBOX/apphome/$d" ]] ||
    TEST_ERRORS+="      ensure_app_home did not create ${d}"$'\n'
done
expect_contains "$(cat "$CMDLOG")" "chown" "commands"
done_test

it "pins COREPACK_HOME for commands run as the panel user"
expect_contains "$(cat "$CMDLOG")" "COREPACK_HOME" "commands"
done_test
teardown_sandbox

it "accepts a pnpm that is already a real global install"
setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR" "1.3.0.0"
make_origin_with_newer_commit "$INSTALL_DIR" "1.3.0.2"
touch "$SANDBOX/user-exists"
mkdir -p "$INSTALL_DIR/apps/panel-api" "$SANDBOX/apphome"
cat > "$INSTALL_DIR/apps/panel-api/.env" <<'EOF'
DATABASE_URL="mysql://spirit_panel:secretpw@127.0.0.1:3306/spirit_panel"
EOF
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/backups" \
  run_spirit update -y < /dev/null)"
expect_not_contains "$out" "Replacing the corepack" "output"
expect_not_contains "$(cat "$CMDLOG")" "npm install -g --force" "commands"
expect_contains "$out" "Update complete" "output"
done_test
teardown_sandbox

# ---------------------------------------------------------------------------

printf '\n%s%s%s\n' "$BOLD" "----------------------------" "$RESET"
SKIP_NOTE=""
[[ "$SKIPPED" -gt 0 ]] && SKIP_NOTE=", ${SKIPPED} skipped"

if [[ "$FAIL" -eq 0 ]]; then
  printf '%s%s passed, 0 failed%s%s\n\n' "$GREEN" "$PASS" "$SKIP_NOTE" "$RESET"
  exit 0
fi
printf '%s%s passed, %s failed%s\n' "$RED" "$PASS" "$FAIL" "$RESET"
for name in "${FAILED_NAMES[@]}"; do
  printf '  %s- %s%s\n' "$DIM" "$name" "$RESET"
done
printf '\n'
exit 1
