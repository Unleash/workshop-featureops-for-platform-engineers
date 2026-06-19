# Step 3: Setup - Environment Check

Get to a known-good state: the sample app is running locally, and your Unleash project is reachable 
before any AI tooling is wired in.

## Steps

If you don't have the repository cloned already, or your `.env` file is missing:

- [ ] Clone the repository.
- [ ] Inside the repository, run `make setup` to install dependencies and create the `.env` file.

If you have done the above in advance, you can start here:

- [ ] We need to replace a few values inside `.env`: your project number (`UNLEASH_PROJECT_NUMBER`), 
      the Unleash URLs, and the app tokens.
- [ ] Now you can start the app by either `make dev` or `make docker-up` (remember about `make docker-down`).
- [ ] In a second terminal, run `make self-check` to verify readiness.
- [ ] Confirm the development storefront (http://localhost:8080) and 
      the checkout API (http://localhost:8081/health) respond.
- [ ] Confirm the production storefront (http://localhost:8090) and
      the checkout API (http://localhost:8091/health) respond.

## Outcome / success

`make self-check` prints your **project name (`project-NNN`)** and **flag prefix (`pNNN_`)** in the
banner and shows green checkmarks for the checks that apply to you — the app boots and (for
self-paced attendees) your project and its `development` / `production` environments exist. The
store loads in the browser. You're now at the same known-good starting line as everyone else,
ready to connect your AI assistant in the 4th step.

> This step has no AI prompts — it's a plain setup. Keep the app running for the rest of the workshop.
