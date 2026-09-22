#!/usr/bin/env bash
#
# FeatureOps workshop — toolchain check (run before every `make install`, via `make ensure-toolchain`).
#
# Confirms Node.js and the package manager the Makefile picked can actually run here, and says which
# one it is — before `install` would fail halfway through with a less helpful error:
#   1. Node.js is on PATH and is v22+ (the root package.json engines range)
#   2. the package manager the Makefile chose runs — pnpm, or the npm fallback (and why it fell back)
#   3. on WSL, Node.js / npm / pnpm are Linux binaries, not the Windows ones borrowed through /mnt/c
#      (Windows npm cannot work on WSL paths: "UNC paths are not supported")
#   4. on Git Bash, a note that WSL2 is the smoother road
#
# The pnpm-or-npm DECISION stays in the Makefile (it runs `pnpm --version` and needs v11+); this
# script only reports it. Exits non-zero on a toolchain that cannot work, so `install` stops early.
#
# Usage:  bash support/scripts/check-toolchain.sh <pnpm|npm> [pnpm version the Makefile probed]

set -u

PM="${1:-npm}"
PROBED_PNPM="${2:-}"

# --- pretty output ----------------------------------------------------------
if [ -t 1 ] && [ "${NO_COLOR:-}" = "" ]; then
  GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; YELLOW=$'\033[0;33m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; BOLD=''; RESET=''
fi

fail_count=0
ok()   { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
warn() { printf '  %s⚠%s %s\n' "$YELLOW" "$RESET" "$1"; }
bad()  { printf '  %s✗%s %s\n' "$RED" "$RESET" "$1"; fail_count=$((fail_count + 1)); }

# The Makefile exports NODE_OPTIONS with a flag an old Node.js rejects at startup — clear it for
# the probes below, so a too-old Node.js is reported as such instead of crashing the check.
run_quiet() { NODE_OPTIONS='' "$@" </dev/null 2>/dev/null; }

IS_WSL=""
if [ -n "${WSL_DISTRO_NAME:-}" ] || grep -qi microsoft /proc/version 2>/dev/null; then
  IS_WSL="yes"
fi

# On WSL, a binary under /mnt/<drive>/ is the Windows one leaking in through the Windows PATH.
borrowed_from_windows() { [ -n "$IS_WSL" ] && case "$1" in /mnt/*) true ;; *) false ;; esac; }
windows_binary_hint() {
  bad "${BOLD}$1${RESET} resolves to the Windows binary ($2), which cannot work on WSL paths."
  printf '      Install Node.js inside WSL (e.g. https://github.com/nvm-sh/nvm), open a new shell, and re-run.\n'
}

printf '%sToolchain%s\n' "$BOLD" "$RESET"

# --- platform notes ---------------------------------------------------------
case "$(uname -s 2>/dev/null)" in
  MINGW* | MSYS* | CYGWIN*)
    warn "Git Bash detected — supported, but WSL2 is the smoother road on Windows (README.md → Dependencies)."
    ;;
esac

# --- 1. Node.js -------------------------------------------------------------
NODE_PATH="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_PATH" ]; then
  bad "Node.js is not installed — install v22 or newer (README.md → Dependencies), then re-run."
elif borrowed_from_windows "$NODE_PATH"; then
  windows_binary_hint node "$NODE_PATH"
else
  NODE_VERSION="$(run_quiet node --version)"
  NODE_MAJOR="${NODE_VERSION#v}"; NODE_MAJOR="${NODE_MAJOR%%.*}"
  if [ -z "$NODE_VERSION" ]; then
    bad "Node.js at ${NODE_PATH} does not run — is a version manager missing the version this repo pins?"
  elif [ "$NODE_MAJOR" -ge 22 ] 2>/dev/null; then
    ok "Node.js ${NODE_VERSION}"
  else
    bad "Node.js ${NODE_VERSION} is too old — this repository needs v22 or newer."
  fi
fi

# --- 2. package manager -----------------------------------------------------
PNPM_PATH="$(command -v pnpm 2>/dev/null || true)"
NPM_PATH="$(command -v npm 2>/dev/null || true)"

if [ "$PM" = "pnpm" ]; then
  if [ -n "$PNPM_PATH" ] && borrowed_from_windows "$PNPM_PATH"; then
    windows_binary_hint pnpm "$PNPM_PATH"
  else
    PNPM_VERSION="${PROBED_PNPM:-$(COREPACK_ENABLE_DOWNLOAD_PROMPT=0 run_quiet pnpm --version)}"
    if [ -n "$PNPM_VERSION" ]; then
      ok "Package manager: pnpm ${PNPM_VERSION}"
    else
      bad "pnpm was requested (FORCE_PM=pnpm) but does not run — install it, or drop FORCE_PM to use npm."
    fi
  fi
else
  # Say WHY we are on npm — a silent fallback is what hid the broken-shim case before.
  if [ "${FORCE_PM:-}" = "npm" ]; then
    reason="FORCE_PM=npm"
  elif [ -z "$PNPM_PATH" ]; then
    reason="pnpm is not installed"
  elif [ -n "$PROBED_PNPM" ]; then
    reason="pnpm ${PROBED_PNPM} is older than the v11 this repository needs"
  else
    reason="${PNPM_PATH} does not run — likely a version-manager or corepack shim with no pnpm installed"
  fi

  if [ -z "$NPM_PATH" ]; then
    bad "Neither a usable pnpm nor npm found (${reason}). npm ships with Node.js — reinstall Node.js."
  elif borrowed_from_windows "$NPM_PATH"; then
    windows_binary_hint npm "$NPM_PATH"
  else
    NPM_VERSION="$(run_quiet npm --version)"
    if [ -n "$NPM_VERSION" ]; then
      ok "Package manager: npm ${NPM_VERSION} (fallback: ${reason})"
    else
      bad "npm at ${NPM_PATH} does not run — reinstall Node.js, then re-run."
    fi
  fi
fi

if [ "$fail_count" -gt 0 ]; then
  printf '%s✗ The toolchain above cannot run this repository%s — fix the red item(s), then re-run.\n' "$RED" "$RESET"
  exit 1
fi
exit 0
