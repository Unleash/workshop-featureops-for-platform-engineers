# Self-paced workshop: setup

The hands-on workshop, on your own Unleash instance, at your own pace. Everything the facilitator normally provisions for you, `make workshop-configure` will offer to create — after asking permission.

Once you're set up, you follow exactly the same handouts as the virtual workshop, from Step 4 onward: [Virtual Workshop Steps Overview](../virtual-workshop/README.md).

## Steps

1. **Sign up for an [Unleash free trial](https://www.getunleash.io)** (14 days, no credit card). You'll be the instance's admin, which is what the next steps need.
2. **Clone this repository** and run `make workshop-pre-check`. It installs dependencies and checks your machine: the tools we need (`curl`, `jq`), free app ports, no stray Unleash variables in your shell.
3. **Create a Personal Access Token (PAT).** In the Unleash UI, open `https://<region>.app.unleash-hosted.com/<instance>/profile/personal-api-tokens` and create a token with an expiry that covers your session. On a fresh trial you're an Admin, so it will carry the permissions the next steps need. Keep it handy.
4. **Enable the remote MCP server** in the admin UI (`.../admin/mcp`). It is off by default, and your AI assistant connects to it in Step 4 of the workshop proper.
5. **Run `make workshop-configure`.** It asks for your region and instance, takes the PAT, then looks for a project you own. On a fresh trial there isn't one, so it will **ask your permission** to create a project, its feature flags, and four SDK tokens. Say yes, and it provisions them and fills `.env` for you.
   - Prefer to do that part by hand? Say no, and follow [manual-setup.md](manual-setup.md) instead.
6. **In another terminal, run `make dev`** (or `make docker-up`). Leave it running.
7. **Run `make workshop-final-check`.** It verifies the PAT, the app, your project, and that the remote MCP server is on — then prints your project id, your flags URL, and the MCP `export` commands. Now start at [Step 4: Wire the MCP server to your assistant](../virtual-workshop/04-wire-mcp.md).

## What's different from the facilitated workshop

**Your flags have no prefix.** In the facilitated workshop hundreds of attendee projects share one Unleash instance, so each project prefixes its flags, segments, and context fields (`project-001` → `p001_internal-users`) — context-field names in particular are globally unique instance-wide. You own your instance, so there is nothing to collide with: your segment is just `internal-users`, and the promo-code flag is `rl_checkout-page_payment-section_promo-code`. Wherever a handout writes `<prefix>`, substitute nothing.

**You approve your own change requests.** Step 8 has you enable change requests on `production`, then open one. In the facilitated workshop a facilitator approves it, because Unleash blocks non-admin self-approval — the segregation of duties is the lesson. As your instance's admin, you can approve and apply it yourself.

**No master kill switch.** That's facilitator tooling for flipping every attendee project at once, and it needs a Terraform-provisioned service account. It isn't provisioned here, and no workshop step depends on it.

## Using an existing Unleash instance

You can point this at an instance you already use, but two things change.

Your PAT must be able to **create a project** — it needs `ADMIN` or `CREATE_PROJECT`. `make workshop-configure` checks this before it tries, and stops with a clear message if your token is too narrow. Ask an Unleash admin for a token that can, or create the project by hand via [manual-setup.md](manual-setup.md).

And `make workshop-configure` will **never adopt a project it didn't create**. Provisioning writes four feature flags, two context fields, and a segment into a project; doing that to a real one you already depend on is not a decision a setup script gets to make for you. It lists what it found, explains why it won't guess, and offers to create a fresh project instead.

## Tearing it down

```bash
UNLEASH_BASE_URL="https://<region>.app.unleash-hosted.com/<instance>" \
UNLEASH_ADMIN_TOKEN="<your-PAT>" \
UNLEASH_SELF_PACED=1 UNLEASH_PROJECTS="<your-project-id>" \
  pnpm --dir support/infrastructure/unleash-provisioner destroy
```

This archives the flags and removes the segment and context fields. The project itself is left alone — it's yours, on your instance; delete it in the UI if you want it gone.
