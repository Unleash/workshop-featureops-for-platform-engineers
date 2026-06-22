# Step 5: Generate a change with a flag (with the agent)

Our goal for this step is to induce the *aha moment*: let the agent write a genuinely risky change **and wrap it in a feature flag** inside the same generation loop. The platform's guidelines steer it, you don't hand-hold.

## Steps

- [ ] We have pre-picked the flag-worthy feature: **a payment provider switch** (_PayBro_ ↔ _Dashed_). The MCP risk scorer rates payment changes as critical, so it reliably recommends a flag.
- [ ] Prompt your assistant to implement it, instructing it to evaluate risk *before* writing code and follow the recommended workflow (`evaluate_change → detect_flag → create_flag → wrap_change`).
- [ ] Read what the agent did: which flag **type** it chose and why (the risk score / reason in the tool output), and confirm it ran `detect_flag` first so it didn't duplicate an existing flag.
- [ ] Confirm the new flag exists in **your** project (`project-NNN`), **disabled**, with the code path wrapped but dark.
- [ ] Sanity-check the flag name against the convention: `p<NNN>_<rl|ex|op|kx|pm>_[v_]<domain>_<component>_<slug>`.

## Outcome / success

A new feature flag exists in your Unleash project, created by the agent and off by default.

The payment-provider-switch code is committed but **wrapped** behind it (the seam is `src/gift-store/checkout/payments/router.ts`). Deploying this code ships nothing to users until *you* turn the flag on: the risky change is decoupled from release, and the decoupling happened inside the generation loop, not as a manual afterthought.

<details>
<summary><strong>Example prompt</strong>: Implement the switch, flag-first</summary>

```
Add a payment provider switch so checkout can route to either PayBro or Dashed (both are real providers in this repo; integration for Dashed is present in the code, but not yet wired). Before writing any code, use the Unleash MCP server: first evaluate_change to decide whether this needs a feature flag, detect_flag to avoid duplicates, then create_flag and wrap_change (in the project available based on my permissions). Keep it disabled, and follow the repo's flag naming convention. Explain which flag type you chose and why.
```
</details>

<details>
<summary><strong>Example prompt</strong>: Review what the agent did</summary>

```
Summarize the change you just made: the flag name and type, why the risk scorer recommended a flag, the exact code path now guarded by it, and confirm the flag is disabled (in the project available based on my permissions).
```
</details>

## Tips and Tricks

> Keep the flag **off** at the end of this step. You'll give it a real rollout policy in the 6th step.

## Next step

[Step 6: Author the release policy](06-release-policy.md).
