#!/usr/bin/env bash
#
# Focused tests for scripts/spirit.sh v3
#
#   bash scripts/spirit.test.sh
#
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="${SCRIPT_DIR}/spirit.sh"

PASS=0
FAIL=0
FAILED_NAMES=()
CURRENT=""

RED=$'\033[31m'; GREEN=$'\033[32m'; DIM=$'\033[2m'; BOLD=$'\033[1m'; RESET=$'\033[0m'

SANDBOX=""
setup_sandbox() {
  SANDBOX="$(mktemp -d)"
  export SANDBOX CMDLOG="$SANDBOX/log/commands.log"
  mkdir -p "$SANDBOX/bin" "$SANDBOX/log" "$SANDBOX/etc/redis" \
    "$SANDBOX/etc/nginx/sites-available" "$SANDBOX/etc/nginx/sites-enabled" \
    "$SANDBOX/etc/systemd/system" "$SANDBOX/etc/sudoers.d" "$SANDBOX/backups" \
    "$SANDBOX/apphome" "$SANDBOX/var/lock"
  : > "$CMDLOG"
  cat > "$SANDBOX/os-release" <<'EOF'
ID=ubuntu
PRETTY_NAME="Ubuntu 24.04 LTS (sandbox)"
EOF
  cat > "$SANDBOX/etc/redis/redis.conf" <<'EOF'
bind 127.0.0.1
port 6379
# requirepass foobared
EOF
  make_stubs
  export PATH="$SANDBOX/bin:$PATH"
}

teardown_sandbox() {
  [[ -n "$SANDBOX" && -d "$SANDBOX" ]] && rm -rf "$SANDBOX"
  SANDBOX=""
}

_stub() {
  local name="$1"
  cat > "$SANDBOX/bin/$name"
  chmod +x "$SANDBOX/bin/$name"
  # Prepend a logger line
  local body
  body="$(cat "$SANDBOX/bin/$name")"
  printf '#!/usr/bin/env bash\nprintf "%%s %%s\\n" "%s" "$*" >> "$CMDLOG"\n%s\n' "$name" "$body" > "$SANDBOX/bin/$name"
  chmod +x "$SANDBOX/bin/$name"
}

make_stubs() {
  _stub id <<'EOF'
[[ "${1:-}" == "-u" ]] && { echo 0; exit 0; }
[[ -f "$SANDBOX/user-exists" ]] && exit 0
exit 1
EOF

  _stub runuser <<'EOF'
cmd=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -u) shift 2 ;;
    --) shift ;;
    env)
      shift
      while [[ $# -gt 0 && "$1" == *=* ]]; do export "$1"; shift; done
      ;;
    bash) shift ;;
    --noprofile|--norc) shift ;;
    -c|-lc) cmd="$2"; shift 2 ;;
    *) shift ;;
  esac
done
if [[ "${SPIRIT_TEST_PNPM_FAIL:-0}" == "1" && "$cmd" == *"pnpm install"* ]]; then exit 1; fi
if [[ "${SPIRIT_TEST_BUILD_FAIL:-0}" == "1" && "$cmd" == *"pnpm build"* ]]; then exit 1; fi
if [[ "${SPIRIT_TEST_MIGRATE_FAIL:-0}" == "1" && "$cmd" == *"migrate"* ]]; then exit 1; fi
bash -c "$cmd"
EOF

  _stub pnpm <<'EOF'
[[ "${1:-}" == "--version" ]] && { echo "9.15.9"; exit 0; }
for arg in "$@"; do
  if [[ "$arg" == "spirit-install" ]]; then
    envf="${SPIRIT_TEST_INSTALL_DIR}/apps/panel-api/.env"
    if [[ -f "$envf" ]]; then
      tmp="$(mktemp)"
      sed 's|^DATABASE_URL=.*|DATABASE_URL="mysql://spirit_panel:seeded-pw@127.0.0.1:3306/spirit_panel"|' "$envf" > "$tmp"
      mv "$tmp" "$envf"
    fi
    mkdir -p "${SPIRIT_TEST_INSTALL_DIR}/apps/panel-web/dist"
    echo "<html></html>" > "${SPIRIT_TEST_INSTALL_DIR}/apps/panel-web/dist/index.html"
  fi
done
exit 0
EOF

  _stub npm <<'EOF'
[[ "$*" == *"pnpm@"* ]] && touch "$SANDBOX/pnpm-installed"
exit 0
EOF

  _stub node <<'EOF'
[[ "${1:-}" == "-v" ]] && { echo "v20.19.0"; exit 0; }
exit 0
EOF

  _stub getent <<'EOF'
[[ "${1:-}" == "passwd" ]] && { echo "${2}:x:1000:1000::${SANDBOX}/apphome:/bin/bash"; exit 0; }
exit 1
EOF

  _stub mysqldump <<'EOF'
cnf=""
for arg in "$@"; do
  case "$arg" in --defaults-extra-file=*) cnf="${arg#*=}" ;; esac
done
if [[ -n "$cnf" && -f "$cnf" ]]; then
  got="$(sed -n 's/^password="\{0,1\}//p' "$cnf" | sed 's/"$//')"
  printf '%s\n' "$got" > "$SANDBOX/last-mysqldump-password"
fi
if [[ "${SPIRIT_TEST_DUMP_FAIL:-0}" == "1" ]]; then
  echo "mysqldump: Got error: 1045: Access denied for user 'spirit_panel'@'localhost'" >&2
  exit 2
fi
echo "-- dump"
exit 0
EOF

  _stub curl <<'EOF'
# health check
[[ "$*" == *"/health"* ]] && {
  [[ "${SPIRIT_TEST_HEALTH_FAIL:-0}" == "1" ]] && exit 1
  echo '{"ok":true}'
  exit 0
}
exit 0
EOF

  _stub systemctl <<'EOF'
exit 0
EOF
  _stub nginx <<'EOF'
[[ "${1:-}" == "-t" ]] && exit 0
exit 0
EOF
  _stub apt-get <<'EOF'
exit 0
EOF
  _stub flock <<'EOF'
exit 0
EOF
  _stub chmod <<'EOF'
exit 0
EOF
  _stub chown <<'EOF'
exit 0
EOF
  _stub gzip <<'EOF'
[[ "${1:-}" == "-f" ]] && { [[ -f "${2:-}" ]] && mv "$2" "${2}.gz"; exit 0; }
exit 0
EOF
  _stub openssl <<'EOF'
echo "TESTSECRET0123456789abcdefGHIJKLMNOP+/=="
exit 0
EOF
  _stub redis-cli <<'EOF'
echo PONG
exit 0
EOF
  _stub adduser <<'EOF'
touch "$SANDBOX/user-exists"
exit 0
EOF
  _stub install <<'EOF'
# install -m MODE SRC DEST
dest=""
prev=""
for a in "$@"; do
  [[ "$prev" != "-m" && "$prev" != "" && ! "$a" =~ ^- ]] && dest="$a"
  prev="$a"
done
[[ -n "$dest" && -n "${@: -2:1}" ]] && cp "${@: -2:1}" "$dest" 2>/dev/null || true
exit 0
EOF
}

make_fake_checkout() {
  local dir="$1" version="${2:-1.3.0.3}"
  mkdir -p "$dir/apps/panel-api/prisma" "$dir/apps/panel-web" \
    "$dir/deploy/systemd" "$dir/deploy/nginx" "$dir/deploy/env" "$dir/scripts"
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
[Install]
WantedBy=multi-user.target
EOF
  cat > "$dir/deploy/nginx/spirit-panel.conf" <<'EOF'
server {
    listen 80;
    server_name panel.example.com;
    root /home/spiritpanel/Spirit-Panel/apps/panel-web/dist;
}
EOF
  cp "$TARGET" "$dir/scripts/spirit.sh"
}

# Git fixture: base commit tagged V1.0.0.0, origin/main one commit ahead (ONLY_ON_MAIN.md).
# mode=ahead leaves the checkout on origin/main. mode=behind resets to the tagged parent.
prepare_tracked_repo() {
  local mode="${1:-ahead}"
  INSTALL_DIR="$SANDBOX/panel"
  export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
  make_fake_checkout "$INSTALL_DIR" "1.3.0.0"
  (
    cd "$INSTALL_DIR"
    git init -q
    git config user.email "test@example.com"
    git config user.name "Test"
    git add -A
    git commit -q -m "base"
    git tag V1.0.0.0
  )
  ORIGIN="$SANDBOX/origin.git"
  git clone -q --bare "$INSTALL_DIR" "$ORIGIN"
  (
    cd "$INSTALL_DIR"
    git remote add origin "$ORIGIN"
    git checkout -q -b main
    git push -q -u origin main
    git push -q origin V1.0.0.0
  )
  STAGE="$SANDBOX/stage"
  rm -rf "$STAGE"
  git clone -q "$ORIGIN" "$STAGE"
  (
    cd "$STAGE"
    git config user.email "test@example.com"
    git config user.name "Test"
    cat > apps/panel-api/package.json <<'EOF'
{ "name": "@spirit/panel-api", "version": "1.3.0.3" }
EOF
    echo updated > ONLY_ON_MAIN.md
    git add -A
    git commit -q -m "bump"
    git push -q origin HEAD:main
  )
  (
    cd "$INSTALL_DIR"
    git fetch -q origin
    git checkout -q -B main origin/main
    if [[ "$mode" == "behind" ]]; then
      git reset -q --hard HEAD~1
    fi
  )
  mkdir -p "$INSTALL_DIR/apps/panel-api"
  cat > "$INSTALL_DIR/apps/panel-api/.env" <<'EOF'
DATABASE_URL="mysql://spirit_panel:secretpw@127.0.0.1:3306/spirit_panel"
API_URL="https://panel.example.com"
EOF
  if [[ "$mode" == "behind" ]]; then
    cat > "$INSTALL_DIR/apps/panel-api/package.json" <<'EOF'
{ "name": "@spirit/panel-api", "version": "1.3.0.0" }
EOF
  fi
  touch "$SANDBOX/user-exists"
}

run_spirit() {
  local sandboxed="$SANDBOX/spirit.sh"
  sed \
    -e "s|/etc/os-release|$SANDBOX/os-release|g" \
    -e "s|/etc/systemd/system|$SANDBOX/etc/systemd/system|g" \
    -e "s|/etc/nginx|$SANDBOX/etc/nginx|g" \
    -e "s|/etc/redis/redis.conf|$SANDBOX/etc/redis/redis.conf|g" \
    -e "s|/etc/sudoers.d|$SANDBOX/etc/sudoers.d|g" \
    -e "s|/var/lock|$SANDBOX/var/lock|g" \
    "$TARGET" > "$sandboxed"
  bash "$sandboxed" "$@" 2>&1
}

it() { CURRENT="$1"; }
done_test() {
  if [[ -z "${TEST_ERRORS:-}" ]]; then
    printf '  %s+%s %s\n' "$GREEN" "$RESET" "$CURRENT"
    PASS=$((PASS + 1))
  else
    printf '  %sx%s %s\n%s' "$RED" "$RESET" "$CURRENT" "$TEST_ERRORS"
    FAIL=$((FAIL + 1))
    FAILED_NAMES+=("$CURRENT")
  fi
  TEST_ERRORS=""
}
expect_contains() {
  [[ "$1" == *"$2"* ]] || TEST_ERRORS+="      expected ${3:-value} to contain: $2"$'\n'
}
expect_not_contains() {
  [[ "$1" != *"$2"* ]] || TEST_ERRORS+="      expected ${3:-value} NOT to contain: $2"$'\n'
}
expect_eq() {
  [[ "$1" == "$2" ]] || TEST_ERRORS+="      expected ${3:-value}=[$2] got [$1]"$'\n'
}
section() { printf '\n%s%s%s\n' "$BOLD" "$1" "$RESET"; }

# ---------------------------------------------------------------------------
section "CLI"
setup_sandbox
out="$(run_spirit --help)"
it "help lists install and update"
expect_contains "$out" "install" "help"
expect_contains "$out" "update" "help"
expect_contains "$out" "--domain" "help"
done_test
out="$(run_spirit --version)"
it "prints script version 3.0.1"
expect_contains "$out" "3.0.1" "version"
done_test
out="$(run_spirit --help)"
it "help documents --channel and that --ref overrides it"
expect_contains "$out" "--channel release|dev" "help"
expect_contains "$out" "Overrides --channel" "help"
expect_not_contains "$(cat "$TARGET")" "@{u}" "no upstream fallthrough"
expect_not_contains "$(cat "$TARGET")" "--no-frozen-lockfile" "frozen"
expect_contains "$(cat "$TARGET")" "pnpm install --frozen-lockfile" "frozen"
expect_contains "$(cat "$TARGET")" "20261028120000_wings_runtime_options" "compat migration"
done_test
teardown_sandbox

# ---------------------------------------------------------------------------
section "Progress helpers"
setup_sandbox
# shellcheck disable=SC1090
eval "$(sed -n '/^phase_begin()/,/^}/p;/^phase()/,/^}/p' "$TARGET")"
C_RESET=""; C_BOLD=""; C_DIM=""; C_CYAN=""; C_GREEN=""; C_YELLOW=""; C_RED=""
it "phase prints percent and almost-done once at 80%"
phase_begin 5 "wrapping up"
out="$(phase 'one'; phase 'two'; phase 'three'; phase 'four')"
expect_contains "$out" "[1/5 · 20%] one" "phase1"
expect_contains "$out" "[4/5 · 80%] four" "phase4"
expect_contains "$out" "Almost done — wrapping up" "almost"
# almost-done must appear once
almost_count="$(printf '%s\n' "$out" | grep -c 'Almost done' || true)"
expect_eq "$almost_count" "1" "almost once"
done_test
teardown_sandbox

# ---------------------------------------------------------------------------
section "env_get / DATABASE_URL"
setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
make_fake_checkout "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/apps/panel-api"
# CRLF + quoted value — the bug that produced spirit_panel"
printf 'DATABASE_URL="mysql://spirit_panel:p%%40ss@127.0.0.1:3306/spirit_panel"\r\n' \
  > "$INSTALL_DIR/apps/panel-api/.env"

# Extract and run env_get against the file
eval "$(sed -n '/^env_get()/,/^}/p;/^urldecode()/,/^}/p' "$TARGET")"
# Override INSTALL_DIR for env_get
it "strips CR and quotes from DATABASE_URL"
got="$(INSTALL_DIR="$INSTALL_DIR" env_get DATABASE_URL)"
expect_eq "$got" 'mysql://spirit_panel:p%40ss@127.0.0.1:3306/spirit_panel' "url"
expect_not_contains "$got" '"' "url"
done_test

it "decodes percent-encoded passwords"
expect_eq "$(urldecode 'p%40ss%3Aw')" 'p@ss:w' "decoded"
done_test
teardown_sandbox

# ---------------------------------------------------------------------------
section "Backup"
setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/apps/panel-api"
cat > "$INSTALL_DIR/apps/panel-api/.env" <<'EOF'
DATABASE_URL="mysql://spirit_panel:secretpw@127.0.0.1:3306/spirit_panel"
API_URL="https://panel.example.com"
EOF
touch "$SANDBOX/user-exists"

it "backup dumps the database with a clean name"
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/backups" \
  run_spirit backup -y < /dev/null)"
expect_contains "$out" "Dumped database 'spirit_panel'" "output"
expect_not_contains "$out" 'spirit_panel"' "output"
expect_eq "$(cat "$SANDBOX/last-mysqldump-password" 2>/dev/null)" "secretpw" "password"
done_test

it "surfaces dump failures"
out="$(SPIRIT_TEST_DUMP_FAIL=1 SPIRIT_INSTALL_DIR="$INSTALL_DIR" \
  SPIRIT_BACKUP_DIR="$SANDBOX/b2" run_spirit backup -y < /dev/null)"
expect_contains "$out" "Access denied" "output"
done_test
teardown_sandbox

# ---------------------------------------------------------------------------
section "Update"
setup_sandbox
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR" "1.3.0.0"
# Make it a git repo with a remote that has a newer commit
(
  cd "$INSTALL_DIR"
  git init -q
  git config user.email "test@example.com"
  git config user.name "Test"
  git add -A
  git commit -q -m "base"
)
ORIGIN="$SANDBOX/origin.git"
git clone -q --bare "$INSTALL_DIR" "$ORIGIN"
(
  cd "$INSTALL_DIR"
  git remote add origin "$ORIGIN"
  git checkout -q -b main
  git push -q -u origin main
)
# Newer commit on origin
STAGE="$SANDBOX/stage"
git clone -q "$ORIGIN" "$STAGE"
(
  cd "$STAGE"
  git config user.email "test@example.com"
  git config user.name "Test"
  echo '"version": "1.3.0.3"' > apps/panel-api/package.json
  cat > apps/panel-api/package.json <<'EOF'
{ "name": "@spirit/panel-api", "version": "1.3.0.3" }
EOF
  echo updated > UPDATED.md
  git add -A
  git commit -q -m "bump"
  git push -q origin HEAD:main
)
(
  cd "$INSTALL_DIR"
  git fetch -q origin
  git branch -u origin/main main 2>/dev/null || git checkout -q -B main origin/main
  # Reset local to old so update has work to do — re-checkout old tree
  git reset -q --hard HEAD~1 2>/dev/null || true
)
mkdir -p "$INSTALL_DIR/apps/panel-api"
cat > "$INSTALL_DIR/apps/panel-api/.env" <<'EOF'
DATABASE_URL="mysql://spirit_panel:secretpw@127.0.0.1:3306/spirit_panel"
API_URL="https://panel.example.com"
EOF
# Restore version file to old after reset
cat > "$INSTALL_DIR/apps/panel-api/package.json" <<'EOF'
{ "name": "@spirit/panel-api", "version": "1.3.0.0" }
EOF
touch "$SANDBOX/user-exists"

it "update completes end-to-end"
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/backups" \
  run_spirit update -y < /dev/null)"
expect_contains "$out" "Update complete" "output"
expect_contains "$out" "Dumped database" "output"
expect_contains "$out" "[1/7 ·" "progress"
expect_contains "$out" "Almost done" "almost done"
expect_contains "$out" "→ main" "dev ref"
expect_eq "$(tr -d '[:space:]' < "$INSTALL_DIR/.spirit-channel")" "dev" "saved channel"
expect_contains "$(cat "$CMDLOG")" "pnpm install --frozen-lockfile" "frozen"
expect_not_contains "$(cat "$CMDLOG")" "--no-frozen-lockfile" "frozen"
done_test
teardown_sandbox

# ---------------------------------------------------------------------------
section "Tarball sync preserves runtime data"
setup_sandbox
it "spirit.sh excludes apps/panel-api/data from tarball rsync --delete"
block="$(sed -n '/^update_source_tarball()/,/^}/p' "$TARGET")"
expect_contains "$block" "--exclude 'apps/panel-api/data/'" "exclude"
expect_contains "$block" "rsync -a --delete" "rsync"
# Exercise the same exclude flags when rsync is available (Git Bash on Windows may lack it).
if command -v rsync >/dev/null 2>&1; then
  SRC="$SANDBOX/tarball-src"
  DST="$SANDBOX/install"
  mkdir -p "$SRC/apps/panel-api" "$DST/apps/panel-api/data/branding" "$DST/apps/panel-api/data/tickets/t1"
  echo logo > "$DST/apps/panel-api/data/branding/logo.png"
  echo attach > "$DST/apps/panel-api/data/tickets/t1/a1.png"
  echo newcode > "$SRC/apps/panel-api/package.json"
  rsync -a --delete \
    --exclude 'apps/panel-api/.env' \
    --exclude 'apps/panel-api/data/' \
    --exclude 'node_modules/' \
    --exclude '**/node_modules/' \
    --exclude 'apps/panel-web/dist/' \
    --exclude 'apps/panel-api/dist/' \
    --exclude 'packages/*/dist/' \
    --exclude '.turbo/' \
    "$SRC/" "$DST/"
  expect_eq "$(cat "$DST/apps/panel-api/data/branding/logo.png")" "logo" "logo"
  expect_eq "$(cat "$DST/apps/panel-api/data/tickets/t1/a1.png")" "attach" "ticket"
  expect_eq "$(cat "$DST/apps/panel-api/package.json")" "newcode" "synced"
fi
done_test

it "spirit.sh excludes build dist dirs from tarball rsync --delete"
block="$(sed -n '/^update_source_tarball()/,/^}/p' "$TARGET")"
expect_contains "$block" "--exclude 'apps/panel-web/dist/'" "panel-web dist"
expect_contains "$block" "--exclude 'apps/panel-api/dist/'" "panel-api dist"
expect_contains "$block" "--exclude 'packages/*/dist/'" "packages dist"
done_test

it "sync_nginx_csp compares full CSP add_header lines"
block="$(sed -n '/^sync_nginx_csp()/,/^}/p' "$TARGET")"
expect_contains "$block" "Content-Security-Policy" "CSP"
expect_contains "$block" "already matches shipped config" "full CSP compare"
expect_contains "$block" "spirit-csp.bak" "backup before patch"
expect_contains "$block" "nginx -t failed after CSP sync" "restore on nginx -t failure"
done_test

it "backup archives panel-api data"
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
make_fake_checkout "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/apps/panel-api/data/branding"
echo keepme > "$INSTALL_DIR/apps/panel-api/data/branding/logo.png"
cat > "$INSTALL_DIR/apps/panel-api/.env" <<'EOF'
DATABASE_URL="mysql://spirit_panel:secretpw@127.0.0.1:3306/spirit_panel"
API_URL="https://panel.example.com"
EOF
touch "$SANDBOX/user-exists"
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/backups" \
  run_spirit backup -y < /dev/null)"
expect_contains "$out" "Saved panel-api data" "output"
copied="$(find "$SANDBOX/backups" -type f -name 'logo.png' | head -n1)"
[[ -n "$copied" && -f "$copied" ]] || TEST_ERRORS+="      missing backed-up logo.png"$'\n'
if [[ -n "$copied" && -f "$copied" ]]; then
  expect_eq "$(cat "$copied")" "keepme" "logo"
fi
done_test
teardown_sandbox

# ---------------------------------------------------------------------------
section "Install guards"
setup_sandbox
it "help documents the required --domain flag"
out="$(run_spirit --help)"
expect_contains "$out" "--domain DOMAIN" "help"
expect_contains "$out" "install --domain" "help"
done_test
teardown_sandbox

# ---------------------------------------------------------------------------
section "Channel"
setup_sandbox
# shellcheck disable=SC1090
eval "$(sed -n '/^version_parts()/,/^}/p; /^version_cmp()/,/^}/p; /^version_gt()/,/^}/p; /^highest_version_tag()/,/^}/p' "$TARGET")"
it "sorts release tags as four-part numbers"
expect_eq "$(version_cmp V1.3.10.0 V1.3.9.0)" "1" "10 > 9"
expect_eq "$(version_cmp V1.10.0.0 V1.9.0.0)" "1" "minor 10 > 9"
expect_eq "$(version_cmp V1.3.5.0 V1.3.5.0)" "0" "equal"
expect_eq "$(version_cmp V1.3.4.0 V1.3.4.10)" "-1" "patch"
best="$(printf '%s\n' V1.9.0.0 V1.10.0.0 V1.3.5.0 V1.3.4.10 | highest_version_tag)"
expect_eq "$best" "V1.10.0.0" "highest"
done_test

prepare_tracked_repo behind
it "update -y with no channel file stays on dev when a release tag exists"
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/backups" \
  run_spirit update -y < /dev/null)"
expect_contains "$out" "→ main" "ref"
expect_contains "$out" "Update complete" "output"
[[ -f "$INSTALL_DIR/ONLY_ON_MAIN.md" ]] || TEST_ERRORS+="      dev update did not reach main"$'\n'
expect_eq "$(tr -d '[:space:]' < "$INSTALL_DIR/.spirit-channel")" "dev" "channel"
expect_eq "$(git -C "$INSTALL_DIR" rev-parse HEAD)" "$(git -C "$INSTALL_DIR" rev-parse origin/main)" "head"
done_test
teardown_sandbox

setup_sandbox
prepare_tracked_repo ahead
it "--channel release checks out the tag and does not follow main"
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/backups" \
  run_spirit update --channel release -y < /dev/null)"
expect_contains "$out" "→ V1.0.0.0" "ref"
expect_contains "$out" "Update complete" "output"
[[ ! -f "$INSTALL_DIR/ONLY_ON_MAIN.md" ]] || TEST_ERRORS+="      release update followed main"$'\n'
expect_eq "$(tr -d '[:space:]' < "$INSTALL_DIR/.spirit-channel")" "release" "channel"
expect_eq "$(git -C "$INSTALL_DIR" rev-parse HEAD)" "$(git -C "$INSTALL_DIR" rev-parse V1.0.0.0^{commit})" "tag"
git -C "$INSTALL_DIR" symbolic-ref -q HEAD >/dev/null 2>&1 && TEST_ERRORS+="      release checkout is not detached"$'\n'
done_test
teardown_sandbox

setup_sandbox
prepare_tracked_repo ahead
printf 'release\n' > "$INSTALL_DIR/.spirit-channel"
it "update -y reuses the saved release channel"
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/backups" \
  run_spirit update -y < /dev/null)"
expect_contains "$out" "→ V1.0.0.0" "ref"
[[ ! -f "$INSTALL_DIR/ONLY_ON_MAIN.md" ]] || TEST_ERRORS+="      saved release followed main"$'\n'
expect_eq "$(tr -d '[:space:]' < "$INSTALL_DIR/.spirit-channel")" "release" "channel"
expect_eq "$(git -C "$INSTALL_DIR" rev-parse HEAD)" "$(git -C "$INSTALL_DIR" rev-parse V1.0.0.0^{commit})" "tag"
done_test
teardown_sandbox

setup_sandbox
prepare_tracked_repo behind
it "--ref wins over --channel for this run"
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/backups" \
  run_spirit update --channel release --ref main -y < /dev/null)"
expect_contains "$out" "→ main" "ref"
expect_contains "$out" "overrides the channel" "note"
[[ -f "$INSTALL_DIR/ONLY_ON_MAIN.md" ]] || TEST_ERRORS+="      --ref main did not check out main"$'\n'
expect_eq "$(tr -d '[:space:]' < "$INSTALL_DIR/.spirit-channel")" "release" "channel saved"
expect_eq "$(git -C "$INSTALL_DIR" rev-parse HEAD)" "$(git -C "$INSTALL_DIR" rev-parse origin/main)" "head"
done_test
teardown_sandbox

setup_sandbox
prepare_tracked_repo ahead
printf 'lock\n' > "$INSTALL_DIR/pnpm-lock.yaml"
sha="$(git -C "$INSTALL_DIR" rev-parse HEAD)"
lock="$(sha256sum "$INSTALL_DIR/pnpm-lock.yaml" | awk '{print $1}')"
printf 'commit=%s\nlock=%s\nref=main\n' "$sha" "$lock" > "$INSTALL_DIR/.spirit-build-stamp"
: > "$CMDLOG"
it "skips pnpm install and build when commit and lockfile already match"
out="$(SPIRIT_INSTALL_DIR="$INSTALL_DIR" SPIRIT_BACKUP_DIR="$SANDBOX/backups" \
  run_spirit update -y < /dev/null)"
expect_contains "$out" "Already up to date" "output"
expect_contains "$out" "skipping dependency install and build" "output"
expect_not_contains "$(cat "$CMDLOG")" "pnpm install" "no install"
expect_not_contains "$(cat "$CMDLOG")" "pnpm build" "no build"
expect_not_contains "$out" "Update complete" "did not rebuild"
[[ -f "$INSTALL_DIR/ONLY_ON_MAIN.md" ]] || TEST_ERRORS+="      skip moved off main"$'\n'
expect_eq "$(tr -d '[:space:]' < "$INSTALL_DIR/.spirit-channel")" "dev" "channel"
done_test
teardown_sandbox

setup_sandbox
prepare_tracked_repo behind
: > "$CMDLOG"
it "failed migrate stops before restart and prints the backup path"
out="$(SPIRIT_TEST_MIGRATE_FAIL=1 SPIRIT_INSTALL_DIR="$INSTALL_DIR" \
  SPIRIT_BACKUP_DIR="$SANDBOX/backups" run_spirit update -y < /dev/null)"
expect_contains "$out" "prisma migrate deploy failed" "output"
expect_contains "$out" "Restore:" "backup"
expect_contains "$out" "Stopped before restarting" "stop"
expect_not_contains "$out" "Update complete" "not complete"
expect_not_contains "$(cat "$CMDLOG")" "systemctl restart" "no restart"
done_test
teardown_sandbox

# ---------------------------------------------------------------------------
section "Install channel"
setup_sandbox
for b in nginx certbot redis-server mariadb mysql mysqld; do
  printf '#!/usr/bin/env bash\nexit 0\n' > "$SANDBOX/bin/$b"
  chmod +x "$SANDBOX/bin/$b"
done
SRC="$SANDBOX/src"
make_fake_checkout "$SRC" "1.3.0.0"
(
  cd "$SRC"
  git init -q
  git config user.email "test@example.com"
  git config user.name "Test"
  git add -A
  git commit -q -m "base"
  git tag V1.0.0.0
  echo mainonly > ONLY_ON_MAIN.md
  git add ONLY_ON_MAIN.md
  git commit -q -m "bump"
)
ORIGIN="$SANDBOX/origin.git"
git clone -q --bare "$SRC" "$ORIGIN"
INSTALL_DIR="$SANDBOX/panel"
export SPIRIT_TEST_INSTALL_DIR="$INSTALL_DIR"
it "non-interactive install defaults to the latest release and skips apt"
out="$(SPIRIT_REPO_URL="$ORIGIN" SPIRIT_INSTALL_DIR="$INSTALL_DIR" \
  SPIRIT_BACKUP_DIR="$SANDBOX/backups" \
  run_spirit install --domain panel.example.com --admin-email you@example.com --no-tls -y < /dev/null)"
expect_contains "$out" "Spirit-Panel is installed" "output"
expect_contains "$out" "skipping apt" "apt"
expect_eq "$(tr -d '[:space:]' < "$INSTALL_DIR/.spirit-channel")" "release" "channel"
[[ ! -f "$INSTALL_DIR/ONLY_ON_MAIN.md" ]] || TEST_ERRORS+="      release clone included main-only file"$'\n'
expect_eq "$(git -C "$INSTALL_DIR" rev-parse HEAD)" "$(git -C "$ORIGIN" rev-parse V1.0.0.0^{commit})" "tag"
expect_not_contains "$(cat "$CMDLOG")" "apt-get" "apt-get"
expect_contains "$(cat "$CMDLOG")" "pnpm install --frozen-lockfile" "frozen"
done_test
teardown_sandbox

# ---------------------------------------------------------------------------
printf '\n%s----------------------------%s\n' "$BOLD" "$RESET"
if [[ "$FAIL" -eq 0 ]]; then
  printf '%s%s passed, 0 failed%s\n\n' "$GREEN" "$PASS" "$RESET"
  exit 0
fi
printf '%s%s passed, %s failed%s\n' "$RED" "$PASS" "$FAIL" "$RESET"
for name in "${FAILED_NAMES[@]}"; do
  printf '  %s- %s%s\n' "$DIM" "$name" "$RESET"
done
printf '\n'
exit 1
