/**
 * Registers the Unleash → GitHub webhook integration. On a `feature-completed` event, Unleash POSTs
 * to the GitHub Issues API and opens an issue labeled `unleash-flag-completed`. A GitHub Actions
 * workflow (see ../github/workflows/cleanup-flag.yml) then assigns @copilot, which cleans up the
 * flag's dead code via the Unleash MCP server.
 *
 * Idempotent: if our addon already exists (matched by ADDON_DESCRIPTION) we leave it in place.
 * Run with `npm run register` after `cp .env.example .env`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ADDON_DESCRIPTION,
  GITHUB_REPO,
  GITHUB_TOKEN,
  findExampleAddon,
  unleashApi,
} from './support';

const here = dirname(fileURLToPath(import.meta.url));
// The Mustache body Unleash renders per event and sends as the GitHub "create issue" request body.
const bodyTemplate = readFileSync(join(here, 'issue-body.mustache'), 'utf8');

const main = async (): Promise<void> => {
  if (await findExampleAddon()) {
    console.log('[webhook] Already registered — nothing to do.');
    return;
  }

  const { status } = await unleashApi('/addons', {
    method: 'POST',
    body: JSON.stringify({
      provider: 'webhook',
      enabled: true,
      description: ADDON_DESCRIPTION,
      // Fire only when a flag is marked complete — the signal that its code is ready to retire.
      events: ['feature-completed'],
      projects: ['*'],
      environments: [],
      parameters: {
        url: `https://api.github.com/repos/${GITHUB_REPO}/issues`,
        contentType: 'application/json',
        bodyTemplate,
        // GitHub auth + API version, sent on the webhook's outbound request.
        authorizationHeader: `Bearer ${GITHUB_TOKEN}`,
        customHeaders: JSON.stringify({ Accept: 'application/vnd.github+json' }),
      },
    }),
  });

  if (status === 200 || status === 201) {
    console.log(`[webhook] Registered → cleanup issues open in ${GITHUB_REPO}.`);
  } else {
    console.warn(`[webhook] Failed to register (HTTP ${status.toString()}).`);
    process.exitCode = 1;
  }
};

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
