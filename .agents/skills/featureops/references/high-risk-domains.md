# High-risk domains

The domain policies themselves — each domain's scope globs, default flag type, naming prefix, required actions, and any rollout override — are defined in the **active policy** (see the *Active policy* section of `SKILL.md`; `references/policy-defaults.md` shows the shape and ships a worked `payments` example). Add or edit domains in your `.unleash/featureops.md` override, not here. This file covers *how* to apply a matching domain policy.

---

This file applies when a change touches files in a high-risk domain — a directory or module where release risk is high enough that **every change is flag-protected by default**.

## Applying a domain policy

When the change's path matches a domain's **Scope** glob in the active policy:

1. **Evaluate first**, following `evaluate-change.md`, before writing implementation code.
2. **Require a flag.** Do not implement the change without one, even for "small" or "obvious" edits — small changes in these domains have outsized impact.
3. **Use the domain's default flag type and naming prefix** from the policy.
4. **Include a realistic fallback** for every external call (a legacy path, a graceful failure message, or queue-and-retry). Hand to the user for review if no clear fallback exists.
5. **Test the fallback** — at least one test that exercises the flag-disabled path.
6. **Follow any extra required actions** the domain policy lists (for example, off in production and enabled in staging first).

If a change spans more than one domain, apply the stricter policy.

## Rollout for high-risk domains

For any change in a high-risk domain, use the active policy's **high-risk rollout override** — a more conservative ramp, longer holds, and stricter halt thresholds than the default. See `rollout-guidance.md` for the mechanics.

## Related

- Reusing and wrapping: `find-existing-flag.md`, `wrap-change.md`
- Rollout mechanics: `rollout-guidance.md`
- Defining the domains themselves: the active policy (`references/policy-defaults.md`)
- Automating evaluation on edit: the opt-in `PostToolUse` hook in the plugin repository's `hooks/` directory (https://github.com/Unleash/unleash-claude-skills/tree/main/hooks — not shipped inside this skill directory)
