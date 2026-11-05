---
name: featureops
description: Put code changes behind Unleash feature flags and take them out again. Decides whether a change needs a flag, finds an existing flag before creating one, wraps code so the flag works at runtime, plans progressive rollouts, removes flags from the code, and audits stale flags. Use when working with feature flags, feature toggles, rollouts, releases, experiments, kill switches or the Unleash MCP server. Team policy can be overridden per project in `.unleash/featureops.md`.
license: Apache-2.0
allowed-tools: mcp__unleash__search mcp__unleash__inspect mcp__unleash__evaluate mcp__unleash__audit mcp__unleash__docs mcp__plugin_unleash_mcp__search mcp__plugin_unleash_mcp__inspect mcp__plugin_unleash_mcp__evaluate mcp__plugin_unleash_mcp__audit mcp__plugin_unleash_mcp__docs
---

# Unleash FeatureOps

[FeatureOps](https://featureops.io) rests on one default: every change is reversible. If you can't turn it off, don't turn it on. This skill applies that default through the [Unleash MCP server](https://github.com/Unleash/unleash-mcp): it decides when a change needs a flag, how to wrap it, how to roll it out and when to take the flag out again.

## Setup check

The skill needs the Unleash MCP server. A plugin install registers it from the bundled `.mcp.json`; set these in the shell that starts your agent:

```bash
export UNLEASH_BASE_URL=https://your-instance.getunleash.io
export UNLEASH_PAT=your-personal-access-token
```

On any other install, connect the server yourself (see <https://github.com/Unleash/unleash-claude-skills>). If the Unleash tools are missing, tell the user to finish setup and stop rather than guessing flag state. Deciding, wrapping and removing work on the code alone and still apply.

## Active policy

Every tunable value (naming, flag types and lifetimes, when a flag is required, rollout milestones and holds, halt thresholds, staleness windows, high-risk domains) comes from the **active policy**. The reference files say how to apply the values and never restate them.

**Precedence, highest first: project override, user override, shipped defaults.** For each value, use the highest layer that sets it. The project override and the defaults are inlined below. If `~/.unleash/featureops.md` exists, read it and slot it between them.

**Project override**, `${CLAUDE_PROJECT_DIR}/.unleash/featureops.md`:
!`cat "${CLAUDE_PROJECT_DIR}/.unleash/featureops.md" 2>/dev/null || echo "(no project override; using user override and/or the defaults below)"`

**Shipped defaults**, `references/policy-defaults.md`:
!`cat "${CLAUDE_SKILL_DIR}/references/policy-defaults.md" 2>/dev/null || echo "(defaults file not found; load references/policy-defaults.md manually)"`

> If the two blocks above are empty or show a literal `` !`…` `` command, your agent doesn't run inline injection. Read the three files yourself and apply the same precedence.

## Workflow

Load the reference for the step you are on; a task that spans steps loads each in turn.

| Step | When | Load |
| --- | --- | --- |
| 1. Evaluate | Before implementing a change that might need a flag | `references/evaluate-change.md` |
| 2. Find | Before creating any flag | `references/find-existing-flag.md` |
| 3. Wrap | Putting code behind a flag | `references/wrap-change.md` |
| 4. Roll out | Turning a flag on, ramping percentages, halting | `references/rollout-guidance.md` |
| 5. Remove | Taking a flag out of the code | `references/remove-flag.md` |
| Audit | Finding flags due for removal | `references/audit-cadence.md` |
| High-risk paths | A change under a high-risk domain in the policy | `references/high-risk-domains.md` |

Present the plan and wait for the user's confirmation before any write to Unleash and before removing a flag from the code. A wrong rollout or a wrongly kept path changes production behavior.

## Unleash tools

The references describe what to do in Unleash; these are the tools that do it.

| To | Tool |
| --- | --- |
| Find projects, flags (by name or tag, lifecycle stage, staleness, creator), tags, segments | `search` |
| Read a flag in full: description, type, environments, targets, when SDKs last saw it | `inspect` |
| Check whether a user gets a flag, and what blocks it | `evaluate` |
| Create a flag or change its type, description, tags and links; complete, mark stale, archive or revive it | `manage_flag` |
| Turn a feature on or off, ramp a percentage, target audiences | `release` |
| Add or flip a kill switch | `kill_switch` |
| Run or stop an A/B test | `experiment` |
| Create segments (saved audiences), context fields, release templates; change project settings | `configure` |
| See what changed and who changed it | `audit` |
| Read the current Unleash and SDK docs | `docs` |

`release`, `kill_switch` and `experiment` create a flag that doesn't exist yet, with its type's defaults and no description. Follow step 2 before calling them with a new name, and create a new flag with `manage_flag` first so it gets the policy's type and a description.

The read-only tools (`search`, `inspect`, `evaluate`, `audit`, `docs`) are pre-approved in `allowed-tools`, under two names each: `mcp__unleash__*` for a standalone install with the server registered as `unleash`, and `mcp__plugin_unleash_mcp__*` for the plugin install. The write tools are never pre-approved. On agents that ignore `allowed-tools`, still never run a write tool without the user's confirmation.

## Migrations

When migrating flags from another system into Unleash, don't apply this skill's policy to the migrated flags: names, state and strategy parameters carry over unchanged. The policy applies to new flags, and to migrated ones once the migration is done.

## Customize for your team

Don't edit this skill's files: in a plugin install they live in a cache that updates overwrite. Put your policy in an override file, setting only the values you change:

- **Project (recommended):** `.unleash/featureops.md` in the repo. Committed with it, and wins over everything.
- **User:** `~/.unleash/featureops.md`, for personal defaults across repos.

`references/policy-defaults.md` lists every value and doubles as the template. Or ask the agent to "set up a FeatureOps policy override for this project".

## Metadata

- **License:** Apache-2.0
- **Privacy policy:** <https://www.getunleash.io/privacy-policy>
- **Support:** <support@getunleash.io>, or GitHub issues at <https://github.com/Unleash/unleash-claude-skills/issues>
- **Source:** <https://github.com/Unleash/unleash-claude-skills>
- **MCP server:** [`@unleash/mcp`](https://www.npmjs.com/package/@unleash/mcp) ([source](https://github.com/Unleash/unleash-mcp), Apache-2.0, maintained by Unleash (Bricks Software AS)); local stdio via `npx`, or remote Streamable HTTP at `https://<your-instance>/api/admin/mcp`
