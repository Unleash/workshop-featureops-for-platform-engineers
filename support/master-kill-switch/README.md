# Master kill switch

One token-authenticated request disables the **Official Unleash Swag Store** link via kill switch flag `pNNN_kx_checkout-page_headline_link-to-real-unleash-store`) across **every** attendee project, in both `development` and `production` — instead of flipping each project by hand. This is facilitator tooling for the Terraform-provisioned `project-NNN` fleet, which is why the flag name carries a `pNNN_` prefix; it is not provisioned in the self-paced flow.

It is built on Unleash [Signals](https://docs.getunleash.io/concepts/signals) and [Actions](https://docs.getunleash.io/concepts/actions) (_Unleash Enterprise_ features):

```
 sender (CLI or button page)
        │  POST { type: "master-kill-switch", data: { intent: "disable-swag-store-killswitch" } }
        │  Authorization: Bearer <signal token>
        ▼
 signal endpoint  ──fan-out──▶  per-project Action (one per project)
   "master-kill-switch"            match data.intent, then:
                                   • TOGGLE_FEATURE_OFF in development
                                   • TOGGLE_FEATURE_OFF in production
                                   running as the "master-kill-switch-actor" service account
```

> The kill switch is **inverted** (ENABLED = the real store link is hidden). "Disable the kill switch" means `TOGGLE_FEATURE_OFF`, so the store link reappears.

## How the pieces are provisioned

| Piece                                                      | Where                                                                             | Notes                                                                                                                                                                 |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service account + custom toggler role + per-project access | **Terraform** (`support/infrastructure/terraform/service-accounts.tf`, `main.tf`) | The role grants `UPDATE_FEATURE_ENVIRONMENT` (dev + prod) and **`SKIP_CHANGE_REQUEST`** (prod) so the production kill is **instant**, not queued as a change request. |
| Signal endpoint + token, per-project Action sets           | **unleash-provisioner** (`src/setup/master-kill-switch-{signal,actions}.ts`)      | The Terraform provider can't express Signals/Actions; the provisioner creates them over the admin API and resolves the actor by username.                             |
| Signal URL + token handoff                                 | `.master-kill-switch.json` (repo root, git-ignored)                               | Written by the provisioner; read by this sender.                                                                                                                      |

`make unleash-create` runs both (Terraform, then the provisioner) and writes the handoff file.

## Firing it

CLI:

```bash
make master-kill-switch
# or: pnpm --filter master-kill-switch fire ["optional reason"]
```

Button webpage (token stays server-side):

```bash
make master-kill-switch-web   # then open http://localhost:8500
```

Either way, the per-project actions process in batches, up to **~60s** — the flags flip shortly after the signal is accepted. The signal and each action execution are recorded on the project's event/signal timeline.

### Configuration

The sender reads the signal URL and token from `.master-kill-switch.json`, or from the environment if set: `MASTER_KILL_SWITCH_URL`, `MASTER_KILL_SWITCH_TOKEN`. The web console port defaults to `8500` (`MASTER_KILL_SWITCH_PORT`).
