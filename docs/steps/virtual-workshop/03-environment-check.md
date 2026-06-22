# Step 3: Setup - Environment Check

Get to a known-good state: your `.env` is filled, the sample app is running locally, and your Unleash project is reachable before any AI tooling is wired in.

## Before the workshop (_homework_)

- [ ] Clone the repository.
- [ ] Inside the repository, run `make workshop-pre-check`.
  - It installs dependencies and checks your machine is ready: the tools we need (`curl`, `jq`), that the app ports are free (`8080`/`8081`/`8090`/`8091`/`8400`/`8401`), and that no stray Unleash variables are lurking in your shell.

## At the workshop

- [ ] **Create a Personal Access Token (PAT).**
  - In the Unleash UI, open `https://<region>.app.unleash-hosted.com/<instance>/profile/personal-api-tokens` (find `<region>` and `<instance>` in your Unleash Admin UI URL), and create a token with an  expiry that covers the workshop.
  - Keep it handy (and **don't lose it**) — you'll paste it in the next task below.
- [ ] **Run `make workshop-configure`.** It asks for your region and instance, asks you to paste the generated _PAT_, and then fills `.env` for you — the Unleash / Frontend / MCP URLs, your project number (auto-detected as the project you own, which it also stars for you), and all four SDK tokens.
  - No need to copy-paste individual values (except the _PAT_ generated previously).
- [ ] **Start the app** with `make dev` (or `make docker-up` - but then remember to run `make docker-down` at the end).
- [ ] In a second terminal, run `make workshop-final-check` to verify readiness.
- [ ] Confirm the development storefront (http://localhost:8080) and the checkout API (http://localhost:8081/health) respond.
- [ ] Confirm the production storefront (http://localhost:8090) and the checkout API (http://localhost:8091/health) respond.

## Outcome / success

`make workshop-final-check` ends with a clear verdict — **"You are good to go!"** (green), **"I found some warnings"** (yellow), or **"Something is broken"** (red) — followed by:
- a summary with your **project name (`project-NNN`)**
- your **flag prefix (`pNNN_`)**
- a clickable link straight to **your flags** in the Unleash UI
- application links (for _development_ and _production_ environments)
- ready-to-copy `export` commands for the MCP server (you'll use those in the next step).

The app boots, your project and its `development` / `production` environments exist, and the store loads in the browser.

You're now at the same known-good starting line as everyone else, ready to connect your AI assistant in the 4th step.

## Tips and Tricks

> This step has no AI prompts — it's a plain setup. **Keep the app running for the rest of the workshop**.

## Next step

[Step 4: Wire the MCP server to your assistant](04-wire-mcp.md).