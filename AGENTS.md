# FeatureOps AI coding agents guidelines

> **This is the canonical guideline for every AI coding assistant working in this repository.** Agent-specific files (`CLAUDE.md`, `.github/copilot-instructions.md`, Cursor/Kiro rules, the root `AGENTS.md`) all link or include this file — edit rules here, once.

## Executive summary (read this first)

1. **Flag-gate risky changes.** Before changing **payments**, auth, data migrations, or external integrations, wrap the change behind an Unleash feature flag. Use the MCP server to evaluate and create the flag — don't ship a risky path unguarded.
2. **Follow the flag naming convention.** Every flag, segment, and context field is prefixed with the attendee's project number and matches `p<NNN>_<rl|ex|op|kx|pm>_[v_]<domain>_<component>_<slug>`.
You can follow that convention when scanning the codebase when looking for flags, but keep in mind that `p<NNN>_` prefix may be added dynamically in the code.
3. **Always pass the project explicitly.** The remote MCP server has no default project — every flag operation must name the project id (`project-NNN`). Never assume `default`.
4. You **have to** ignore all the files that inside `docs/`, `support/` and `other-examples/` directories. Do not base your decisions, planning, implementation, based on the content available in those places!   
5. To detect the access to projects or specific project number you have access to, you can first find a specific flag in the code by the naming convention - and then use `get_flag_state` on it. Do not cheat by looking into `.env` or environment variables!

The rest of this file is the detail behind those three rules.

## 1. Project overview & technology

It is the _npm_/_pnpm_ workspace monorepo for an **unofficial FeatureOps gift store** — a feature-flagged checkout demo. Feature flags evaluate against a **remote (cloud) Unleash instance**; there is no local Unleash server.

| Package      | Path                           | Role                                                                                                                                |
|--------------|--------------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| Checkout API | `src/gift-store/checkout`      | Fastify backend (:8081 for development, :8091 for production). Evaluates flags server-side, routes payments, pushes impact metrics. |
| Storefront   | `src/gift-store/storefront`    | React + Vite (:8080 for development, :8090 for production). Evaluates flags in the browser.                                         |
| Commerce     | `src/gift-store/commerce`      | Shared domain library (pricing, providers, types).                                                                                  |
| PayBro       | `src/payment-providers/paybro` | **A real payment provider** (:8400) — its own hosted page + webhook.                                                                |
| Dashed       | `src/payment-providers/dashed` | **A real payment provider** (:8401) — the modern alternative.                                                                       |

**PayBro and Dashed are imitating valid, first-class payment providers — do not treat them as mocks or fakes for the purpose of this workshop.** They behave like standalone services with their own hosted payment pages, webhooks, and signature schemes. Treat them as you would use real providers (e.g., _Stripe_, _Adyen_, _PayPal_): real integrations behind the checkout's provider seam.

Tech: TypeScript, Fastify, React 19 + Vite, Tailwind v4, `unleash-client` (backend SDK) + `@unleash/proxy-client-react` (frontend), Vitest, ESLint/Prettier. Infrastructure as code: Terraform + a Node `unleash-provisioner` (`support/infrastructure/`).

## 2. What is implemented vs. intentionally not wired

**Implemented:**
- **Impact metrics** — `src/gift-store/checkout/support/impact-metrics.ts` pushes six project-prefixed counters via the SDK (e.g. `pNNN_checkout_error_total`,
  `pNNN_payment_provider_redirect_error_total`).
- **Dashed failure injection** — `src/payment-providers/dashed/support/failure-injection.ts` (session-init failures all envs, capture failures in production) so a safeguard has a live error signal.
- **Golden Release Rollout** — provisioned instance-wide by `support/infrastructure/unleash-provisioner/src/setup/release-templates.ts`.

**Intentionally NOT wired (this is the workshop exercise — wire it behind a flag):**
- `src/gift-store/checkout/payments/router.ts` — the `dashed` strategy is commented out of the `STRATEGIES` map (only PayBro is registered; unknown ids fall back to PayBro).
- `src/gift-store/commerce/payment-providers.ts` — `DASHED_OPTION` exists but is absent from `PAYMENT_PROVIDERS`.
- `src/gift-store/storefront/payments/PaymentProviderChooser.tsx` — built but not mounted.
- `src/gift-store/storefront/checkout/Checkout.tsx` — the provider is hardwired to PayBro.

When asked to "add a payment provider switch", this is the surface to change — and it MUST be flag-gated (see §3).

## 3. Domain rules

### Flag-gate risky changes (especially payments)

Payments, auth, data migrations, and external integrations always go behind a flag. The payment **extension seam** is the strategy factory in `src/gift-store/checkout/payments/router.ts` — the merchant never imports a provider's internals, so flag-gate **routing** there (for example: one provider per flag, or which options the chooser shows). Prefer adding a flag and wrapping the new code path over editing the hardwired default in place.

### MCP workflow

Use the Unleash MCP server tools in order: `evaluate_change` → `detect_flag` → `create_flag` → `wrap_change`. Run `detect_flag` **first** to avoid creating duplicates. When a flag has been at 100% across all environments, it's marked as _completed_ - then it is no longer needed, and you use `cleanup_flag` to remove the dead code path. Flag *types* carry lifecycle intent: a `release` flag is meant to be retired; a `kill-switch` (`kx`) flag is meant to live.

### Flag naming convention

Enforced by the project-level naming convention:

```
p<NNN>_<rl|ex|op|kx|pm>_[v_]<domain>_<component>_<slug>
```

- `<NNN>` — the attendee's zero-padded project number (e.g. `001`). Always present.
- type — `rl` release · `ex` experiment · `op` operational · `kx` kill-switch · `pm` permission.
- `v_` — optional marker, present only when the flag carries variants (orthogonal to type).
- Example: `p001_kx_checkout-page_headline_link-to-real-unleash-store`.

The same `pNNN_` prefix applies to segments and context fields.

### Project scoping (critical for the remote MCP)

The **remote** Unleash MCP server does **not** support a default-project setting (`UNLEASH_DEFAULT_PROJECT` only applies to the local stdio server). Every flag/segment operation must therefore **name the project id explicitly** — `project-NNN` for the attendee's project. Never rely on an implicit / `default` project.

### Instance-level vs. project-level entities

Scope new resources correctly — do not try to make an instance-level entity project-scoped.

| Scope                                              | Entities                                                                                                                                                                 |
|----------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Instance-level** (shared across all projects)    | Environments (`development`, `production`); tag types (e.g. `Layer`); **release plan templates** (incl. the Golden Release Rollout).                                     |
| **Project-level** (per attendee, `pNNN_`-prefixed) | Feature flags; segments (`pNNN_internal-users`); context fields (`pNNN_region`, `pNNN_email`); project API tokens; change-request config; custom roles + project access. |

### Engineering conventions

- Match the surrounding code's style, naming, and comment density.
- Keep the strategy seam intact: route via the map lookup in `router.ts`, never a `switch`.
- Flags are enforced **server-side** in the checkout API — a browser/toolbar override must never be able to grant gated behavior on its own.
