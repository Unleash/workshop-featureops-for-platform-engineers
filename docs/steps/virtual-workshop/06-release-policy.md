# Step 6: Author the release policy

Now it's time to move from "_a flag exists_" to "_every change inherits a policy_". Let's apply a release template so your flag rolls out in consistent, staged milestones instead of a hand-crafted strategy. The platform has already prepared one for your project: it targets your project's own context field and segment, so you apply it as is.

## Steps

- [ ] Open your project's **Settings → Release templates** in the Unleash UI and find the **Project Golden Release Rollout** template.
  - It has four milestones: **Canary (single user) → Internal users only → 50% of the whole userbase → Generally available** for everyone.
  - The first two already point at your project: the canary is `canary@getunleash.io`, matched by your `<prefix>email` context field, and the internal users are your `<prefix>internal-users` segment (`<prefix>email` ending with `@getunleash.io`).
- [ ] Apply the **Project Golden Release Rollout** template to your flag in the **development** environment.
- [ ] Enable the flag in **development** and start the first milestone.
- [ ] In the _Development Toolbar_ on the left side (dark background), make the email `canary@getunleash.io` — type `canary` before the `@`, and switch the domain to `@getunleash.io`. Refresh the _development_ storefront, then compare with any other email: the feature appears for one and not the other (evaluated in-SDK).
- [ ] Advance to **Internal users only**, and check that any `@getunleash.io` email now sees the feature, while an `@example.org` one still does not.

## Outcome / success

Your flag is running a **multi-milestone rollout** driven by your project's template. You can see it target the canary user first, then internal users, and stay off for everyone else.

And you understand the contrast: the platform authored the rollout shape once (as code), wired to each project's own targeting, and every future change in the project can inherit it. That's the paving.

## Tips and Tricks

> There are two kinds of release templates. **Project-level** ones (like yours) live in one project and may use its segments and context fields. **Global** ones are shared by the whole _Unleash_ instance — the provisioned **Golden Release Rollout** is an example — and so can only use instance-wide concepts (its first two milestones target the built-in `userId`). Compare the two in the template picker.

> Project-level release templates need _Unleash_ 8.2 or newer. Every cloud-hosted instance — the workshop's and a free trial alike — already runs 8.2 or newer; only a self-hosted instance can be older. On such an instance, apply the global **Golden Release Rollout** instead and adjust its first two milestones yourself: set the canary user via your `<prefix>email` context field, and target internal users either by a rule on `<prefix>email` ending with `@getunleash.io` or by your `<prefix>internal-users` segment.

## Next step

[Step 7: Reversibility as a service: safeguards and kill switches](07-safeguards-killswitch.md).
