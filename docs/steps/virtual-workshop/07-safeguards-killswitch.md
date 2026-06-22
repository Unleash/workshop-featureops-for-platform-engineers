# Step 7: Reversibility as a service: safeguards and kill switches

Let's make the rollout self-defending: a production-signal safeguard that pauses a bad release automatically, plus the visceral one-click kill switch. _Autonomous release management_ and _reversibility as a service_ at the application runtime layer.

## Steps

- [ ] Confirm the app emits the impact metric by creating an *Impact Metrics* chart. 
  - The checkout SDK pushes `pNNN_checkout_error_total` (and related provider-error counters) to the _Unleash_ instance.
- [ ] On your flag's release plan, add a **safeguard** that references your metric. 
  - Use a tight, easy-to-trip override — e.g. **count of `pNNN_checkout_error_total` > 0 in the last minute** — and a short evaluation window so it fires quickly.
- [ ] Walk the loop: with the rollout healthy, advance the milestone. 
  - Then **drive errors** — route checkouts through **Dashed**, as that provider fails occasionally, which will cause business metric to spike.
- [ ] Watch the safeguard trip — it happens automatically, no one had to babysit the dashboard.
  - Safeguard either **pause the milestone progression** or **disable the environment** automatically, depending on your choice above. 
- [ ] Alternatively, you can disable the flag via MCP tool `toggle_flag_environment` off, which allows you **kill switch** a misbehaving feature as a part of the agentic AI interaction.
  - In both cases, the affected feature is globally off in seconds, no redeploy, no pipeline, no ticket needed.

## Outcome / success

You triggered an **automatic** safeguard pause from a real production signal **and/or** disabled flag (in a _kill switch_ manner) via MCP tool, observing both in the app and in the Unleash audit log. The opening diagnostic becomes concrete: L3 (at runtime/request layer) reversibility happens in **seconds** — bad releases pause themselves, and a human can revert instantly, without touching code or CI.

<details>
<summary><strong>Example prompt</strong>: Disable the flag (in a _kill switch_ manner)</summary>

```
The checkout error metric is spiking. Use toggle_flag_environment to turn my flag <FLAG_NAME> off in the production environment of project "project-<NNN>" right now, and confirm it is off.
```
</details>

## Tips and Tricks

> The error signal is non-deterministic (Dashed fails a fraction of requests), so retry a few checkouts to make the metric cross the threshold. The kill-switch sub-step also works on its own if the safeguard is slow to fire.
