# Step 7: Reversibility as a service: safeguards and kill switches

Make the rollout self-defending: a production-signal safeguard that pauses a bad release
automatically, plus the visceral one-click kill switch.

## Steps

- [ ] Confirm the app emits the impact metric by creating an *Impact Metrics* chart. The checkout SDK pushes
      `pNNN_checkout_error_total` (and related provider-error counters) to the shared instance.
- [ ] On your flag's release plan, add a **safeguard** that references your metric. Use a
      tight, easy-to-trip override — e.g. **count of `pNNN_checkout_error_total` > 0 in the last
      minute** — and a short evaluation window so it fires quickly.
- [ ] Walk the loop: with the rollout healthy, advance the milestone. Then **drive errors** —
      route checkouts through **Dashed** (the provider that injects failures) so the metric
      spikes.
- [ ] Watch the safeguard **pause the milestone progression** or **disable the environment** automatically — no one
      was staring at a dashboard.
- [ ] Alternatively, you can hit the **kill switch** via MCP tool `toggle_flag_environment` off — the feature 
      is globally off in seconds, no redeploy, no pipeline, no ticket needed.

## Outcome / success

You triggered an **automatic** safeguard pause from a real production signal **and** executed a
manual kill switch, observing both in the app and in the Unleash audit log. The opening
diagnostic becomes concrete: L3 (runtime/request) reversibility happens in **seconds** — bad
releases pause themselves, and a human can revert instantly, without touching code or CI.

<details>
<summary>Example prompt — the kill switch</summary>

```
The checkout error metric is spiking. Use toggle_flag_environment to turn my flag <FLAG_NAME>
off in the production environment of project "project-<NNN>" right now, and confirm it is off.
```
</details>

> The error signal is non-deterministic (Dashed fails a fraction of requests), so retry a few
> checkouts to make the metric cross the threshold. The kill-switch sub-step also works on its
> own if the safeguard is slow to fire.
