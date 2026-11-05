# Sample auto-generated issue

This is what the webhook opens in your repository when the promo-code flag is marked **completed** in Unleash. It is shown here for reference only — you do not create it by hand; Unleash does, via `issue-body.mustache`. The `@copilot` assignment is added by the GitHub Actions workflow once the `unleash-flag-completed` label lands.

> [!NOTE]
> `project-NNN` / `pNNN_` presented below are placeholders — your real issue carries your own project id, and your own flag prefix (which may be empty, in which case the flag is just `rl_checkout-page_payment-section_promo-code`).

---

**Title:** Clean up feature flag: pNNN_rl_checkout-page_payment-section_promo-code

**Labels:** `unleash-flag-completed`

**Body:**

> An Unleash flag has been marked **completed** and is ready for code cleanup.
>
> - **Flag:** `pNNN_rl_checkout-page_payment-section_promo-code`
> - **Project:** `project-NNN`
> - **Event:** `feature-completed`
>
> ## Cleanup steps (for the Copilot coding agent)
>
> 1. Run `search` for `pNNN_rl_checkout-page_payment-section_promo-code` in project `project-NNN`, then grep the codebase to find every reference.
> 2. Run `inspect` to confirm the completion outcome (which branch — enabled or disabled — to keep).
> 3. Run `docs` for guidance on removing a flag from code.
> 4. Remove the flag check and keep the rolled-out path. Preserve the strategy seam in `router.ts`.
> 5. Update the affected tests.
> 6. Open a small, focused PR that links this issue.
>
> _Always name the project (`project-NNN`) explicitly — the remote MCP server has no default project._

---
