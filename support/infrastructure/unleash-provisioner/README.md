# unleash-provisioner

Provisions the Unleash resources the official `Unleash/unleash` Terraform provider does **not** support. It serves two flows.

**Facilitated** (default) — runs across **every attendee project** Terraform creates (`project-001`, `project-002`, …). Terraform owns the durable setup (one project/group/permissions/tokens per user, the flag **naming pattern**, and the project **links**); this tool owns the rest. Every name is prefixed with the project's number (`p001_`) so that attendees sharing one instance stay isolated:

- **Project-scoped context fields** — `p001_region` and `p001_email` (the provider's `unleash_context_field` can only create instance-global fields, and field names are globally unique — hence the prefix).
- **Feature flags** — the workshop's four `p001_…` flags, with a 100% `flexibleRollout` strategy per environment, strategy variants, and per-environment enabled state.
- **Segment** — the project-scoped `p001_internal-users` segment (`p001_email` ends with `@getunleash.io`).
- **Tags** — the orange `Layer` tag type (global, created once) and a per-flag tag describing where each flag is evaluated.
- **Master kill switch** — the instance-level signal endpoint plus a per-project Action that fires it.

**Self-paced** (`UNLEASH_SELF_PACED=1`, via `make workshop-provision`) — one attendee, one project, **no Terraform**. On top of the above, this tool takes over Terraform's job: it **creates the project** (enabling the instance's existing `development` and `production` environments on it — a fresh project has none enabled), applies the naming pattern and links, and **mints the four SDK tokens**. Because the attendee owns their whole instance, names are **not prefixed**: the segment is simply `internal-users`. Two things are deliberately skipped: archiving the built-in `Default` project (destructive on an instance we don't own) and the master kill switch (its Action needs a Terraform-provisioned service account).

Provisioning leaves **change requests off** in every environment — the attendee enables them on `production` themselves, as the first task of workshop step 8. Since flag writes and archives are silently deferred in a change-request-guarded environment, both `provision` and `destroy` lift any guard they find and then **restore whatever was there before**, rather than forcing it on or off.

The Admin API client retries on 429 / transient 5xx with backoff, so a many-project run never trips the cloud rate limiter. This replaces the previous `infrastructure/flags/` shell scripts + `exported-project.json`.

## Usage

Driven by `make unleash-create` / `make unleash-destroy` (facilitated) and `make workshop-provision` (self-paced, invoked by `workshop-configure.sh`). Standalone:

```bash
# Needs admin credentials in the environment. Prefer UNLEASH_BASE_URL / UNLEASH_ADMIN_TOKEN;
# TF_VAR_unleash_base_url / TF_VAR_unleash_token are accepted as a fallback (Terraform sets those).
# Plus the target projects (Terraform output `project_ids`, semicolon-separated):
UNLEASH_PROJECTS="project-001;project-002" pnpm --dir support/infrastructure/unleash-provisioner provision
UNLEASH_PROJECTS="project-001;project-002" pnpm --dir support/infrastructure/unleash-provisioner destroy

# Self-paced: create and provision a single project from scratch.
UNLEASH_SELF_PACED=1 UNLEASH_PROJECTS="featureops-workshop" UNLEASH_PROJECT_NAME="FeatureOps Workshop" \
  pnpm --dir support/infrastructure/unleash-provisioner provision
```

Optional overrides: `UNLEASH_ENVIRONMENTS` (default `development production`), `UNLEASH_CR_ENVIRONMENTS` (environments whose change-request guard is lifted around mutations, default `production`), `UNLEASH_PROD_REQUIRED_APPROVALS` (fallback approval count when restoring a guard whose own value the API didn't report, default `1`), `UNLEASH_FORCE_PROVISION`, `UNLEASH_FORCE_DESTROY`.
