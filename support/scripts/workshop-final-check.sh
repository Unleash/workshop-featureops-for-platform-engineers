#!/usr/bin/env bash
#
# FeatureOps workshop — final check.
#
# Confirms an attendee is at a known-good state once `make workshop-configure` has filled .env and
# the app is running, and prints a banner with everything they need for the rest of the workshop.
# Four checks:
#   1. an AI assistant CLI is on PATH
#   2. the Unleash PAT (UNLEASH_PAT) authenticates against your instance (UNLEASH_URL)
#   3. the sample app boots (checkout API + storefront respond)
#   4. your project + development/production environments exist
#
# Only a non-booting app or a rejected token fails the script; a missing assistant CLI is a
# warning. curl + jq are verified earlier by `make workshop-pre-check`, so they are assumed here.
#
# Usage:  bash support/scripts/workshop-final-check.sh   (or: make workshop-final-check)

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

# --- repo root + .env -------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR" || exit 1

# Read a single KEY from .env (last assignment wins), stripping optional surrounding quotes.
# We deliberately do NOT `source` .env: it is shared with `make -include` (literal values),
# Vite and Docker Compose (each with different quoting rules), and may hold unquoted spaces or
# shell metacharacters that sourcing would execute. Reading only the keys we need keeps .env
# untouched and safe. The live environment wins over .env (so `make`-exported vars take effect).
dotenv() {
  [ -f .env ] || return 0
  local line val
  line="$(grep -E "^[[:space:]]*(export[[:space:]]+)?$1=" .env | tail -n1)"
  [ -n "$line" ] || return 0
  val="${line#*=}"
  case "$val" in
    \"*\") val="${val#\"}"; val="${val%\"}" ;;
    \'*\') val="${val#\'}"; val="${val%\'}" ;;
  esac
  printf '%s' "$val"
}
from_env() { if [ -n "${!1:-}" ]; then printf '%s' "${!1}"; else dotenv "$1"; fi; }

# --- helpers ----------------------------------------------------------------
# Normalize an Unleash base URL: drop a trailing slash and an accidental trailing /api,
# so we build exactly one /api/admin suffix (same rule the provisioner config uses).
normalize_url() { printf '%s' "$1" | sed -e 's#/\{1,\}$##' -e 's#/api$##'; }

# GET a URL, optionally with a bearer token; echo the HTTP status code (000 on connect failure).
http_status() {
  local url="$1" token="${2:-}"
  if [ -n "$token" ]; then
    curl -s -o /dev/null -w '%{http_code}' --max-time 8 -H "Authorization: $token" "$url" 2>/dev/null || echo 000
  else
    curl -s -o /dev/null -w '%{http_code}' --max-time 8 "$url" 2>/dev/null || echo 000
  fi
}

# Poll a URL for HTTP 200, a few times (services may still be warming up after `docker-up`).
wait_for_200() {
  local url="$1" attempts="${2:-1}" i status
  for ((i = 1; i <= attempts; i++)); do
    status="$(http_status "$url")"
    [ "$status" = "200" ] && return 0
    [ "$i" -lt "$attempts" ] && sleep 2
  done
  return 1
}

PROJECT_NUMBER="$(from_env UNLEASH_PROJECT_NUMBER)"; PROJECT_NUMBER="${PROJECT_NUMBER:-001}"
PROJECT_ID="project-${PROJECT_NUMBER}"
PREFIX="p${PROJECT_NUMBER}_"

WEB_URL="$(from_env PUBLIC_WEB_URL)"; WEB_URL="${WEB_URL:-http://localhost:8080}"
API_URL="$(from_env PUBLIC_API_URL)"; API_URL="${API_URL:-http://localhost:8081}"

# Admin checks use the project's own values: the PAT and the Unleash URL set by
# `make workshop-configure`. normalize_url strips the trailing /api/ so /api/admin is appended once.
ADMIN_TOKEN="$(from_env UNLEASH_PAT)"
ADMIN_URL_RAW="$(from_env UNLEASH_URL)"
ADMIN_URL=""
[ -n "$ADMIN_URL_RAW" ] && ADMIN_URL="$(normalize_url "$ADMIN_URL_RAW")"

MCP_URL="$(from_env UNLEASH_MCP_SERVER_URL)"
MCP_TOKEN="$(from_env UNLEASH_MCP_PAT_TOKEN)"

printf '\n%sFeatureOps workshop — final check%s\n' "$BOLD" "$RESET"
printf '%s─────────────────────────────────%s\n' "$BOLD" "$RESET"

# --- 1. assistant CLI -------------------------------------------------------
printf '\n%s1) AI assistant CLI%s\n' "$BOLD" "$RESET"
ASSISTANTS="claude codex cursor-agent cursor opencode copilot kiro"
found_assistant=""
for cli in $ASSISTANTS; do
  if command -v "$cli" >/dev/null 2>&1; then
    found_assistant="$cli"
    break
  fi
done
if [ -n "$found_assistant" ]; then
  ok "Found an assistant CLI on PATH: ${BOLD}${found_assistant}${RESET}"
else
  warn "No assistant CLI on PATH (looked for: ${ASSISTANTS// /, })."
  warn "Install one (e.g. Claude Code) or use your IDE's assistant — then re-run."
fi

# --- 2. PAT authenticates ---------------------------------------------------
printf '\n%s2) Unleash PAT authenticates%s\n' "$BOLD" "$RESET"
if [ -z "$ADMIN_URL" ] || [ -z "$ADMIN_TOKEN" ]; then
  bad "UNLEASH_URL / UNLEASH_PAT not set — run 'make workshop-configure'."
else
  status="$(http_status "${ADMIN_URL}/api/admin/projects" "$ADMIN_TOKEN")"
  if [ "$status" = "200" ]; then
    ok "Authenticated against ${ADMIN_URL}."
  elif [ "$status" = "401" ] || [ "$status" = "403" ]; then
    bad "PAT rejected (HTTP $status) by ${ADMIN_URL} — re-run 'make workshop-configure' with a valid token."
  else
    bad "Could not reach ${ADMIN_URL}/api/admin (HTTP $status) — check UNLEASH_URL."
  fi
fi

# --- 3. sample app boots ----------------------------------------------------
printf '\n%s3) Sample app boots%s\n' "$BOLD" "$RESET"
if wait_for_200 "${API_URL}/health" 5; then
  ok "Checkout API is up (${API_URL}/health)."
else
  bad "Checkout API not responding at ${API_URL}/health — start it with 'make dev' or 'make docker-up'."
fi
if wait_for_200 "$WEB_URL" 3; then
  ok "Storefront is up (${WEB_URL})."
else
  warn "Storefront not responding at ${WEB_URL} (it may still be starting)."
fi

# --- 4. project + environments exist ---------------------------------------
printf '\n%s4) Project + environments%s\n' "$BOLD" "$RESET"
if [ -z "$ADMIN_URL" ] || [ -z "$ADMIN_TOKEN" ]; then
  bad "Skipped — needs UNLEASH_URL / UNLEASH_PAT (see check 2)."
else
  overview="$(curl -s --max-time 8 -H "Authorization: $ADMIN_TOKEN" "${ADMIN_URL}/api/admin/projects/${PROJECT_ID}/overview" 2>/dev/null)"
  if [ -z "$overview" ] || printf '%s' "$overview" | grep -q '"error"\|Not Found\|"name":"NotFound"'; then
    bad "Project ${BOLD}${PROJECT_ID}${RESET} not found — check UNLEASH_PROJECT_NUMBER (re-run 'make workshop-configure')."
  else
    ok "Project ${BOLD}${PROJECT_ID}${RESET} exists."
    for env in development production; do
      if printf '%s' "$overview" | grep -q "\"$env\""; then
        ok "Environment '${env}' is present."
      else
        warn "Environment '${env}' not detected on ${PROJECT_ID}."
      fi
    done
  fi
fi

# --- banner + summary -------------------------------------------------------
printf '\n%s─────────────────────────────────%s\n' "$BOLD" "$RESET"
if [ "$fail_count" -gt 0 ]; then
  printf '%s✗ Something is broken%s — %d check(s) failed, %d warning(s). Fix the red items above, then re-run.\n' \
    "$RED" "$RESET" "$fail_count" "$warn_count"
elif [ "$warn_count" -gt 0 ]; then
  printf '%s⚠ I found some warnings%s (%d) — review them above; you can still proceed.\n' "$YELLOW" "$RESET" "$warn_count"
else
  printf '%s✓ You are good to go!%s\n' "$GREEN" "$RESET"
fi

printf '\n%sYour workshop project%s\n' "$BOLD" "$RESET"
printf '  Project:      %s%s%s\n' "$BOLD" "$PROJECT_ID" "$RESET"
printf '  Flag prefix:  %s%s%s   (every flag/segment/context field you create starts with this)\n' "$BOLD" "$PREFIX" "$RESET"
if [ -n "$ADMIN_URL" ]; then
  printf '  Your flags:   %s/projects/%s\n' "$ADMIN_URL" "$PROJECT_ID"
fi

if [ -n "$MCP_URL" ] && [ -n "$MCP_TOKEN" ]; then
  printf '\n%sConnect your AI assistant — paste into the shell it launches from:%s\n' "$BOLD" "$RESET"
  printf '  export UNLEASH_MCP_SERVER_URL=%s\n' "$MCP_URL"
  printf '  export UNLEASH_MCP_PAT_TOKEN=%s\n' "$MCP_TOKEN"
else
  printf '\n%s⚠%s UNLEASH_MCP_SERVER_URL / UNLEASH_MCP_PAT_TOKEN not set — run '\''make workshop-configure'\''.\n' "$YELLOW" "$RESET"
fi

printf '%s─────────────────────────────────%s\n\n' "$BOLD" "$RESET"

[ "$fail_count" -gt 0 ] && exit 1
exit 0
