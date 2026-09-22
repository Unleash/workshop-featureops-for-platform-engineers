# FeatureOps AI coding agents guidelines

> **This is the canonical guideline for every AI coding assistant working in this repository.** Agent-specific files (`CLAUDE.md`, `.github/copilot-instructions.md`, Cursor/Kiro rules, `opencode.json`) all link or include this file, and Codex, GitHub Copilot, and Antigravity read it directly — edit rules here, once.

## Executive summary (read this first)

1. **Always pass the project explicitly.** The remote MCP server has no default project — every flag operation must name the project id. **Ask the user for their project id or name**, and never guess it: it may be `project-001`, `featureops-workshop`, or anything else. Never assume `default`, `001`, or `project-001`. Do not cheat by looking into `.env` or environment variables!
2. **Flag-gate risky changes.** Before changing **payments**, auth, data migrations, or external integrations, wrap the change behind an Unleash feature flag. Use the MCP server to evaluate and create the flag — don't ship a risky path unguarded.
3. **Give every new flag a unique name that matches the project's convention.** The shape is `[<prefix>_]<rl|ex|op|kx|pm>_[v_]<domain>_<component>_<slug>`. Whether there is a prefix, and what it is, depends on the project. **Read the project's enforced naming pattern** (via the MCP server, or the project's settings) before you name anything and derive the prefix from the project's name or number if it uses one. When scanning the codebase for existing flags, remember any prefix may be applied dynamically in the code, so search for the unprefixed suffix.
4. You **have to** ignore all the files that inside `docs/`, `support/` and `other-examples/` directories. Do not base your decisions, planning, implementation, based on the content available in those places!

The rest of this file is the detail behind those rules.

## 1. Project overview and technology

It is the _npm_/_pnpm_ workspace monorepo for an **unofficial FeatureOps gift store** — a feature-flagged checkout demo. Feature flags evaluate against a **remote (cloud) Unleash instance**; there is no local Unleash server.

| Package      | Path                           | Role                                                                                                                                |
| ------------ | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Checkout API | `src/gift-store/checkout`      | Fastify backend (:8081 for development, :8091 for production). Evaluates flags server-side, routes payments, pushes impact metrics. |
| Storefront   | `src/gift-store/storefront`    | React + Vite (:8080 for development, :8090 for production). Evaluates flags in the browser.                                         |
| Commerce     | `src/gift-store/commerce`      | Shared domain library (pricing, providers, types).                                                                                  |
| PayBro       | `src/payment-providers/paybro` | **A real payment provider** (:8400) — its own hosted page + webhook.                                                                |
| Dashed       | `src/payment-providers/dashed` | **A real payment provider** (:8401) — the modern alternative.                                                                       |

**PayBro and Dashed are imitating valid, first-class payment providers — do not treat them as mocks or fakes for this workshop.** They behave like standalone services with their own hosted payment pages, webhooks, and signature schemes. Treat them as you would use real providers (e.g., _Stripe_, _Adyen_, _PayPal_): real integrations behind the checkout's provider seam.

Tech: TypeScript, Fastify, React 19 + Vite, Tailwind v4, `unleash-client` (backend SDK) + `@unleash/proxy-client-react` (frontend), Vitest, ESLint/Prettier. Infrastructure as code: Terraform + a Node `unleash-provisioner` (`support/infrastructure/`).

Every assistant reaches the remote Unleash MCP server through a committed config file that reads `UNLEASH_MCP_SERVER_URL` and `UNLEASH_MCP_PAT_TOKEN` from the environment: Claude Code → `.mcp.json`, Cursor → `.cursor/mcp.json`, GitHub Copilot in VS Code → `.vscode/mcp.json`, GitHub Copilot CLI → `.github/mcp.json` (it never reads `.vscode/mcp.json`), Kiro → `.kiro/settings/mcp.json`, OpenCode → `opencode.json`, Antigravity CLI → `.agents/mcp_config.json` (remote servers use `serverUrl`), Codex → `.codex/config.toml` (literal URL).

## 2. What is implemented vs. intentionally not wired

**Implemented:**

- **Impact metrics** — `src/gift-store/checkout/support/impact-metrics.ts` pushes six counters via the SDK, each carrying the project's flag prefix (e.g. `p001_checkout_error_total`, or plain `checkout_error_total` in an unprefixed project).
- **Dashed failure injection** — `src/payment-providers/dashed/support/failure-injection.ts` (session-init failures all envs, capture failures in production) so a safeguard has a live error signal.
- **Release templates** — provisioned by `support/infrastructure/unleash-provisioner/src/setup/release-templates.ts`: in every project, the project-level **Project Golden Release Rollout**, whose first two milestones target the project's own `<prefix>email` context field and `<prefix>internal-users` segment; and, once for the whole instance, the global **Golden Release Rollout**, kept as a generic example. Project-level templates need Unleash 8.2+. Every cloud-hosted instance (the free trial included) already runs 8.2 or newer; only a self-hosted instance can be older, and there the global template is the fallback.

**Intentionally NOT wired (this is the workshop exercise — wire it behind a flag):**

- `src/gift-store/checkout/payments/router.ts` — the `dashed` strategy is commented out of the `STRATEGIES` map (only PayBro is registered; unknown ids fall back to PayBro).
- `src/gift-store/commerce/payment-providers.ts` — `DASHED_OPTION` exists but is absent from `PAYMENT_PROVIDERS`.
- `src/gift-store/storefront/payments/PaymentProviderChooser.tsx` — built but not mounted.
- `src/gift-store/storefront/checkout/Checkout.tsx` — the provider is hardwired to PayBro.

When asked to "add a payment provider switch", this is the surface to change — and it MUST be flag-gated (see §3).

## 3. Domain rules

### Flag-gate risky changes (especially payments)

Payments, auth, data migrations, and external integrations always go behind a flag. The payment **extension seam** is the strategy factory in `src/gift-store/checkout/payments/router.ts` — the merchant never imports a provider's internals, so flag-gate **routing** there (for example, one provider per flag, or which options the chooser shows). Prefer adding a flag and wrapping the new code path over editing the hardwired default in place.

### MCP workflow

Use the Unleash MCP server tools in order: `evaluate_change` → `detect_flag` → `create_flag` → `wrap_change`. Run `detect_flag` **first** to avoid creating duplicates. When a flag has been at 100% across all environments, it's marked as _completed_ – then it is no longer necessary, and you use `cleanup_flag` to remove the dead code path. Flag _types_ carry lifecycle intent: a `release` flag is meant to be retired; a `kill-switch` (`kx`) flag is meant to live.

### Flag naming convention

Enforced by a naming pattern set on the project itself:

```
[<prefix>_]<rl|ex|op|kx|pm>_[v_]<domain>_<component>_<slug>
```

- `<prefix>` — **optional, and project-specific.** It exists only to keep flag, segment, and context-field names unique when many projects share one Unleash instance (context-field names are globally unique instance-wide). A workshop run with one project per attendee prefixes each with the project's number — `project-001` → `p001_`; someone working on their own instance has no prefix at all.
- type — `rl` release · `ex` experiment · `op` operational · `kx` kill-switch · `pm` permission.
- `v_` — optional marker, present only when the flag carries variants (orthogonal to type).
- Example: `p001_kx_checkout-page_headline_link-to-real-unleash-store`, or `kx_checkout-page_headline_link-to-real-unleash-store` in an unprefixed project.

**Never assume a prefix.** Read the project's naming pattern first and ask the user if you cannot. Whatever prefix a project uses applies equally to its segments and context fields.

### Project scoping (critical for the remote MCP)

The **remote** Unleash MCP server does **not** support a default-project setting (`UNLEASH_DEFAULT_PROJECT` only applies to the local stdio server). Every flag/segment operation must therefore **name the project id explicitly**. Ask the user for it. Never rely on an implicit / `default` project, and never infer the id from a flag name.

### Instance-level vs. project-level entities

Scope new resources correctly — do not try to make an instance-level entity project-scoped.

| Scope                                                     | Entities                                                                                                                                                                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Instance-level** (shared across all projects)           | Environments (`development`, `production`); tag types (e.g. `Layer`); **global release templates** (the Golden Release Rollout example); the remote MCP server toggle.                                                              |
| **Project-level** (carrying the project's prefix, if any) | Feature flags; the `internal-users` segment; the `region` and `email` context fields; **project release templates** (the Project Golden Release Rollout); project API tokens; change-request config; custom roles + project access. |

A release template that targets a project's segment or context fields must be a **project** release template — a global one cannot reference project-scoped entities.

### Engineering conventions

- Match the surrounding code's style, naming, and comment density.
- Keep the strategy seam intact: route via the map lookup in `router.ts`, never a `switch`.
- Flags are enforced **server-side** in the checkout API — a browser/toolbar override must never be able to grant gated behavior on its own.
- Keep `package.json` scripts shell-neutral: no `VAR=value cmd` prefixes. npm (and pnpm) run scripts through `cmd.exe` on Windows, where that syntax fails. Put environment in a config file (e.g. `vitest.config.ts` → `test.env`) or in the `Makefile`.
- Commands for people are `make` targets built on the `Makefile`'s `pm_*` macros, which pick pnpm or fall back to npm. Never document a raw `pnpm …` command as the only way; the root `build`/`test`/`typecheck` scripts are pnpm-only, and a raw `npm run build --workspaces` builds checkout before commerce.
