# Remove a flag from the code

Delete a flag's checks so the code runs one path unconditionally, then retire the flag in Unleash. When a flag is due for removal comes from `audit-cadence.md`.

## 1. Decide which path stays

Start from committed code with passing tests, so any failure afterwards comes from the removal. Ask the user which path stays unless it is already clear. Inspect the flag first so you can explain each choice: where it is enabled, at what rollout, and its type.

| Outcome | Keep | Typical case |
| --- | --- | --- |
| Feature kept | The path that runs when the flag is on | A release rolled out to everyone |
| Feature discarded | The path that runs when the flag is off | An experiment that lost, a feature that was dropped |
| One variant won | That variant's branch | An experiment with several values |
| Kill switch retired | The path that runs when the switch is off | The dependency it cut off is gone or no longer needs a switch |

Record the outcome in Unleash by completing the flag, as kept (with the winning value, if any) or discarded. This doesn't change what SDKs get.

## 2. Find every reference

Search for the flag name in all its spellings, then for every wrapper, constant, config entry and hook that carries it (`flag-usage-patterns.md`). Include tests, mocks and fixtures, analytics or logging tags, and docs.

## 3. Remove each check

Read the whole file before editing. For each shape, with the on path kept:

| Shape | Before | After |
| --- | --- | --- |
| If/else | `if (on('x')) { A } else { B }` | `A` |
| Guard clause | `if (!on('x')) return; A` | `A` |
| Ternary | `on('x') ? a : b` | `a` |
| Logical and | `on('x') && a()` | `a()` |
| Logical or | `on('x') \|\| fallback()` | nothing |
| Rendering | `{on('x') ? <New /> : <Old />}` | `<New />` |
| Stored result | `const e = on('x'); if (e) { A }` | `A`, and the variable goes |
| Nested | `if (c) { if (on('x')) { A } }` | `if (c) { A }` |

With the off path kept, invert it: `B`, the guard's early exit, `b`, nothing, `fallback()`, `<Old />`.

Then remove what the flag leaves behind: imports, a wrapper or hook whose last caller this was, the flag's constant and config entry, and tests that only exercised the removed path. Delete those tests rather than patching them to pass. Keep the SDK setup unless no other flag uses it. Don't leave the check in place with a TODO.

## 4. Verify

1. Search for the flag name again. Only changelogs and history should match.
2. Build or type-check, and run the tests for the touched code. Re-record snapshots that captured the removed branch, on purpose.
3. Review nested or multi-condition removals by reading the result.

## 5. Retire the flag in Unleash

Archive the flag only after the change is deployed to production. An SDK returns off for an unknown flag, so archiving while deployed code still checks it switches production to the off path.

## 6. Report

Tell the user which files changed, how many checks were removed, any case that needs a human look, and the test result. Mention the flag name in the pull request so the removal can be found later.
