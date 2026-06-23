# Terraform project that provisions Unleash application tokens.
.PHONY: fmt lint build apply apply-users destroy

# Use bash with pipefail so a piped recipe (the filtered destroy below) still fails when terraform
# does, not just when the trailing filter does.
SHELL       := bash
.SHELLFLAGS := -o pipefail -c

# Graph-walk concurrency for apply/destroy. Default: 10. Override with `make apply PARALLELISM=1`
# (or from the repo-root Makefile). Lower it if the hosted instance rate-limits large runs — the
# provider has no 429 retry, so a burst aborts the apply.
PARALLELISM ?= 5

# Whether terraform refreshes existing state before apply/destroy. Default true (terraform's
# default); set `make apply REFRESH=false` to skip the read-back (faster on large runs, at the cost
# of not detecting out-of-band drift).
REFRESH ?= true

# User-creation throttle. The Unleash Admin API caps user creation at 20 calls/min, and the provider
# has no 429 retry — a single rate-limit response aborts the whole apply. Concurrency caps alone
# (PARALLELISM / max_concurrent_requests) don't guarantee a per-minute ceiling: if a create returns
# fast enough, even fully serial runs burst past it. So `apply` creates unleash_user.users in -target
# batches with a pause between, BEFORE the full apply (by which point the users exist → no re-create).
# Keys are zero-padded row numbers (001, 002, …) matching main.tf's users_by_number.
#
# USER_BATCH_SIZE: keep < 20 for margin; set 0 to disable batching (plain full apply).
# USER_BATCH_PAUSE: seconds between batches (the rate-limit window).
# USERS_CSV: non-blank row count minus the header = number of users to pace.
USER_BATCH_SIZE  ?= 18
USER_BATCH_PAUSE ?= 60
USERS_CSV        ?= users.csv

fmt:
	terraform fmt -recursive

lint: fmt
	terraform init -backend=false -input=false
	terraform validate

build: lint
	terraform plan -input=false

apply:
	terraform init -input=false
	@$(MAKE) --no-print-directory apply-users
	terraform apply -auto-approve -input=false -parallelism=$(PARALLELISM) -refresh=$(REFRESH)

# Create the unleash_user.users instances in rate-limited batches BEFORE the full apply, so we stay
# under the Admin API's 20-calls/min user-creation limit. A batch only pauses if it ACTUALLY created
# users (parses "N added" from the apply output) and more batches remain, so re-runs — including after
# appending rows to the CSV — don't sleep for already-existing users (a refresh/read isn't a create).
apply-users:
	@if [ "$(USER_BATCH_SIZE)" -le 0 ]; then \
	  echo "→ user batching disabled (USER_BATCH_SIZE=0) — users created by the full apply."; exit 0; \
	fi; \
	count=$$(( $$(grep -c . "$(USERS_CSV)") - 1 )); \
	[ "$$count" -gt 0 ] || { echo "→ no users in $(USERS_CSV) — nothing to batch."; exit 0; }; \
	echo "→ creating $$count user(s) in batches of $(USER_BATCH_SIZE) (≤20/min Admin API limit)…"; \
	i=1; \
	while [ "$$i" -le "$$count" ]; do \
	  set --; j=0; \
	  while [ "$$j" -lt "$(USER_BATCH_SIZE)" ] && [ "$$i" -le "$$count" ]; do \
	    key=$$(printf '%03d' "$$i"); \
	    set -- "$$@" -target='unleash_user.users["'"$$key"'"]'; \
	    i=$$(( i + 1 )); j=$$(( j + 1 )); \
	  done; \
	  echo "  • batch through user $$(( i - 1 ))/$$count"; \
	  out=$$(terraform apply -auto-approve -input=false -refresh=$(REFRESH) "$$@" 2>&1); echo "$$out"; \
	  added=$$(printf '%s\n' "$$out" | sed -n 's/.*: \([0-9][0-9]*\) added.*/\1/p' | tail -1); \
	  [ -n "$$added" ] || added=0; \
	  if [ "$$i" -le "$$count" ] && [ "$$added" -gt 0 ]; then \
	    echo "  … created $$added; pausing $(USER_BATCH_PAUSE)s for the rate-limit window"; \
	    sleep $(USER_BATCH_PAUSE); \
	  fi; \
	done

destroy:
	terraform init -input=false
	terraform destroy -auto-approve -input=false -parallelism=$(PARALLELISM) -refresh=$(REFRESH) 2>&1 \
	  | awk -f scripts/strip-projectaccess-warning.awk
