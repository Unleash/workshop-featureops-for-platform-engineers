#!/usr/bin/env bash
#
# FeatureOps workshop — configure (interactive).
#
# Fills .env for an attendee without error-prone copy-paste. You answer two questions (region +
# instance id) and paste a Personal Access Token (PAT) you create in the Unleash UI; the script
# then calls the Unleash admin API with that PAT to discover everything else:
#   • the Unleash / Frontend / MCP URLs (derived from region + instance)
#   • which project you own — ownership is granted to your team group (e.g. "Team NNN"), so it
#     finds the project whose owning group lists you as a member — and stars it for you
#   • the four SDK tokens (backend + frontend, development + production) for that project
# and writes them all back into .env in place.
#
# .env is created from .env.example by the `make workshop-configure` prereq (`ensure-env`),
# so this script assumes it already exists.
#
# Usage:  bash support/scripts/workshop-configure.sh   (or: make workshop-configure)

set -u

# --- pretty output ----------------------------------------------------------
if [ -t 1 ] && [ "${NO_COLOR:-}" = "" ]; then
  GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; YELLOW=$'\033[0;33m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; BOLD=''; RESET=''
fi
warn_count=0
ok()   { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
warn() { printf '  %s⚠%s %s\n' "$YELLOW" "$RESET" "$1"; warn_count=$((warn_count + 1)); }
die()  { printf '  %s✗%s %s\n\n' "$RED" "$RESET" "$1"; exit 1; }

# --- repo root + prerequisites ----------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT_DIR" || exit 1

command -v curl >/dev/null 2>&1 || die "curl is not installed — run 'make workshop-pre-check' first."
command -v jq   >/dev/null 2>&1 || die "jq is not installed — run 'make workshop-pre-check' first."
[ -f .env ] || die ".env is missing — run 'make workshop-configure' (it creates .env from .env.example)."

# Replace KEY's line in .env in place, preserving order (append if the key is absent).
set_env() {
  local key="$1" val="$2" tmp
  tmp="$(mktemp)"
  awk -v k="$key" -v v="$val" '
    $0 ~ "^" k "=" { print k "=" v; found = 1; next }
    { print }
    END { if (!found) print k "=" v }
  ' .env > "$tmp" && mv "$tmp" .env
}

# GET a URL with the PAT; echo the HTTP status code.
auth_status() {
  curl -s -o /dev/null -w '%{http_code}' --max-time 15 -H "Authorization: $PAT" "$1" 2>/dev/null || echo 000
}
# GET a URL with the PAT; echo the body.
auth_get() {
  curl -s --max-time 15 -H "Authorization: $PAT" "$1" 2>/dev/null
}

printf '\n%sFeatureOps workshop — configure%s\n' "$BOLD" "$RESET"
printf '%s───────────────────────────────%s\n\n' "$BOLD" "$RESET"

# --- 1. region + instance ---------------------------------------------------
read -rp "Unleash region [us]: " REGION
REGION="${REGION:-us}"

INSTANCE=""
while [ -z "$INSTANCE" ]; do
  printf 'Unleash instance ID (e.g. the URL path segment right after the region host in your Unleash Admin UI URL: '
  printf 'https://%s.app.unleash-hosted.com/%s<instance>%s/…)\n' "$REGION" "$BOLD" "$RESET"
  read -rp "Instance id: " INSTANCE
  INSTANCE="${INSTANCE%/}"
done

BASE="https://${REGION}.app.unleash-hosted.com/${INSTANCE}"

# --- 2. create + paste the PAT ----------------------------------------------
printf '\nCreate a Personal Access Token (PAT) here (open in your browser):\n'
printf '  %s%s/profile/personal-api-tokens%s\n' "$BOLD" "$BASE" "$RESET"
printf 'Give it a name and an expiry that covers the workshop, then copy the token.\n\n'

PAT=""
while :; do
  read -rsp "Paste your PAT: " PAT; printf '\n'
  if [ -z "$PAT" ]; then
    printf '  %s⚠%s Empty — paste the token you just created.\n' "$YELLOW" "$RESET"
    continue
  fi
  status="$(auth_status "${BASE}/api/admin/projects")"
  if [ "$status" = "200" ]; then
    ok "PAT authenticated against ${BASE}."
    break
  elif [ "$status" = "401" ] || [ "$status" = "403" ]; then
    printf '  %s⚠%s Token rejected (HTTP %s) — check you pasted a valid PAT for %s.\n' "$YELLOW" "$RESET" "$status" "$INSTANCE"
  else
    printf '  %s⚠%s Could not reach %s/api/admin (HTTP %s) — check the region/instance.\n' "$YELLOW" "$RESET" "$BASE" "$status"
  fi
done

# --- 3. derive URLs ---------------------------------------------------------
set_env UNLEASH_URL            "${BASE}/api/"
set_env VITE_UNLEASH_URL       "${BASE}/api/frontend/"
set_env UNLEASH_MCP_SERVER_URL "${BASE}/api/admin/mcp"
set_env UNLEASH_PAT            "$PAT"
set_env UNLEASH_MCP_PAT_TOKEN  "$PAT"
ok "Wrote Unleash, Frontend, and MCP URLs + your PAT."

# --- 4. find the project you own --------------------------------------------
# Project ownership is granted to your *team group* (e.g. "Team NNN"), not to your user directly
# (see support/infrastructure/terraform/main.tf). Rather than list *every* project on the instance
# (there can be 400+) and probe /access on each, ask the personalized dashboard: GET
# /api/admin/personal-dashboard returns only the projects *you* participate in (any role). We then
# confirm the Owner role per candidate via GET /api/admin/personal-dashboard/{projectId}, whose
# .roles[] are *your* roles in that project — so no instance-wide scan, and no user-id lookup.
DASHBOARD="$(auth_get "${BASE}/api/admin/personal-dashboard")"
PROJECT_COUNT="$(printf '%s' "$DASHBOARD" | jq '(.projects // []) | length' 2>/dev/null || echo 0)"
{ [ "$PROJECT_COUNT" -gt 0 ]; } 2>/dev/null \
  || die "Your personal dashboard lists no projects — check the PAT belongs to your workshop account."

PROJECT_ID=""
while IFS= read -r pid; do
  [ -n "$pid" ] || continue
  details="$(auth_get "${BASE}/api/admin/personal-dashboard/${pid}")"
  if printf '%s' "$details" | jq -e 'any((.roles // [])[]; (.name // "") | ascii_downcase == "owner")' >/dev/null 2>&1; then
    PROJECT_ID="$pid"
    break
  fi
done < <(printf '%s' "$DASHBOARD" | jq -r '(.projects // [])[].id')

# Fallback: if you participate in exactly one project, use it even when the Owner-role probe was
# inconclusive (e.g. ownership granted through a custom role name).
if [ -z "$PROJECT_ID" ] && [ "$PROJECT_COUNT" = "1" ]; then
  PROJECT_ID="$(printf '%s' "$DASHBOARD" | jq -r '(.projects // [])[0].id')"
fi

if [ -z "$PROJECT_ID" ]; then
  die "Could not find a project you own among your ${PROJECT_COUNT} dashboard project(s). Check the PAT belongs to your workshop account."
fi

PNUM="${PROJECT_ID#project-}"
set_env UNLEASH_PROJECT_NUMBER      "$PNUM"
set_env VITE_UNLEASH_PROJECT_NUMBER "$PNUM"
ok "You own ${BOLD}${PROJECT_ID}${RESET} → project number ${BOLD}${PNUM}${RESET} (flag prefix p${PNUM}_)."

# --- 5. star the project ----------------------------------------------------
fav_status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -X POST -H "Authorization: $PAT" -H "Content-Type: application/json" -d '{}' "${BASE}/api/admin/projects/${PROJECT_ID}/favorites" 2>/dev/null || echo 000)"
case "$fav_status" in
  2*) ok "Starred ${PROJECT_ID} in your Unleash UI." ;;
  *)  warn "Could not star ${PROJECT_ID} (HTTP ${fav_status}) — not critical, you can star it manually." ;;
esac

# --- 6. fetch the four SDK tokens -------------------------------------------
# Use the *project-scoped* token endpoint: the attendee PAT can't read the instance-level
# /api/admin/api-tokens (that needs ADMIN / READ_CLIENT_API_TOKEN / READ_FRONTEND_API_TOKEN), but
# the project Owner holds READ_PROJECT_API_TOKEN, so /projects/{id}/api-tokens is readable. It
# returns the same { "tokens": [...] } shape, already scoped to this project.
TOKENS_JSON="$(auth_get "${BASE}/api/admin/projects/${PROJECT_ID}/api-tokens")"

# Pick the secret for a (type, environment) pair scoped to our project, preferring a
# project-specific token over a wildcard ("*") one.
pick_token() {
  local type="$1" env="$2"
  printf '%s' "$TOKENS_JSON" | jq -r --arg p "$PROJECT_ID" --arg t "$type" --arg e "$env" '
    [ .tokens[]?
      | select(.type == $t and .environment == $e)
      | select( (((.projects // []) | index($p)) != null) or ((.projects // []) == ["*"]) or (.project == $p) or (.project == "*") )
    ]
    | ( map(select((((.projects // []) | index($p)) != null) or (.project == $p))) + . )
    | (.[0].secret // empty)
  '
}

# Each entry is "<env-var> <token-type> <environment>". Kept as a plain list (not an associative
# array) so the script runs under macOS's stock bash 3.2, which has no `declare -A`.
for spec in \
  "UNLEASH_API_TOKEN client development" \
  "UNLEASH_API_TOKEN_PRODUCTION client production" \
  "VITE_UNLEASH_CLIENT_KEY frontend development" \
  "VITE_UNLEASH_CLIENT_KEY_PRODUCTION frontend production"; do
  # shellcheck disable=SC2086
  set -- $spec
  key="$1" type="$2" env="$3"
  secret="$(pick_token "$type" "$env")"
  if [ -n "$secret" ]; then
    set_env "$key" "$secret"
    ok "Set ${key} (${type}/${env})."
  else
    warn "No ${type}/${env} token found for ${PROJECT_ID} — set ${BOLD}${key}${RESET} in .env manually."
  fi
done

# --- summary ----------------------------------------------------------------
printf '\n%s───────────────────────────────%s\n' "$BOLD" "$RESET"
if [ "$warn_count" -gt 0 ]; then
  printf '%s⚠ Configured with %d warning(s)%s — review the items above, then:\n' "$YELLOW" "$warn_count" "$RESET"
else
  printf '%s✓ .env configured for %s%s\n' "$GREEN" "$PROJECT_ID" "$RESET"
fi
printf '  Next: %smake dev%s (or %smake docker-up%s), then %smake workshop-final-check%s in a second terminal.\n\n' \
       "$BOLD" "$RESET" "$BOLD" "$RESET" "$BOLD" "$RESET"
