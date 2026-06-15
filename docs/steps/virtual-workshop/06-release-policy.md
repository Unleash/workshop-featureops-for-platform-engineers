# Segment 6 — Author the release policy

Move from *a flag exists* to *every change inherits a policy*. Apply the org's vetted release
template so your flag rolls out in consistent, staged milestones instead of a hand-crafted
strategy.

## Steps

- [ ] Locate your project-specific segment in the Unleash UI (segment `pNNN_internal-users`).
- [ ] Apply the **Golden Release Template** (provisioned for the whole instance) to the flag. It
      adds four milestones: **Canary (single user) → Internal users only → 50% → Generally
      available** for everyone.
- [ ] Adjust the **first two** milestones for your project (the template says so in its
      description): set the canary user via `pNNN_email` project-specific context field, 
      and confirm the internal-users, either targeting by a rule `pNNN_email` ending `@getunleash.io`,
      or by a segment located in the previous step. The last two milestones are generic — leave them.
- [ ] Enable the flag in **development**, adjust the email accordingly in the DevTool sidebar and advance to 
      the first milestone.
- [ ] Refresh the storefront as a targeted vs. an untargeted user and watch the feature appear for
      one and not the other (evaluated in-SDK).

## Outcome / success

Your flag is running a **multi-milestone rollout** driven by the shared template — and adjusted to 
your project-specific needs. You can see it target the canary/internal user first and stay dark for
everyone else, and you understand the contrast: the platform authored the rollout shape once (as
code), and every future change in the project can inherit it. That's the paving.

> If the room is short on time, the presenter applies the template, and you follow along — the
> point is the *contrast*, not the clicking.
