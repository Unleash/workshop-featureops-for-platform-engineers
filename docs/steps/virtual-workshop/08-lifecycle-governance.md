# Segment 8 — Lifecycle + governance

Close the loop: retire the flag cleanly so flags don't become debt at AI speed, and see the
governance layer (RBAC + change requests) that was paved as code.

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

## Outcome / success

Your Segment-5 flag has completed its full lifecycle — **created by AI → rolled out → guarded →
reversed → retired** — and the code path is clean, with the archive recorded in the audit log. You
can articulate the governance story: who can change what, in which environment, gated by approval,
all as code (Git is the Layer-2 audit story; the Unleash audit log + change requests are Layer 3).

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
