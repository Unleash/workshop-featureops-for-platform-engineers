# Evaluate a change

Decide whether a change needs a feature flag before implementing it. The tiers, size bands and exemptions come from the **active policy** (*When to require a feature flag*); this file covers how to apply them.

## 1. Know the change

Read what is changing: the user's description, `git diff` (or `git diff --staged`), and the full files being touched. Without the surrounding code you can't tell whether a flag already covers it.

## 2. Skip exempt changes

If every changed file is exempt under the policy, no flag is needed. Stop here and say so.

## 3. Check for an enclosing flag

Look at the code around each change for a flag check that already covers it: an `if` block, a guard clause earlier in the function, a hook result used in rendering, a decorator on the class. If one does, the change ships under that flag: no new flag, and don't nest another flag inside it. Nested flags make rollouts hard to reason about.

When the shape of a check is unclear (a wrapper, a stored result, an indentation-scoped block), read `flag-usage-patterns.md`.

## 4. Assign a tier

1. If a changed path matches a high-risk domain's scope in the policy, follow `high-risk-domains.md`.
2. Otherwise take the tier from the policy's tier table, counting the change's size band, and act on its *Flag* column.

## 5. Report the verdict

Tell the user, in a few lines:

- **Verdict:** no flag, covered by `<flag>` at `file:line`, or a new flag is needed.
- **Tier** and the part of the change that set it.
- **If a new flag is needed:** a suggested name per the policy's naming convention, and its type.

## 6. Next step

- **No flag:** implement the change.
- **Covered by an enclosing flag:** implement inside it.
- **Flag needed:** find an existing flag before creating one (`find-existing-flag.md`), then wrap the change (`wrap-change.md`).
