#!/usr/bin/env bash
#
# FeatureOps workshop — pre-check (the homework step attendees run on their own).
#
# `make workshop-pre-check` installs dependencies first; this script then flags machine problems
# early, before the workshop, so they can be fixed without eating into hands-on time:
#   1. the tools the later steps need are on PATH (curl + jq)
#   2. none of the app ports are already taken (8080/8081/8090/8091/8400/8401)
#   3. no stray Unleash env vars are lurking in the shell that would shadow `make workshop-configure`
#
# Nothing here is a hard error except a missing dependency: a busy port or a stray env var is a
# warning to resolve, not a blocker. Next step (at the workshop) is `make workshop-configure`.
#
# Usage:  bash support/scripts/workshop-pre-check.sh   (or: make workshop-pre-check)

set -u

# --- pretty output ----------------------------------------------------------
if [ -t 1 ] && [ "${NO_COLOR:-}" = "" ]; then
  GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; YELLOW=$'\033[0;33m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; BOLD=''; RESET=''
fi

fail_count=0
warn_count=0
ok()   { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
warn() { printf '  %s⚠%s %s\n' "$YELLOW" "$RESET" "$1"; warn_count=$((warn_count + 1)); }
bad()  { printf '  %s✗%s %s\n' "$RED" "$RESET" "$1"; fail_count=$((fail_count + 1)); }

# --- repo root --------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR" || exit 1

# Detect whether something is already listening on a local TCP port. Portable across
# macOS / Linux / WSL2 without relying on netstat flag differences: prefer lsof, otherwise
# fall back to bash's /dev/tcp (a successful connect means the port is taken).
port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
  else
    (exec 3<>"/dev/tcp/127.0.0.1/$port") >/dev/null 2>&1 && { exec 3>&- 3<&-; return 0; }
    return 1
  fi
}

printf '\n%sFeatureOps workshop — pre-check%s\n' "$BOLD" "$RESET"
printf '%s──────────────────────────────%s\n' "$BOLD" "$RESET"

# --- 1. dependencies --------------------------------------------------------
printf '\n%s1) Required tools%s\n' "$BOLD" "$RESET"
for dep in curl jq; do
  if command -v "$dep" >/dev/null 2>&1; then
    ok "${BOLD}${dep}${RESET} is installed."
  else
    bad "${BOLD}${dep}${RESET} is not installed — needed by 'make workshop-configure' and 'make workshop-final-check'."
  fi
done

# --- 2. app ports are free --------------------------------------------------
printf '\n%s2) App ports are free%s\n' "$BOLD" "$RESET"
# web/api (development), web/api (production), and the two shared payment providers.
PORTS="8080 8081 8090 8091 8400 8401"
for port in $PORTS; do
  if port_in_use "$port"; then
    warn "Port ${BOLD}${port}${RESET} is already in use — stop whatever holds it before 'make dev'."
  else
    ok "Port ${port} is free."
  fi
done

# --- 3. no stray Unleash env vars (only matters before .env exists) ---------
printf '\n%s3) Clean environment%s\n' "$BOLD" "$RESET"
if [ -f .env ]; then
  ok ".env is present — you are already configured (skipping the stray-variable check)."
else
  # No .env yet: any of these already exported in the shell would shadow what
  # `make workshop-configure` is about to write into .env. Flag them so they can be unset.
  WATCH="UNLEASH_PAT UNLEASH_URL UNLEASH_PROJECT_NUMBER UNLEASH_API_TOKEN UNLEASH_API_TOKEN_PRODUCTION UNLEASH_MCP_SERVER_URL UNLEASH_MCP_PAT_TOKEN"
  stray=""
  for var in $WATCH; do
    [ -n "${!var:-}" ] && stray="${stray} ${var}"
  done
  if [ -n "$stray" ]; then
    warn "These Unleash variables are already set in your shell:${BOLD}${stray}${RESET}"
    warn "They would shadow .env — 'unset' them so 'make workshop-configure' is the single source of truth."
  else
    ok "No stray Unleash variables in the shell — 'make workshop-configure' will create and fill .env."
  fi
fi

# --- summary ----------------------------------------------------------------
printf '\n%s──────────────────────────────%s\n' "$BOLD" "$RESET"
if [ "$fail_count" -gt 0 ]; then
  printf '%s✗ Something is broken%s — %d issue(s), %d warning(s). Install the missing tool(s) above, then re-run.\n\n' \
    "$RED" "$RESET" "$fail_count" "$warn_count"
  exit 1
elif [ "$warn_count" -gt 0 ]; then
  printf '%s⚠ I found some warnings%s (%d) — review them above, but you can carry on to the workshop.\n' \
    "$YELLOW" "$RESET" "$warn_count"
  printf '  Next during the workshop - run %smake workshop-configure%s.\n\n' "$BOLD" "$RESET"
  exit 0
else
  printf '%s✓ You are good to go!%s\n' "$GREEN" "$RESET"
  printf '  Next during the workshop - run %smake workshop-configure%s.\n\n' "$BOLD" "$RESET"
  exit 0
fi
