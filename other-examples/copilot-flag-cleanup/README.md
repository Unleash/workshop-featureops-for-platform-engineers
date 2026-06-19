# Automated feature-flag cleanup with GitHub Copilot

An **inert, self-contained example** of the retirement side of a flag's lifecycle: when a flag is
marked **completed** in Unleash, an automated pipeline opens a GitHub issue and the GitHub Copilot
coding agent opens a pull request that removes the flag's dead code path.

The rest of this repository teaches the _creation_ side (evaluate → detect → create → wrap). This
example shows the _cleanup_ side, and uses the repository's own promo-code release flag
(`pNNN_rl_checkout-page_payment-section_promo-code`) as the worked target — a `release` flag is
exactly the kind meant to be retired.

> **Nothing here runs until you enable it.** The workflow lives under `github/workflows/` (no
> leading dot), so GitHub Actions ignores it; no webhook is registered; the live promo-code code is
> untouched. See [How to enable](#how-to-enable-promote-to-main).

Based on Unleash's
[Automating Feature Flag Cleanup with GitHub Copilot](https://www.getunleash.io/blog/automating-feature-flag-cleanup-github-copilot)
and the [GitHub Copilot integration docs](https://docs.getunleash.io/integrate/github-copilot).

## What this is — the pipeline

```
1. Mark flag "completed" in Unleash        (developer action, in the Unleash UI)
2. Unleash fires a `feature-completed`      (the webhook this example registers)
   webhook → GitHub Issues API
3. GitHub opens an issue labeled            (issue-body.mustache renders the body)
   `unleash-flag-completed`
4. GitHub Actions workflow assigns          (github/workflows/cleanup-flag.yml)
   @copilot to the issue
5. Copilot reads the issue, uses the        (copilot/mcp.json + cleanup-instructions.md)
   Unleash MCP server (detect_flag,
   get_flag_state, cleanup_flag) and
   opens a cleanup PR
```

## Layout

| Path                                | Role                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `.env.example`                      | Local config for the webhook scripts — copy to `.env`.                       |
| `github/workflows/cleanup-flag.yml` | The Actions workflow (inert here). Copy to `.github/workflows/` to activate. |
| `copilot/mcp.json`                  | Unleash MCP server config for the Copilot cloud agent.                       |
| `copilot/cleanup-instructions.md`   | Cleanup policy to append to `.github/copilot-instructions.md`.               |
| `unleash/register-webhook.ts`       | Registers the `feature-completed` → GitHub-issue webhook.                    |
| `unleash/unregister-webhook.ts`     | Removes it (keeps the example reversible).                                   |
| `unleash/issue-body.mustache`       | The issue body Unleash renders per event.                                    |
| `example/sample-issue.md`           | What the auto-generated issue looks like.                                    |
| `example/expected-cleanup.md`       | The files a correct promo-code cleanup PR should touch.                      |

## How it relates to the live repo

It uses the **same remote** Unleash MCP server the repo already uses interactively (`.mcp.json` at
the repo root), with the same env-var names (`UNLEASH_MCP_SERVER_URL`, `UNLEASH_MCP_PAT_TOKEN`).
Only the _trigger_ differs: here the Copilot **cloud agent** runs non-interactively from a GitHub
issue instead of from your editor.

## What to configure

| Where                   | Name                                                             | Purpose                                                             |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| Repo **secret**         | `COPILOT_TRIGGER_TOKEN`                                          | Lets the workflow assign issues to `@copilot`.                      |
| Copilot **environment** | `COPILOT_MCP_UNLEASH_MCP_SERVER_URL` → `$UNLEASH_MCP_SERVER_URL` | Remote MCP server URL.                                              |
| Copilot **environment** | `COPILOT_MCP_UNLEASH_PAT_TOKEN` → `$UNLEASH_MCP_PAT_TOKEN`       | MCP server PAT.                                                     |
| Local `.env`            | `TF_VAR_unleash_base_url`, `TF_VAR_unleash_token`                | Admin API, for the webhook scripts (same as Terraform/provisioner). |
| Local `.env`            | `GITHUB_REPO`, `GITHUB_TOKEN`                                    | Where issues open + a token with `issues: write`.                   |

GitHub exposes MCP secrets to the Copilot environment only under the `COPILOT_MCP_` prefix, so map
the repo's existing variable names as shown above. Also ensure your org's **"MCP servers in
Copilot"** policy is on and the **Copilot coding agent** is enabled for the repository.

## How to enable (promote to main)

1. **Workflow** — copy `github/workflows/cleanup-flag.yml` → `.github/workflows/cleanup-flag.yml`.
2. **Instructions** — append `copilot/cleanup-instructions.md` to `.github/copilot-instructions.md`.
3. **MCP** — add `copilot/mcp.json` to the repo's Copilot cloud-agent config (repository
   **Settings ▸ Copilot ▸ Coding agent**, or `.github/copilot/mcp.json`).
4. **Webhook** — from `unleash/`:
   ```sh
   cp ../.env.example .env   # then fill it in
   npm install               # installs tsx
   npm run register          # creates the webhook   (npm run unregister removes it)
   ```
   Prefer a permanent home? Fold an idempotent `createIntegration()` / `deleteIntegration()` pair
   into `support/infrastructure/unleash-provisioner` — model it on
   `src/setup/release-templates.ts` (list-then-create-by-name) and wire it into `src/index.ts`'s
   `run()` and `src/destroy.ts`, like the other instance-level resources.

## Try it on the promo-code flag

With the four steps above done, mark `pNNN_rl_checkout-page_payment-section_promo-code` **completed**
in Unleash. Expect:

- an issue like [`example/sample-issue.md`](example/sample-issue.md), then
- a Copilot PR whose diff matches [`example/expected-cleanup.md`](example/expected-cleanup.md).

> ⚠️ **Merging that PR removes the repository's flagship promo-code demo.** Review and close it, or
> run the whole flow on a throwaway branch. This example never commits the removal itself — the PR
> is Copilot's live output, for a human to review.
