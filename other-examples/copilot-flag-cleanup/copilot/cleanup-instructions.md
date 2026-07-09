<!-- Append this block to `.github/copilot-instructions.md` when you promote this example. It teaches the Copilot coding agent how to act on an ` unleash-flag-completed ` issue. The rest of the repo's flag rules already live in `AGENTS.md` — this only adds the cleanup (retirement) side. -->

## Automated flag cleanup

When you are assigned a GitHub issue labeled `unleash-flag-completed`, the flag named in the issue has been marked **completed** in Unleash and its code path is ready to retire. Drive the cleanup with the Unleash MCP server:

1. `detect_flag` — find every reference to the flag across the codebase.
2. `get_flag_state` — confirm the completion outcome so you keep the correct branch (the rolled-out/enabled path for a kept flag; the disabled path for a discarded one).
3. `cleanup_flag` — get framework-specific removal guidance for each file you edit.

Then:

- **Keep the surviving path and delete the flag check** — do not leave a dead `if` behind.
- **Preserve the strategy seam** in `src/gift-store/checkout/payments/router.ts` — route via the map lookup, never a `switch`.
- Remember flags are enforced **server-side**: the load-bearing removal is in the checkout API; a browser-only flag is UX and follows the backend.
- Update or remove the affected tests (drop flag-OFF cases, delete now-unused flag setup).
- Open one small, focused PR that links the issue.

**Always name the project explicitly on every MCP call** — the remote MCP server has no default project, and the id varies (`project-001`, `featureops-workshop`, …); take it from the issue, or ask. Flag names follow `[<prefix>_]<rl|ex|op|kx|pm>_[v_]<domain>_<component>_<slug>`, where the prefix is project-specific and may be absent — read the project's enforced naming pattern rather than assuming one.
