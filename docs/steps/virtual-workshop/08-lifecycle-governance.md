# Step 8: Lifecycle and Governance

Close the loop: retire the flag cleanly so flags don't become debt at AI speed, and see the
governance layer like Role-Based Access Control (RBAC) and change requests, that was a paved path.

## Steps

- [ ] Treat the flag as inventory: a `release` flag that has fully rolled out is meant to **die**
      (a `kill-switch` flag is meant to live — flag *type* carries lifecycle intent).
- [ ] Ask your assistant to use `cleanup_flag` to generate safe-removal instructions for your
      fully rolled-out flag: remove the now-dead guarded branch, archive the flag, and confirm the
      code path is clean.
- [ ] Apply the clean-up and verify the feature code is unguarded (or removed) and the flag is
      archived in `project-NNN`.
- [ ] Notice the governance reveals: you've been acting as a **scoped, non-admin user**, and
      changing **production** requires a **change request** — the custom role, your access, and
      the CR requirement were all provisioned via Terraform before you arrived.
- [ ] Notice the **segregation of duties** (it's a feature, not a snag): you can **open** a
      production change request, but you **cannot approve your own**. Ask the facilitator/admin
      (**wojtek.gawronski@getunleash.io**) — who shares your team group — to approve and apply it.

## Outcome / success

Your flag created in the 5th step has completed its full lifecycle — **created by AI → rolled out → guarded →
reversed → retired** — and the code path is clean, with the archive recorded in the audit log. You
can articulate the governance story: who can change what, in which environment, gated by approval,
all as code (Git is the Layer-2 audit story; the Unleash audit log and change requests are Layer 3).

<details>
<summary>Example prompt — clean up the flag</summary>

```
My flag <FLAG_NAME> in project "project-<NNN>" is fully rolled out and no longer needed. Use the
unleash MCP server's cleanup_flag to generate the safe removal steps, then remove the dead
flag-guarded branch from the code, archive the flag, and confirm the code path is clean.
```
</details>

> If you're short on time, the `cleanup_flag` reveal is the takeaway — the audit/RBAC reveal is
> a short narration you can read above without clicking.

> **The two escape hatches.** Only an **ADMIN** user can approve and apply *their own* change
> request — that's the deliberate exception to segregation of duties. Separately, a holder of the
> `SKIP_CHANGE_REQUEST` permission can bypass the change-request flow entirely (that's how the
> master-kill-switch actor from step 7 flips production off instantly). Everyone else opens a change
> request and a second person approves it.
