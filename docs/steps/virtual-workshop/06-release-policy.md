# Step 6: Author the release policy

Now it's time to move from *a flag exists* to *every change inherits a policy*. Let's apply organizations vetted release template so your flag rolls out in consistent, staged milestones instead of a hand-crafted strategy. At the same time, you will adjust the prepared template, to present that it is flexible enough to reflect project-specific requirements.

## Steps

- [ ] Locate your project-specific segment in the Unleash UI (segment with a name: `pNNN_internal-users`).
- [ ] Apply the **Golden Release Rollout** (provisioned for the whole instance) to the flag. 
  - It adds four milestones: **Canary (single user) → Internal users only → 50% of the whole userbase → Generally available** for everyone.
- [ ] Adjust the **first two** milestones for your project (the template says so in its description): set the canary user via `pNNN_email` project-specific context field, and the same to target internal users - either by a rule `pNNN_email` ending `@getunleash.io`, or by a segment you have located in the previous step. 
  - The last two milestones are generic — leave them, as initially organization prepared.
- [ ] Enable the flag in **development**, adjust the email accordingly in the DevTool sidebar and advance to the first milestone.
- [ ] Refresh the _development_ storefront as a targeted vs. an untargeted user and watch the feature appear for one and not the other (evaluated in-SDK).
  - Actual values for the contextual fields can be adjusted by the _Development Toolbar_ visible on the left side (dark background).

## Outcome / success

Your flag is running a **multi-milestone rollout** driven by the shared template — and adjusted to your project-specific needs. You can see it target the canary/internal user first and stay dark for everyone else, and you understand the contrast: the platform authored the rollout shape once (as code), and every future change in the project can inherit it. That's the paving.

## Tips and Tricks

> Release templates are defined programmatically **globally**, for the whole _Unleash_ instance. However, after applying - you are free to adjust the targeting criteria for the existing milestones structure defined as a paved path.
