# Unofficial FeatureOps Gift Store — entry point for every task.
# Feature flags run against a CLOUD (remote) Unleash instance — there is no local Unleash.
#
# Every attendee runs the same workshop flow; only "run the app" differs:
#   make workshop-pre-check → make workshop-configure → (make dev | make docker-up) → make workshop-final-check
#   • Attendee · localhost (default) — Node.js + pnpm:  run the app with make dev
#   • Attendee · Docker             — Docker:           run the app with make docker-up
#   • Maintainer                    — full toolchain:   make maint-* / make unleash-* targets
# Unleash provisioning (make unleash-create / unleash-destroy) is maintainer tooling —
# it needs Terraform + the admin TF_VAR_* token.

.DEFAULT_GOAL := help

TF := terraform -chdir=support/infrastructure/terraform

# --- Package-manager anti-corrosion layer -----------------------------
# Prefer pnpm (the maintainer's choice); transparently fall back to npm when
# pnpm is not on PATH, so contributors without pnpm can still run everything.
# Force a manager with `make <target> FORCE_PM=npm` (or pnpm) — also how the
# fallback gets tested. Docker stays pnpm-only (it has pnpm via corepack).
ifeq ($(FORCE_PM),npm)
  HAS_PNPM :=
else ifeq ($(FORCE_PM),pnpm)
  HAS_PNPM := yes
else
  HAS_PNPM := $(shell command -v pnpm >/dev/null 2>&1 && echo yes)
endif

ifeq ($(HAS_PNPM),yes)
  pm_install  = pnpm install
  pm_run      = pnpm $(1)                      # run a root package.json script
  pm_rec      = pnpm -r $(1)                    # run script $(1) across all workspaces
  pm_filter   = pnpm --filter $(1) $(2)         # run script $(2) in package $(1)
  pm_filterex = pnpm --filter $(1) exec $(2)    # exec tool $(2) in package $(1)
else
  pm_install  = npm install
  pm_run      = npm run $(1)
  pm_rec      = npm run $(1) --workspaces --if-present
  pm_filter   = npm run $(2) -w $(1)
  pm_filterex = npm -w $(1) exec -- $(2)
endif
# ----------------------------------------------------------------------

# Load local .env so the TF_VAR_* provisioning credentials (kept there) reach the
# checks and recipes — and the import/destroy scripts inherit them. The PRODUCTION app
# tokens are exported too so `pnpm dev` can launch the side-by-side production instance.
-include .env
export TF_VAR_unleash_base_url TF_VAR_unleash_token TF_VAR_facilitator_email \
       VITE_UNLEASH_CLIENT_KEY_PRODUCTION UNLEASH_API_TOKEN_PRODUCTION

# Attendee project number (drives the pNNN_ flag prefix); defaults to 001 before .env exists.
PNUM := $(or $(strip $(UNLEASH_PROJECT_NUMBER)),001)

.PHONY: help workshop-pre-check workshop-configure workshop-final-check setup install dev clean \
        docker-pull docker-up docker-down docker-image docker-logs \
        unleash-create unleash-destroy \
        master-kill-switch master-kill-switch-web \
        maint-fmt maint-lint-infra maint-lint maint-build maint-test maint-check \
        ensure-env ensure-tf-env shared-build \
        _dev-web _dev-api _dev-web-prod _dev-api-prod _dev-paybro _dev-dashed

# =====================================================================
# Help (default)
# =====================================================================
help:
	@echo "Unofficial FeatureOps Gift Store — feature-flagged checkout demo (remote Unleash)"
	@echo "================================================================================"
	@echo ""
	@echo "WORKSHOP — the attendee flow, in order:"
	@echo "  make workshop-pre-check    Install deps + check your machine is ready (do this ahead of time)"
	@echo "  make workshop-configure    Create a PAT, then auto-fill .env (tokens, URLs, project) via the API"
	@echo "  make dev | make docker-up  Run the app (localhost or Docker)"
	@echo "  make workshop-final-check  Verify readiness + print your project, flags URL, and MCP exports"
	@echo "  (make setup is an alias for make workshop-pre-check)"
	@echo ""
	@echo "ATTENDEE · localhost (default) — Node.js + pnpm (auto-falls back to npm), no Docker"
	@echo "  make dev              Run development + production web/api (shared paybro) on the host"
	@echo "  make clean            Remove build artifacts"
	@echo ""
	@echo "ATTENDEE · Docker — run the app in containers instead of make dev (still run pre-check + configure first)"
	@echo "  make docker-pull      Pre-pull base images + pre-build (do this ahead of time)"
	@echo "  make docker-image     Build Docker images"
	@echo "  make docker-up        Build and run all services in Docker"
	@echo "  make docker-down      Stop and remove the containers"
	@echo "  make docker-logs      Tail the container logs"
	@echo ""
	@echo "MAINTAINER — develop & expand the repo (full toolchain)"
	@echo "  make maint-check      Format, lint (app + scripts), build, test, typecheck"
	@echo "  make maint-lint       Lint app + scripts    ·  make maint-fmt    Format everything"
	@echo "  make maint-test       Run tests             ·  make maint-build  Production build"
	@echo "  make unleash-create   Provision project/users/envs + import flags + write .env tokens"
	@echo "  make unleash-destroy  Archive flags and tear everything down"
	@echo "  (provisioning needs terraform + TF_VAR_unleash_base_url / TF_VAR_unleash_token in .env)"
	@echo ""
	@echo "Apps (development):  web :8080  ·  api :8081 (/health,/metrics)"
	@echo "Apps (production):   web :8090  ·  api :8091"
	@echo "Providers (shared):  paybro :8400  ·  dashed :8401"

# =====================================================================
# Workshop (attendee flow)
# =====================================================================
# 1) Ahead of time (homework): install dependencies, then check the machine is ready
#    (required tools, free ports, no stray Unleash env vars).
workshop-pre-check: install
	@bash support/scripts/workshop-pre-check.sh

# `make setup` is kept as an alias for the pre-check (the old entry-point name).
setup: workshop-pre-check

# 2) Create .env (if needed) and fill it from the Unleash API using your own PAT —
#    no copy-pasting tokens, URLs, or your project number.
workshop-configure: ensure-env
	@bash support/scripts/workshop-configure.sh

# 4) Verify readiness and print your project, your flags URL, and the MCP export commands.
workshop-final-check:
	@bash support/scripts/workshop-final-check.sh

# =====================================================================
# Attendee · localhost (default, no prefix)
# =====================================================================
install:
	$(call pm_install)

# Run the three apps on the host. No lint gate — keep it fast for attendees.
dev: ensure-env shared-build
	@grep -Eq '^UNLEASH_API_TOKEN=.+' .env || \
	  echo "⚠  Unleash tokens are not set in .env — run 'make workshop-configure' to fill them."
	$(call pm_run,dev)

clean:
	rm -rf src/gift-store/*/dist src/payment-providers/*/dist

# Per-process dev targets fanned out by the root `dev` script (concurrently).
# Kept here — not inline in package.json — so they go through the pm_* macros
# and run under pnpm or npm alike. Env prefixes mirror the original `dev` script.
_dev-web:
	$(call pm_filter,@gift-store/storefront,dev)
_dev-api:
	$(call pm_filter,@gift-store/checkout,dev)
_dev-web-prod:
	VITE_NODE_ENV=production VITE_UNLEASH_CLIENT_KEY=$$VITE_UNLEASH_CLIENT_KEY_PRODUCTION VITE_API_URL=http://localhost:8091 VITE_CACHE_DIR=node_modules/.vite-prod $(call pm_filterex,@gift-store/storefront,vite --port 8090 --strictPort)
_dev-api-prod:
	NODE_ENV=production UNLEASH_API_TOKEN=$$UNLEASH_API_TOKEN_PRODUCTION PORT=8091 PUBLIC_WEB_URL=http://localhost:8090 PUBLIC_API_URL=http://localhost:8091 PAYBRO_URL=http://localhost:8400 $(call pm_filter,@gift-store/checkout,dev)
_dev-paybro:
	$(call pm_filter,@gift-store/paybro,dev)
_dev-dashed:
	$(call pm_filter,@gift-store/dashed,dev)

# =====================================================================
# Attendee · Docker (docker- prefix)
# =====================================================================
# Pre-pull the base images (pinned in the Dockerfiles) and pre-build the service
# images, so a flaky-wifi workshop starts fast. The Dockerfiles stay the single
# source of truth for image versions.
docker-pull:
	docker compose build --pull

docker-image:
	docker compose build

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

# =====================================================================
# Maintainer · Unleash provisioning (needs Terraform + TF_VAR_*)
# =====================================================================
unleash-create: ensure-env ensure-tf-env
	@echo "→ Provisioning users / project / group and minting app tokens with Terraform…"
	@$(TF) init -input=false >/dev/null
	@$(TF) apply -auto-approve -input=false
	@echo "→ Provisioning flags, context fields, segment, Layer tags, and the master kill switch (all projects)…"
	@UNLEASH_PROJECTS="$$($(TF) output -raw project_ids)" \
	 $(call pm_filter,unleash-provisioner,provision)
	@FE=$$($(TF) output -raw selfpaced_frontend_client_key); \
	 BE=$$($(TF) output -raw selfpaced_backend_api_token); \
	 FE_PROD=$$($(TF) output -raw selfpaced_frontend_client_key_production); \
	 BE_PROD=$$($(TF) output -raw selfpaced_backend_api_token_production); \
	 PNUM=$$($(TF) output -raw selfpaced_project_number); \
	 FE_URL=$$($(TF) output -raw unleash_frontend_url); \
	 BE_URL=$$($(TF) output -raw unleash_backend_url); \
	 tmp=$$(mktemp); \
	 grep -v \
	   -e '^VITE_UNLEASH_CLIENT_KEY=' -e '^VITE_UNLEASH_CLIENT_KEY_PRODUCTION=' \
	   -e '^UNLEASH_API_TOKEN=' -e '^UNLEASH_API_TOKEN_PRODUCTION=' \
	   -e '^VITE_UNLEASH_URL=' -e '^UNLEASH_URL=' \
	   -e '^VITE_UNLEASH_PROJECT_NUMBER=' -e '^UNLEASH_PROJECT_NUMBER=' .env > $$tmp; \
	 printf 'VITE_UNLEASH_CLIENT_KEY=%s\nVITE_UNLEASH_CLIENT_KEY_PRODUCTION=%s\nUNLEASH_API_TOKEN=%s\nUNLEASH_API_TOKEN_PRODUCTION=%s\nVITE_UNLEASH_URL=%s\nUNLEASH_URL=%s\nVITE_UNLEASH_PROJECT_NUMBER=%s\nUNLEASH_PROJECT_NUMBER=%s\n' \
	   "$$FE" "$$FE_PROD" "$$BE" "$$BE_PROD" "$$FE_URL" "$$BE_URL" "$$PNUM" "$$PNUM" >> $$tmp; \
	 mv $$tmp .env; \
	 echo "→ Wrote Unleash app tokens (development + production), URLs, and project number ($$PNUM) into .env"

unleash-destroy: ensure-env ensure-tf-env
	@$(TF) init -input=false >/dev/null
	@if $(TF) output -json project_ids >/dev/null 2>&1; then \
	   PROJECTS="$$($(TF) output -raw project_ids)"; \
	 else \
	   PROJECTS=""; \
	 fi; \
	 if [ -n "$$PROJECTS" ]; then \
	   echo "→ Removing provisioned flags, context fields, segments, and tags so the projects can be destroyed…"; \
	   UNLEASH_PROJECTS="$$PROJECTS" $(call pm_filter,unleash-provisioner,destroy); \
	 else \
	   echo "→ No projects in Terraform state — skipping provisioner cleanup."; \
	 fi
	@echo "→ Destroying Terraform-managed Unleash resources…"
	@$(TF) destroy -auto-approve -input=false

# Master kill switch — one signal disables the SWAG-store-link kill switch in EVERY project
# (dev + prod). Needs the master kill switch provisioned first (make unleash-create writes the
# signal URL + token into .master-kill-switch.json at the repo root).
master-kill-switch:
	@echo "→ Firing the master kill switch (actions fire in ~60s)…"
	$(call pm_filter,master-kill-switch,fire)

master-kill-switch-web:
	@echo "→ Serving the master kill switch console on http://localhost:8500 …"
	$(call pm_filter,master-kill-switch,web)

# =====================================================================
# Maintainer (maint- prefix)
# =====================================================================
# ESLint type-checks against @gift-store/commerce's published types (./dist/index.d.ts),
# so the package must be built before linting — otherwise its imports resolve to
# `any` and trip ~80 no-unsafe-* errors.
shared-build:
	$(call pm_filter,@gift-store/commerce,build)

maint-fmt:
	$(call pm_run,fmt)
	$(TF) fmt -recursive

# Non-app linting: Terraform (fmt + validate + tflint), shell scripts (shellcheck), and the
# Unleash provisioner's typecheck. tflint + shellcheck versions are pinned in .tool-versions.
maint-lint-infra:
	@command -v terraform >/dev/null 2>&1 || { echo "terraform not found — install it (see .tool-versions)."; exit 1; }
	@echo "→ Linting Terraform (fmt + validate)…"
	$(TF) fmt -check -recursive
	@$(TF) init -backend=false -input=false >/dev/null
	$(TF) validate
	@command -v tflint >/dev/null 2>&1 || { echo "tflint not found — install it (see .tool-versions, e.g. 'asdf install')."; exit 1; }
	@echo "→ Linting Terraform (tflint)…"
	tflint --chdir=support/infrastructure/terraform
	@command -v shellcheck >/dev/null 2>&1 || { echo "shellcheck not found — install it (see .tool-versions, e.g. 'asdf install')."; exit 1; }
	@echo "→ Linting shell scripts (shellcheck)…"
	find support/scripts -name '*.sh' -type f -exec shellcheck {} +
	@echo "→ Typechecking the Unleash provisioner…"
	$(call pm_filter,unleash-provisioner,typecheck)

maint-lint: maint-fmt shared-build maint-lint-infra
	$(call pm_run,lint)

maint-build: maint-lint
	$(call pm_rec,build)

maint-test: shared-build
	$(call pm_rec,test)

# Full quality gate (the old `check`): fmt + lint (app + scripts) + build + test + typecheck.
maint-check: maint-build
	$(call pm_rec,test)
	$(call pm_rec,typecheck)

# =====================================================================
# Helpers (used as prerequisites)
# =====================================================================
ensure-env:
	@test -f .env || { cp .env.example .env && echo "Created .env from .env.example"; }

# Verify Terraform is installed and the admin provisioning credentials are set
# (in .env or the environment). Used by unleash-create / unleash-destroy.
ensure-tf-env:
	@command -v terraform >/dev/null 2>&1 || { \
	  echo "terraform not found — install it (see .tool-versions, e.g. 'asdf install')."; exit 1; }
	@test -n "$$TF_VAR_unleash_base_url" || { \
	  echo "Set TF_VAR_unleash_base_url in .env (cloud Unleash URL, e.g. https://us.app.unleash-hosted.com/<instance>)."; exit 1; }
	@test -n "$$TF_VAR_unleash_token" || { \
	  echo "Set TF_VAR_unleash_token in .env (admin Service Account token or PAT)."; exit 1; }
