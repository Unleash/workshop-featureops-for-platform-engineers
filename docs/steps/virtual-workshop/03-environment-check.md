# Segment 3 — Setup: Environment Check

Get to a known-good state: the sample app running locally and your Unleash project reachable,
before any AI tooling is wired in.

## Steps

- [ ] Clone the repository and open it in your IDE.
- [ ] Copy `.env.example` to `.env` (or let `make` do it) and paste the values you were given:
      your project number (`UNLEASH_PROJECT_NUMBER`), the Unleash URLs, and the app tokens.
- [ ] Run `make all` — installs dependencies, builds, and starts the app on the host
      (`Ctrl+C` to stop). Docker is an alternative: `make docker-up`.
- [ ] In a second terminal, run `make self-check` to verify readiness.
- [ ] Confirm the storefront (http://localhost:8080) and checkout API
      (http://localhost:8081/health) respond.

## Outcome / success

`make self-check` prints your **project name (`project-NNN`)** and **flag prefix (`pNNN_`)** in the
banner and shows green checkmarks for the checks that apply to you — the app boots and (for
self-paced attendees) your project and its `development`/`production` environments exist. The
store loads in the browser. You're now at the same known-good starting line as everyone else,
ready to connect your AI assistant in Segment 4.

> This segment has no AI prompts — it's plain setup. Keep the app running for the rest of the
> workshop.
