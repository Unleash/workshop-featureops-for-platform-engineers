# Backstage + Unleash (isolated example)

A **minimal, self-contained** [Backstage](https://backstage.io) instance that shows the feature
flags of your Unleash projects inside the Backstage Catalog UI, using the
[GlobalLogic Unleash plugin](https://github.com/globallogicuki/globallogic-backstage-plugins).

It is fully isolated from the rest of this repository:

- Standalone **Yarn 4** project (the monorepo uses pnpm) — **not** part of the pnpm workspace.
- Own Docker Compose project (`backstage-with-unleash`) on its own free port **7007** — no overlap
  with the gift-store services (`8080/8081/8090/8091/8400/8401`).
- One container, **no external database** (in-memory SQLite), no shared networks or volumes.
- The only thing that lives outside this folder is the Unleash **service account + token** that
  Backstage authenticates with — see [Service account](#service-account).

## How it works

- The **backend** registers `@globallogicuki/backstage-plugin-unleash-backend`, which reads
  `unleash.url` + `unleash.apiToken` from config and calls the Unleash **Admin API**.
- The **frontend** (`packages/app/.../EntityPage.tsx`) mounts a **Feature Flags** tab and an
  overview card on any catalog entity carrying the `unleash.io/project-id` annotation.
- At container start, [`scripts/generate-catalog.mjs`](scripts/generate-catalog.mjs) calls
  `GET /api/admin/projects` with the service-account token and writes one annotated `Component`
  per **project the token can see** into `catalog/projects.generated.yaml`. So the catalog
  reflects exactly the service account's visibility — no hand-maintained project list. Add a
  project (or widen the SA's access) and restart to pick it up.

## Run it

```bash
cd other-examples/backstage-with-unleash
cp .env.example .env
# edit .env: set UNLEASH_URL (instance base, NO /api) and UNLEASH_API_TOKEN
docker compose up --build
```

Then open <http://localhost:7007>, go to the Catalog, open an `unleash-<project>` component, and
click the **Feature Flags** tab. The overview page also shows an Unleash card.

To iterate without Docker: `yarn install && yarn start` (frontend on 3000, backend on 7007) with
`UNLEASH_URL` / `UNLEASH_API_TOKEN` exported in your shell.

## Service account

The plugin talks to the Unleash **Admin API**, so it needs a **service-account token**, not an
SDK token. This is provisioned by Terraform in
[`support/infrastructure/terraform/backstage.tf`](../../support/infrastructure/terraform/backstage.tf)
— a `unleash_service_account` with the built-in **Viewer** root role (read-only) plus a token.
Read the token and drop it into `.env`:

```bash
terraform -chdir=support/infrastructure/terraform output -raw backstage_unleash_token
```

- **Read-only by design.** The Viewer role means the UI displays flags but cannot toggle them.
  Enabling toggling would require a write-capable role for the SA, which contradicts this repo's
  rule that flag state is enforced server-side — keep it read-only.
- **Project visibility = the SA's access.** Viewer can see every project on the instance. To show
  a narrower set, give the SA a custom root role with explicit project access instead.

## Configuration

| Setting | Where | Notes |
| --- | --- | --- |
| `UNLEASH_URL` | `.env` → `unleash.url` | Instance base URL **without** `/api`. |
| `UNLEASH_API_TOKEN` | `.env` → `unleash.apiToken` | Service-account token (sent verbatim, no `Bearer`). |
| Catalog locations | `app-config.docker.yaml` | Owner group + the generated projects file. |
| Permissions | `app-config.yaml` | `permission.enabled: true` (required by the plugin). Backend uses the allow-all policy — fine for this read-only demo; swap for a real policy in production. |

## Resource footprint

- **1 container** (backend serves the frontend), **port 7007** only, no Postgres.
- **Image:** ~600–900 MB (slim Node 22 + backend bundle + prod `node_modules` incl. native
  `better-sqlite3`).
- **Build:** first build ~6–12 min (Yarn install + `tsc` + bundle); cached rebuilds ~1–3 min.
- **Runtime:** ~400–700 MB RAM, < 1 vCPU. State is ephemeral — the catalog regenerates each start.
- **Network:** outbound HTTPS to your Unleash instance only.
