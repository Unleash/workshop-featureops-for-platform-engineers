# Step 8: Lifecycle and Governance

It's time to close the loop: flags are inventory. You will retire another flag cleanly so they don't become debt at AI speed. [FeatureOps](https://featureops.io) recommends to treat the flags as inventory, where the flag *type* carries lifecycle intent e.g., a `release` flag that has fully rolled out is meant to **die**, but a specific `kill-switch` flag is meant to live indefinitely. Additionally, you will see the governance layer that provides a paved path - like Role-Based Access Control (_RBAC_), change requests (_CRs_), and auditability - in action.

## Steps

- [ ] We have pre-picked the cleanup-worthy release: `pNNN_rl_checkout-page_payment-section_promo-code`. 
  - First, let's make sure it's rolled out in _development_ **AND** _production_, by enabling flag in both environments.
    - For the latter environment, we have to add that change to a _change request_ draft. Notice the **segregation of duties** (it's a feature, not a snag): you can **open** a production change request, but you **cannot approve your own**. Ask the facilitator/admin (**workshop lecturer**, add that person as a **reviewer**) — who shares your team group — to approve and apply it.
- [ ] Verify the presence of the promotion code text box in both applications, and then mark feature as completed - by choosing we will keep the feature.
  - You should hover over the _green lifecycle phase_ icon (_1_), and then click the button (_2_). 
    - ![Mark feature as completed](./assets/mark-as-completed.png)
  - After choosing the decision (*keep the feature*), you will see that _lifecycle icon_ changed to _red_ color - you can hover over that icon (_1_) to learn more. 
    - ![Feature is ready to cleanup](./assets/ready-to-cleanup.png)
- [ ] Now, it's time to ask your assistant to use `cleanup_flag` on flags ready to clean.
  - Agent should generate safe-removal instructions for your fully rolled-out flag: remove the now-dead guarded branch, confirm the code path is clean, and then suggest to archive the flag in _Unleash_.
- [ ] Apply or just _review_ the cleanup _diff_ and verify the feature code is unguarded (or removed), and the flag is archived in `project-NNN`.

## Outcome / success

Flag guarding _promotion code_ functionality has completed its lifecycle — and after the cleanup the code path is clean, with the archive recorded in the audi log (which you can verify that under this _URL_: `https://<REGION>.app.unleash-hosted.com/<INSTANCE_ID>/projects/<project-NNN>/logs`). You have full control over who can change what, in which environment, gated by approvals, with proper auditability - enterprise-grade governance story,

<details>
<summary><strong>Example prompt</strong>: Clean up the flag</summary>

```
Inspect flags in my project that are ready to cleanup: fully rolled out and no longer needed. Use the unleash MCP server's cleanup_flag to generate the safe removal steps, then remove the dead flag-guarded branch from the code, and confirm the code path is clean. Provide a recommendation is it safe to archive that flag or not - asssuming the provided changes will be applied.
```
</details>

## Tips and Tricks

> Notice the governance reveals: you've been acting as a **scoped, non-admin user**, and changing **production** requires a **change request** — the custom role, your access, and the _change request_ requirement were all provisioned via Terraform before you arrived.

> If you're short on time, the lifecycle management and `cleanup_flag` reveal is the takeaway — the RBAC, change requests, and audit logs are a part of the short narration you can read above without clicking.
