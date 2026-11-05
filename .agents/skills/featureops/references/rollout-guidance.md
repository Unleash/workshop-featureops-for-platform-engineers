# Rollout guidance

The numbers — milestones, hold durations, halt thresholds, environments, and the stricter high-risk override — come from the **active policy** (see the *Active policy* section of `SKILL.md`). This file covers *how* to run a rollout. Customize the numbers via `.unleash/featureops.md`, not by editing this file.

---

This file applies when rolling out feature flags.

Small batches beat big bangs: releasing to a slice of users and watching the metrics is safer than releasing to everyone and hoping. Progressive exposure limits blast radius and gives real feedback before full commitment.

## Progressive rollout

Advance a new release flag through the active policy's milestones, holding at each for the policy's hold duration and advancing only when its advance criteria are met. For a change in a high-risk domain, use the policy's **high-risk ramp** instead — more steps, longer holds, and stricter halt thresholds.

## Halt conditions

During any hold, watch the active policy's halt thresholds (error rate and p95 latency), plus user reports of broken functionality and spikes in downstream systems (database, message queue, third-party APIs). If any threshold is breached, pause immediately: turn the flag off in the affected environment, passing the targets it has now (inspect it first) so they are kept for when it resumes. Do **not** delete the flag — pausing preserves the rollout history for the postmortem. This is precision rollback: disable what is broken, leave everything else running.

## Per-environment activation

Enable a flag one environment at a time, in the active policy's environment order:

1. **development** — enable as soon as the flag is created; default-on for local testing.
2. **staging** — enable after integration tests pass against the new code path.
3. **production** — enable only after staging has run the new path for the policy's staging soak with no regressions.

Never enable in production before staging unless the user explicitly confirms (e.g. pre-positioning a kill-switch).

## Targeting strategies

A rollout can target more than a percentage:

- **Internal-first:** target by employee email domain or a `userType=employee` context attribute — use this before any external exposure.
- **Beta users:** target a named segment (a curated early-access list).
- **Geographic:** target by region for regulatory or capacity reasons.
- **Sticky percentage:** hash on `userId` so the same user sees consistent behavior across requests.

Always include a sticky identifier so the user experience is consistent across sessions.

Inspect the flag before changing a rollout, so the change starts from its current state.

## Related

- Creating the flag: `find-existing-flag.md`
- Removing the flag after a rollout reaches 100%: `remove-flag.md`
- High-risk domain policies (and their rollout override): the active policy — see `SKILL.md` and `high-risk-domains.md`
