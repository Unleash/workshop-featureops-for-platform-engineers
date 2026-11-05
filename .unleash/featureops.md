# FeatureOps policy — this repository

The project override for the `featureops` skill (vendored in `.agents/skills/featureops/`). It sets only the values that differ from the skill's defaults in `.agents/skills/featureops/references/policy-defaults.md`; anything left out falls back there. `AGENTS.md` stays the canonical guide for this repo: where the two overlap, they say the same thing.

## Parameters

### Flag naming

- **Convention:** the naming pattern the project enforces, `[<prefix>_]<rl|ex|op|kx|pm>_[v_]<domain>_<component>_<slug>`, such as `p001_rl_checkout-page_payment-section_promo-code`. It replaces the default `{domain}-{feature}`.
- **Prefix:** project-specific and optional. Read the pattern from the project with `inspect` before naming a flag, and ask the user when you can't. Never guess a prefix.
- **Type code:** `rl` release, `ex` experiment, `op` operational, `kx` kill switch, `pm` permission. Add `v_` only when the flag carries variants.
- **Kill switches** start with `kx_` and are named after what they turn off, such as `kx_checkout-page_headline_link-to-real-unleash-store`. Turning one on turns that thing off.
- **Searching the code:** a prefix may be added in code at runtime, so search for the unprefixed suffix.

### Flag types and expected lifetimes

Lifetimes are the defaults. One rule differs: a change that calls an external dependency does not get a kill switch of its own. Its release flag already turns it off (see [payments](#payments)).

### When to require a feature flag

Tiers and sizes are the defaults. In addition, these are exempt: `docs/`, `support/` and `other-examples/` (`AGENTS.md` keeps agents out of them), and test files (`*.test.ts`, `*.test.tsx`).

### Rollout — default

- **Environments, in order:** `development` → `production`. There is no `staging`, so no staging soak; let the change run in `development` first.
- **Milestones:** apply the project's release template, "Project Golden Release Rollout", with `release`: one canary user (the `<prefix>email` context field), then the `<prefix>internal-users` segment, then 50%, then everyone. Search release templates for its id.
- **Holds:** none fixed. Advance a milestone by hand once its safeguard has stayed quiet.

### Rollout — high-risk override

The same template and environments as the default. The stricter part is the halt threshold below.

### Halt thresholds

- The checkout API pushes `<prefix>checkout_error_total`. A safeguard on that metric pauses the milestone or turns the flag off on its own; set it up when applying the template.
- If you halt by hand, turn the flag off in that environment with `release`. Don't archive it.

---

## High-risk domains

The default `payments` example does not apply: its paths don't exist here. This repo has one high-risk domain.

### payments

- **Scope:** `src/gift-store/checkout/payments/**`, `src/payment-providers/**`, `src/gift-store/commerce/payment-providers.ts`, `src/gift-store/storefront/payments/PaymentProviderChooser.tsx`, `src/gift-store/storefront/payments/paymentProviders.ts`, `src/gift-store/storefront/checkout/Checkout.tsx`
- **Default flag type:** `release`, one flag per provider. No extra kill switch: the provider's release flag turns it off, and an unknown provider id already falls back to PayBro.
- **Naming:** `[<prefix>_]rl_<domain>_<component>_<slug>` per the project pattern, such as `rl_checkout-page_payment-section_dashed-provider`.
- **Required actions:**
  1. Evaluate first, before writing code, and report the tier.
  2. Require a flag, even for small changes.
  3. Register a provider through the `STRATEGIES` map in `src/gift-store/checkout/payments/router.ts`; never a `switch`.
  4. Enforce the flag in the checkout API. A browser or toolbar override must not turn the provider on by itself; the storefront check only shapes the UI.
  5. PayBro is the fallback while the flag is off.
  6. Write at least one test with the flag off.
  7. Create the flag disabled, and keep it off in `production` until the rollout reaches it.
- **Rollout override:** the high-risk override above.
