# Audit cadence

When a flag is due for removal, and how to audit a project for such flags. The no-activity window, per-type expected lifetimes, permanent types, audit cadence and ownership come from the **active policy** (see `SKILL.md`). Removing a flag from the code is in `remove-flag.md`.

Most flags are temporary. A flag left in the code after its rollout is a branch nobody tests, and a switch that can turn old behavior back on by accident.

## When a flag is due

A flag is due for removal when any of these hold, strongest signal first:

1. **Someone marked it stale** in Unleash.
2. **Unleash marked it potentially stale**: it is older than its type's expected lifetime.
3. **It was completed**: someone recorded the feature as kept or discarded, which moves it to the `cleanup` lifecycle stage.
4. **No SDK has evaluated it** within the policy's no-activity window in every environment where it is enabled. If no client checks it, removing it changes no behavior.
5. **It serves everyone in production**, so the off path never runs there. Confirm with the user that the old path is no longer needed.
6. **The experiment has a winner.** This is the user's judgment, not metadata.

Skip flags whose type the policy marks permanent.

## Auditing

Run an audit on the policy's cadence, or when the user asks for one.

1. Search the project's flags that are stale, potentially stale or in the `cleanup` stage, then its flags in the `archived` stage: an archived flag can still be checked in the code. Search returns one page at a time; page until you have the total it reports.
2. Search rows already carry each flag's type, stage, creation date, creator and when SDKs last saw it per environment. Inspect a flag only to see who it serves, for signal 5.
3. For archived flags, search the code for the name. A match means the code still branches on a flag that is always off.
4. Skip permanent types.
5. Order the report: stale first, then archived but still in the code, then completed, then potentially stale, then longest without SDK activity.
6. Report, don't act. List each flag with why it is due and who created it. Note any flag whose environments show no SDK activity data rather than guessing. Remove a flag only when the user picks it, following `remove-flag.md`.
