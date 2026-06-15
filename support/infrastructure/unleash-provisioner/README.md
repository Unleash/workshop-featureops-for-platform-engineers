# unleash-provisioner

Provisions the Unleash resources the official `Unleash/unleash` Terraform provider does **not**
support, across **every attendee project** Terraform creates (`project-001`, `project-002`, …).
Terraform owns the durable setup (one project/group/permissions/tokens per user, the flag
**naming pattern**, and the project **links**); this tool owns the rest, prefixing every name with
the project number so attendees stay isolated:

- **Project-scoped context fields** — `pNNN_region` and `pNNN_email` (the provider's
  `unleash_context_field` can only create instance-global fields, and field names are globally
  unique — hence the prefix).
- **Feature flags** — the workshop's four `pNNN_…` flags, with a 100% `flexibleRollout` strategy per
  environment, strategy variants, and per-environment enabled state. Production is
  change-request-guarded, so the guard is lifted while flags are written and restored afterward.
- **Segment** — the project-scoped `pNNN_internal-users` segment (`pNNN_email` ends with
  `@getunleash.io`).
- **Tags** — the orange `Layer` tag type (global, created once) and a per-flag tag describing where
  each flag is evaluated.

The Admin API client retries on 429 / transient 5xx with backoff, so a many-project run never trips
the cloud rate limiter. This replaces the previous `infrastructure/flags/` shell scripts +
`exported-project.json`.

## Usage

Driven by `make unleash-create` / `make unleash-destroy`. Standalone:

```bash
# Needs admin credentials in the environment (same as Terraform):
#   TF_VAR_unleash_base_url, TF_VAR_unleash_token
# Plus the target projects (Terraform output `project_ids`, semicolon-separated):
UNLEASH_PROJECTS="project-001;project-002" pnpm --dir support/infrastructure/unleash-provisioner provision
UNLEASH_PROJECTS="project-001;project-002" pnpm --dir support/infrastructure/unleash-provisioner destroy
```

Optional overrides: `UNLEASH_ENVIRONMENTS` (default `development production`),
`UNLEASH_CR_ENVIRONMENTS` (default `production`), `UNLEASH_PROD_REQUIRED_APPROVALS` (default `1`).
