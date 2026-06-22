# Step 8: Lifecycle and Governance

It's time to close the loop: flags are inventory. You will retire another flag cleanly so they don't become debt at AI speed. [FeatureOps](https://featureops.io) recommends to treat feature flags as inventory, where the flag *type* carries lifecycle intent. For example, a `release` flag that has fully rolled out is ready for cleanup, while a `kill-switch` flag is meant to live indefinitely. Additionally, you will see the governance layer that provides a paved path in action, including Role-Based Access Control (_RBAC_), change requests, and auditability.

## Steps

- [ ] We have pre-picked the cleanup-worthy release: `pNNN_rl_checkout-page_payment-section_promo-code`. 
  - First, let's make sure it's rolled out in _development_ **AND** _production_, by enabling flag in both environments.
    - For the latter environment, we have to add that change to a _change request_ draft. Notice the **segregation of duties** (it's a feature, not a snag): you can **open** a production change request, but you **cannot approve your own**. Ask the facilitator/admin to approve and apply it (**workshop lecturer**, add that person as a **reviewer**, they are already part of your group).
- [ ] Verify the presence of the promotion code text box in both environments, and then mark the feature flag as completed, choosing to keep the feature.
  - You should hover over the _green lifecycle phase_ icon (_1_), and then click the button (_2_). 
    - ![Mark feature as completed](./assets/mark-as-completed.png)
  - After choosing "*keep the feature*"", you will see that the corresponding _lifecycle icon_ changed to _red_ color. You can hover over that icon (_1_) to learn more. 
    - ![Feature is ready to cleanup](./assets/ready-to-cleanup.png)
- [ ] Now, it's time to ask your AI coding assistant to use `cleanup_flag` on flags that are ready for cleanup.
  - The AI agent will generate safe-removal instructions for your fully rolled-out flag: remove the unused guarded branch, confirm the code path is clean, and then suggest to archive the flag in _Unleash_.
- [ ] Apply or just _review_ the cleanup _diff_ and verify the feature code is unguarded (or removed), and the flag is archived in your project.

## Outcome / success

Flag guardin the _promotion code_ functionality has completed its lifecycle. After the cleanup, the code path is clean, with the archive recorded in the audit log (which you can verify under this _URL_: `https://<REGION>.app.unleash-hosted.com/<INSTANCE_ID>/projects/<project-NNN>/logs`).

You have full control over who can change what, in which environment, gated by approvals, with proper auditability. This is enterprise-grade governance.

<details>
<summary><strong>Example prompt</strong>: Clean up the flag</summary>

```
Inspect flags that are ready to cleanup: fully rolled out and no longer needed. Use the unleash MCP server cleanup_flag tool to generate the safe removal steps, then remove the unused branch from the code, and confirm the code path is clean. Provide a recommendation is it safe to archive that flag or not, asssuming the provided changes will be applied and deployed.
```
</details>

## Tips and Tricks

> Notice the governance reveals: you've been acting as a **scoped, non-admin user**, and changing **production** requires a **change request**. The custom role, your access, and the _change request_ requirement were all provisioned via Terraform before you arrived.

> If you're short on time, the lifecycle management and `cleanup_flag` reveal is the takeaway. The RBAC, change requests, and audit logs are part of the short narration you can read above without clicking.
