# FeatureOps policy — defaults

This file is the **single source of truth** for every tunable value the FeatureOps skill uses. The other reference files describe *how* to apply these values — they never restate the numbers. When a value is needed, it comes from **the active policy** (defined below, as overridden by your team).

## How to customize (don't edit this file)

Do **not** edit this file to customize the skill — in a plugin install it lives in a managed cache that a plugin update overwrites. Instead, create an **override file** and set only the values you want to change; anything you omit falls back to the defaults here.

- **Project override (recommended):** `./.unleash/featureops.md` — committed with the repo, travels with it, and **wins** over everything. Put repo-specific policy here, especially [High-risk domains](#high-risk-domains).
- **User override (optional):** `~/.unleash/featureops.md` — your personal cross-repo defaults.

**Precedence: project override → user override → these defaults.** Create `.unleash/featureops.md` and copy in only the section headings you want to change, editing the values under them (leave the rest out — they fall back here). The quickest way to get a full starting copy is to ask the agent — *"set up a FeatureOps policy override for this project"* — and it will write the file from this template. See the skill README for the fork-and-republish alternative if your whole company standardizes on one policy.

---

## Parameters

### Flag naming
- **Convention:** `{domain}-{feature}`, lowercase kebab-case, no underscores. `domain` matches the top-level `src/` directory. An experiment is one flag whose values are the arms, so arms don't go in the name.
- **Kill switches** are named after what they turn off: `disable-{domain}-{feature}`, such as `disable-payments-stripe`.
- **Unleash's own rule wins:** a project can enforce a naming pattern. Inspect the project and follow its pattern when it has one.

### Flag types and expected lifetimes
The common flag types, and how long each is expected to live before it's "potentially stale" (Unleash's product defaults; mirror any per-type changes you made in the Unleash admin UI):

| Type | Purpose | Expected lifetime |
|---|---|---|
| `release` | gradual feature rollouts | 40 days |
| `experiment` | A/B tests, multivariate experiments | 40 days |
| `operational` | short-term system toggles (caching, batching, rate limits) | 7 days |
| `kill-switch` | emergency shutoff for external/high-risk paths | permanent |
| `permission` | role- or tier-based access | permanent |

`kill-switch` and `permission` are **permanent** — never treated as stale or audited for removal. Default type when unsure: `release`. A change that calls an external dependency also gets a `kill-switch`, if the call has none yet, so the dependency can be cut off on its own.

### When to require a feature flag

A change takes the tier of the riskiest thing it does. Judge what the change does, not the words in it: fixing a typo in a login error message is Low, not Critical.

| Tier | Changes | Flag |
| --- | --- | --- |
| Critical | Authentication, authorization, sessions; payments, billing; security-sensitive code (encryption, hashing, input sanitization, CSRF/XSS protection); database schema changes, migrations, destructive queries | Required |
| High | New user-facing features; user-visible changes to existing behavior; new or changed API endpoints and contracts; calls to external services, webhooks, message queues; large changes | Required |
| Medium | New async work or background jobs; changes to shared state; performance-sensitive paths (caching, rate limiting, batching); medium changes | Ask the user, recommending a flag when the change reaches production traffic |
| Low | Bug fixes and refactors that keep behavior; small changes | Not needed |

- **Change size:** small is under 20 changed lines, medium 20 to 100, large over 100. The more lines a change touches, the more likely it hides a bug that only shows in production, where a flag can turn it off without a redeploy.
- **Exempt:** test code and documentation, such as `*.test.*`, `*_test.go` or `docs/`: they never run in production. Config files are exempt unless they change runtime behavior in a Medium or higher category, such as a rate limit or a cache setting.
- A change in a [high-risk domain](#high-risk-domains) always requires a flag, whatever its tier.

### Rollout — default
- **Milestones:** 10% → 50% → 100%
- **Holds:** 24h at the first milestone, 48h at each subsequent milestone
- **Advance when:** error rate healthy and p95 latency stable (see Halt thresholds for the numbers); at 50%, also no new regression reports
- **Environments, in order:** `development` → `staging` → `production`
- **Staging soak before production:** 24h with no regressions

### Rollout — high-risk override
Applies to any change in a [High-risk domain](#high-risk-domains):
- **Milestones:** 1% → 10% → 25% → 50% → 100%
- **Holds:** 48h at every milestone
- Halt thresholds are stricter (below)

### Halt thresholds
Pause the rollout immediately (turn the flag off in the affected environment; don't archive it) if, during a hold:
- **Error rate** exceeds **1%** (or 1.5× the pre-rollout baseline, whichever is higher). **High-risk: 0.1%.**
- **p95 latency** rises more than **20%** above the pre-rollout baseline.
- **User reports** of broken functionality arrive through any channel.
- **Downstream errors** (database, queue, third-party API) spike.

### Cleanup and staleness
- **No-activity window:** a flag with no SDK evaluation (`lastSeenAt`) for **30 days** in every environment where it is enabled is due for removal.
- **Age vs. type:** a flag older than its type's expected lifetime (see the table above) is overdue.
- **Permanent types (never audited):** `kill-switch`, `permission`.
- **Audit cadence:** weekly (more often during release-heavy periods).
- **Ownership:** the engineer who created a flag is responsible for removing it.

---

## High-risk domains

Directories or modules that carry enough release risk that **every change is flag-protected by default**. Each domain policy has: **Scope** (path globs) · **Default flag type** · **Naming prefix** · **Required actions** · optional **Rollout override**. Replace the `payments` example below with your team's real domains in your override file — this is the section most teams customize most.

### payments
- **Scope:** `src/payments/**`, `src/billing/**`
- **Default flag type:** `release`. A change that calls an external payment provider (Stripe, PayPal, Adyen, …) also gets a kill switch for that provider, if it has none.
- **Naming prefix:** `payments-` (e.g. `payments-stripe-integration`, `payments-refund-v2`); kill switches `disable-payments-` (e.g. `disable-payments-stripe`)
- **Required actions:**
  1. Evaluate first, before writing implementation code.
  2. Require a flag — even for "small" or "obvious" changes.
  3. Every external-provider call needs a realistic fallback (legacy provider, graceful failure, or queue-and-retry). Hand to the user if none is clear.
  4. Write at least one test that exercises the fallback (flag disabled).
  5. Keep the release flag **off in production**; enable it in staging first.
- **Rollout override:** use the high-risk ramp (1% → 10% → 25% → 50% → 100%, 48h holds, error halt at 0.1%).

<!-- Add more domains by copying the block above. A common second one is `auth`:
### auth
- **Scope:** `src/auth/**`, `src/middleware/auth*`, `src/session/**`
- **Default flag type:** `release` for new auth methods; `kill-switch` for identity-provider integrations
- **Naming prefix:** `auth-`
- **Required actions:** evaluate first; require a flag for any login/logout/session change; default off in production; roll out internal-first (target by employee email domain); have a documented rollback plan before 10%.
-->
