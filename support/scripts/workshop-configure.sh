#!/usr/bin/env bash
#
# FeatureOps workshop — configure (interactive).
#
# Fills .env for an attendee without error-prone copy-paste. You answer two questions (region +
# instance id) and paste a Personal Access Token (PAT) you create in the Unleash UI; the script
# then calls the Unleash admin API with that PAT to discover everything else:
#   • the Unleash / Frontend / MCP URLs (derived from region + instance)
#   • which project is yours — and, when you have none, offers to CREATE one for you
#   • the four SDK tokens (backend + frontend, development + production) for that project
# and writes them all back into .env in place.
#
# Two flows land here:
#   • FACILITATED — Terraform already made you a `project-NNN` and granted your team group Owner on
#     it. We find it, and your flags carry a `pNNN_` prefix (hundreds of projects share the instance,
#     and context-field names are globally unique, so they must not collide).
#   • SELF-PACED — your own free-trial instance, no Terraform. We offer to create the project, its
#     flags, and its SDK tokens by running the same `unleash-provisioner` the facilitator uses
#     (`make workshop-provision`). You own the instance, so your flags need no prefix.
#
# .env is created from .env.example by the `make workshop-configure` prereq (`ensure-env`),
# so this script assumes it already exists.
#
# Usage:  bash support/scripts/workshop-configure.sh   (or: make workshop-configure)

set -u

# Default id for a project we create. Deliberately NOT `project-001`: that shape is reserved for
# Terraform-provisioned projects, and it is what switches the `pNNN_` flag prefix back on.
DEFAULT_PROJECT_ID="featureops-workshop"
MANUAL_SETUP_DOC="docs/steps/self-paced/manual-setup.md"

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

# --- 4. resolve the project --------------------------------------------------
# Ownership is granted to your *team group* (e.g. "Team NNN"), not to your user directly (see
# support/infrastructure/terraform/main.tf). Rather than list *every* project on the instance (there
# can be 400+) and probe /access on each, ask the personalized dashboard: GET
# /api/admin/personal-dashboard returns only the projects *you* participate in (any role). We then
# confirm the Owner role per candidate via GET /api/admin/personal-dashboard/{projectId}, whose
# .roles[] are *your* roles in that project — so no instance-wide scan, and no user-id lookup.
DASHBOARD="$(auth_get "${BASE}/api/admin/personal-dashboard")"

# Ids of the dashboard projects on which you hold the Owner role (never the built-in `default`).
owned_projects() {
  local pid details
  while IFS= read -r pid; do
    [ -n "$pid" ] || continue
    [ "$pid" = "default" ] && continue
    details="$(auth_get "${BASE}/api/admin/personal-dashboard/${pid}")"
    if printf '%s' "$details" | jq -e 'any((.roles // [])[]; (.name // "") | ascii_downcase == "owner")' >/dev/null 2>&1; then
      printf '%s\n' "$pid"
    fi
  done < <(printf '%s' "$DASHBOARD" | jq -r '(.projects // [])[].id')
}

OWNED="$(owned_projects)"

# `GET /api/admin/user` returns meSchema, whose `.permissions[]` are this token's permissions. ADMIN
# subsumes everything; CREATE_PROJECT is the specific grant we need. This is what tells an attendee
# pointing at an existing corporate instance that their PAT is too narrow — before we try and fail.
ME="$(auth_get "${BASE}/api/admin/user")"
if printf '%s' "$ME" | jq -e 'any((.permissions // [])[]; (.permission // "") | . == "ADMIN" or . == "CREATE_PROJECT")' >/dev/null 2>&1; then
  CAN_CREATE_PROJECT="yes"
else
  CAN_CREATE_PROJECT=""
fi

# Resolution order. Each step is a strictly better signal than the next.
PROJECT_ID=""

# (1) A Terraform-provisioned `project-NNN` you own. Deterministic, so it always wins.
PROJECT_ID="$(printf '%s' "$OWNED" | grep -E '^project-[0-9]+$' | head -n1 || true)"

# (2) Re-running configure: the project named in .env, if it still exists. Existence is enough — we
#     put that id there ourselves, and an admin who created a project via the API is not always
#     reported as its "Owner" on the personal dashboard, so demanding ownership here would send a
#     returning self-paced attendee back through the creation prompt every time.
if [ -z "$PROJECT_ID" ]; then
  PREVIOUS="$(grep -E '^UNLEASH_PROJECT_ID=' .env | tail -n1 | cut -d= -f2- | tr -d "\"'")"
  if [ -n "$PREVIOUS" ] && [ "$(auth_status "${BASE}/api/admin/projects/${PREVIOUS}/overview")" = "200" ]; then
    PROJECT_ID="$PREVIOUS"
    ok "Reusing ${BOLD}${PROJECT_ID}${RESET} from your .env."
  fi
fi

# (3) Nothing to go on. Offer to create a project — we never adopt one we didn't make, because
#     provisioning writes four flags, two context fields, and a segment into it.
CREATE_PROJECT=""
if [ -z "$PROJECT_ID" ]; then
  printf '\n%sNo workshop project found for you on this instance.%s\n' "$BOLD" "$RESET"

  OTHERS="$(auth_get "${BASE}/api/admin/projects" | jq -r '(.projects // [])[] | select(.id != "default") | "  • \(.id)  (\(.name))"' 2>/dev/null || true)"
  if [ -n "$OTHERS" ]; then
    printf 'This instance has other projects, but none of them is yours to use for the workshop:\n%s\n' "$OTHERS"
    printf 'I will not write workshop flags into a project I did not create.\n'
  fi

  # Surface a too-narrow token BEFORE asking anything: there is no point prompting for a project id
  # we could never create. This is the failure mode of pointing the workshop at a corporate instance.
  if [ -z "$CAN_CREATE_PROJECT" ]; then
    printf '\n'
    die "Your PAT cannot create projects — it holds neither ADMIN nor CREATE_PROJECT.
     Ask an Unleash admin for a token that can, or create the project by hand following
     ${BOLD}${MANUAL_SETUP_DOC}${RESET}, then re-run ${BOLD}make workshop-configure${RESET}."
  fi

  printf '\nI can create one for you. That means: a project (with this instance'\''s existing\n'
  printf 'development and production environments enabled on it), the workshop'\''s feature\n'
  printf 'flags, and 4 SDK tokens.\n\n'

  # Unleash accepts [A-Za-z0-9_~.-] in a project id (createProjectSchema). Reject anything else here
  # rather than letting it surface as an opaque HTTP 400 from the provisioner.
  while :; do
    read -rp "Project id [${DEFAULT_PROJECT_ID}]: " PROJECT_ID
    PROJECT_ID="${PROJECT_ID:-$DEFAULT_PROJECT_ID}"
    if [[ "$PROJECT_ID" =~ ^[A-Za-z0-9_~.-]+$ ]]; then
      break
    fi
    printf '  %s⚠%s Use only letters, digits, and _ ~ . - (no spaces).\n' "$YELLOW" "$RESET"
  done
  read -rp "Create it? [y/N]: " CONFIRM

  case "$CONFIRM" in
    [yY]|[yY][eE][sS]) CREATE_PROJECT="yes" ;;
    *)
      printf '\n'
      die "Stopped — nothing was created.
     To set it up by hand instead, follow ${BOLD}${MANUAL_SETUP_DOC}${RESET}
     (minimum: one project, one promo-code flag, four SDK tokens), then re-run
     ${BOLD}make workshop-configure${RESET}."
      ;;
  esac
fi

# --- 4b. create the project (self-paced) -------------------------------------
# Delegated to `make workshop-provision`, which owns the pnpm/npm invocation of the same
# unleash-provisioner the facilitator runs — so the command lives in exactly one place.
if [ -n "$CREATE_PROJECT" ]; then
  printf '\n%sCreating %s …%s\n\n' "$BOLD" "$PROJECT_ID" "$RESET"
  if ! UNLEASH_BASE_URL="$BASE" UNLEASH_ADMIN_TOKEN="$PAT" \
       UNLEASH_PROJECTS="$PROJECT_ID" UNLEASH_PROJECT_NAME="$PROJECT_ID" \
       "${MAKE:-make}" workshop-provision; then
    printf '\n'
    die "Provisioning failed — see the output above. Nothing else was written to .env."
  fi
  printf '\n'
  ok "Created and provisioned ${BOLD}${PROJECT_ID}${RESET}."
fi

# The flag prefix exists only to keep the facilitated workshop's many `project-NNN` siblings from
# colliding on globally-unique names. Your own instance needs no such disambiguation. Keep this rule
# byte-for-byte in step with `projectPrefix()` in the provisioner's src/config.ts — the provisioner
# names the flags, this names what the app looks for, and they have to agree.
if [[ "$PROJECT_ID" =~ ^project-([0-9]+)$ ]]; then
  FLAG_PREFIX="p${BASH_REMATCH[1]}_"
else
  FLAG_PREFIX=""
fi

set_env UNLEASH_PROJECT_ID       "$PROJECT_ID"
set_env VITE_UNLEASH_PROJECT_ID  "$PROJECT_ID"
set_env UNLEASH_FLAG_PREFIX      "$FLAG_PREFIX"
set_env VITE_UNLEASH_FLAG_PREFIX "$FLAG_PREFIX"
if [ -n "$FLAG_PREFIX" ]; then
  ok "Your project is ${BOLD}${PROJECT_ID}${RESET} (flag prefix ${BOLD}${FLAG_PREFIX}${RESET})."
else
  ok "Your project is ${BOLD}${PROJECT_ID}${RESET} (flags are named without a prefix)."
fi

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
