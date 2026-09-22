# Self-paced Workshop: Setup and Teardown

The hands-on workshop, on your own Unleash instance, at your own pace. Everything the facilitator normally provisions for you, `make workshop-configure` will offer to create — after asking permission.

Once you're set up, you follow the same handouts as the virtual workshop, from Step 4 onward: [Virtual Workshop Steps Overview](../virtual-workshop/README.md).

## Steps

1. **Sign up for an [Unleash free trial](https://www.getunleash.io)** (14 days, **no credit card**). You'll be the instance's admin, which is what the next steps need.
2. **Clone this repository** and run `make workshop-pre-check`. It checks Node.js and picks your package manager (`pnpm`, or `npm` as the fallback), installs dependencies, and checks your machine: the tools we need (`curl`, `jq`), free app ports, and no stray Unleash variables in your shell. On Windows, run it from WSL2 or Git Bash ([README → Dependencies](../../../README.md#dependencies)).
3. **Create a Personal Access Token (PAT).** In the Unleash UI, open `https://<region>.app.unleash-hosted.com/<instance>/profile/personal-api-tokens` and create a token with an expiry that covers your session. On a fresh trial, you're an Admin, so it will carry the permissions the next steps need. Keep it handy.
4. **Run `make workshop-configure`.** It asks for your region and instance, takes the PAT, then looks for a project you own. On a fresh trial, there isn't one, so it will **ask your permission** to create a project and its feature flags. Say yes, and it provisions them, switches on the remote MCP server your AI assistant connects to later, creates the four SDK tokens, and fills `.env` for you.
   - Prefer to do that part by hand? Say no, and follow [manual-setup.md](manual-setup.md) instead.
5. **In another terminal, run `make dev`** (or `make docker-up`). Leave it running.
6. **Run `make workshop-final-check`.** It verifies the PAT, the SDK tokens, the app, your project, your release template, and that the remote MCP server is on — then prints your project ID, your flags URL, and the MCP `export` commands. Now start at [Step 4: Wire the MCP server to your assistant](../virtual-workshop/04-wire-mcp.md).
7. **When you're done, run `make workshop-teardown`** to delete everything it created — see [Tearing it down](#tearing-it-down).

## What's different from the facilitated workshop

**Your flags have no prefix.** In the facilitated workshop, hundreds of attendee projects share one Unleash instance, so each project prefixes its flags, segments, and context fields (`project-001` → `p001_internal-users`) — context-field names in particular are globally unique instance-wide. You own your instance, so there is nothing to collide with: your segment is just `internal-users`, and the promo-code flag is `rl_checkout-page_payment-section_promo-code`. Wherever a handout writes `<prefix>`, substitute nothing.

**You approve your own change requests.** Step 8 has you enable change requests on `production`, then open a change request. In the facilitated workshop, a facilitator approves it, because Unleash blocks non-admin self-approval — the segregation of duties is the lesson. As your instance's admin, you can approve and apply it yourself.

**No master kill switch.** That's facilitator tooling for flipping every attendee project at once, and it needs a Terraform-provisioned service account. It isn't provisioned here, and no workshop step depends on it.

## Using an existing Unleash instance

You can point this at an instance you already use, but two things change.

Your PAT must be able to **create a project** — it needs `ADMIN` or `CREATE_PROJECT`. `make workshop-configure` checks this before it tries, and stops with a clear message if your token is too narrow. Ask an Unleash admin for a token that can, or create the project by hand via [manual-setup.md](manual-setup.md).

And `make workshop-configure` will **never adopt a project it didn't create**. Provisioning writes four feature flags, two context fields, a segment, and a release template into a project; doing that to a real one you already depend on is not a decision a setup script gets to make for you. It lists what it found, explains why it won't guess, and offers to create a fresh project instead.

## Tearing it down

When you're done, run:

```bash
make workshop-teardown
```

It reads your instance URL, PAT, and project id from the `.env` that `make workshop-configure` filled, names the project, and asks before it changes anything. Then it **deletes your project** with everything in it:

- every feature flag — the workshop's own and any you created during the workshop. Unleash needs two steps for that, so they are archived first and then deleted from the archive, which also frees their names;
- the project release template, the segment, and the context fields;
- the four SDK tokens `make workshop-configure` created.

It also undoes the two instance-wide changes provisioning made: it deletes the global "Golden Release Rollout" example template and switches the remote MCP server off.

Afterwards you can start over: `make workshop-configure` finds no project and offers to create a fresh one, which switches the remote MCP server back on.

To tear down another instance or project, set `UNLEASH_BASE_URL`, `UNLEASH_ADMIN_TOKEN`, and `UNLEASH_PROJECTS` in front of the command. To do it by hand instead: archive every flag in the project, delete them from the project's archive, then delete the project in its settings.
