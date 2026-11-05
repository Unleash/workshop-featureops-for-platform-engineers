# Wrap a change behind a flag

Put new code behind a flag so it can be turned off in production without a redeploy. Which flag to use comes from `evaluate-change.md` and `find-existing-flag.md`; this file covers where the check goes and how it is written.

## The check runs on every request

A flag is only useful if toggling it takes effect at once. Put the check inside the code path that runs per request, per job run or per render, never around code that runs once at startup. A route registered only when the flag is on stays missing until a restart, however often the flag is toggled; register the route always and check the flag inside its handler.

The same rule applies to anything registered once:

| Registered at startup | Check instead |
| --- | --- |
| Routes, controllers, routers | Inside the handler, or in a middleware that is always mounted |
| Middleware | Inside the middleware, which is always mounted |
| Scheduled jobs, queue consumers | At the start of each run or each message |
| Dependency injection bindings | Inside the method that is called, or in a factory that resolves per call |
| Values read into a constant or config at boot | At the point of use |

A kill switch is an [inverted feature flag](https://docs.getunleash.io/guides/feature-flag-best-practices#strategies-for-large-organizations-implementing-feature-flags): turning it on disables the thing it is named after. While it is off, which is its normal state, the feature runs. That shapes the check:

- **The enabled branch holds the fallback**, and the code after it runs the feature. For `disable-payments-stripe`, the enabled branch charges through the legacy provider and returns; the code after it charges through Stripe.
- **Name it after what it turns off** (the policy's kill-switch naming, such as `disable-payments-stripe`), so the check reads as "is this disabled?" and the inversion is visible at the call site.
- **The SDK's default keeps the feature running.** SDKs return false for a flag they don't know or can't fetch, so the feature runs as normal if Unleash is unreachable. Confirm the default for the SDK in use with `docs`.

## Match the codebase

1. Search for existing flag checks (`flag-usage-patterns.md`) and read one whole file that uses them.
2. Copy what it does: the import, the client or wrapper it calls, the method, how it passes context, and the shape of the check (if block, guard clause, hook).
3. Ask `docs` for the patterns of the SDK the change runs on, named by language and framework (such as the Node.js SDK in an Express handler, or the React SDK in a component): how to check a flag, how to build and pass the context, and how to force a flag on or off in tests. Use its answer, not memory; imports, method names and options change between SDK versions. Where the codebase already has a pattern, the codebase wins and the docs fill the gaps.
4. If the codebase has no Unleash SDK set up, ask `docs` for that SDK's setup before writing it.

## Write both paths

- **Pass the context** the rollout needs, at least the user id, so a gradual rollout keeps each user on the same side across requests.
- **Design the off path.** When the flag is off, the old behavior runs. If there is no old behavior, return a clear failure, such as a 404 from the handler, not a silent no-op.
- **Keep the check next to the code it protects**, and check once per decision: evaluate the flag once and pass the result down rather than checking it in several layers.
- **Test both paths**: at least one test with the flag on and one with it off, using the SDK's test approach from `docs` when the codebase has none.
