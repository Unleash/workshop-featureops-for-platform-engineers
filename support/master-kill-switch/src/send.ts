/**
 * Core sender for the master kill switch. Reads the signal endpoint URL + token (minted by the
 * unleash-provisioner into the repo-root handoff file, or overridden via env vars) and POSTs a
 * single token-authenticated signal. Per-project Unleash Actions react to it and turn every
 * project's SWAG-store-link kill switch off in development + production.
 *
 * Shared by the CLI (cli.ts) and the button webpage's backend (server.ts) so the token never leaves
 * the server.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Signal payload the per-project actions match on (data.intent) to validate the request. */
export const MASTER_KILL_SWITCH_INTENT = 'disable-swag-store-killswitch';

/** Signal envelope type, recorded on the Unleash signal/event timeline. */
const SIGNAL_TYPE = 'master-kill-switch';

/** Repo-root handoff file the provisioner writes the signal URL + token to. */
const HANDOFF_FILE = '.master-kill-switch.json';

// Repo root, three levels up from this file's src/ directory.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export interface SignalTarget {
  url: string;
  token: string;
}

export interface FireResult {
  ok: boolean;
  status: number;
  body: string;
}

/**
 * Resolve the signal URL + token. Env vars win (handy for CI / one-off runs); otherwise read the
 * repo-root handoff file. Throws a clear, actionable error when neither is available.
 */
export const resolveTarget = (): SignalTarget => {
  const envUrl = process.env.MASTER_KILL_SWITCH_URL?.trim();
  const envToken = process.env.MASTER_KILL_SWITCH_TOKEN?.trim();
  if (envUrl && envToken) {
    return { url: envUrl, token: envToken };
  }

  const file = path.join(REPO_ROOT, HANDOFF_FILE);
  if (!fs.existsSync(file)) {
    throw new Error(
      `No signal target. Set MASTER_KILL_SWITCH_URL + MASTER_KILL_SWITCH_TOKEN, or provision the ` +
        `master kill switch first (writes ${HANDOFF_FILE} at the repo root).`,
    );
  }

  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<SignalTarget>;
  if (!parsed.url || !parsed.token) {
    throw new Error(`${file} is missing "url" or "token". Re-run the provisioner.`);
  }
  return { url: parsed.url, token: parsed.token };
};

/** Fire the master kill switch: one token-authenticated POST to the signal endpoint. */
export const fireMasterKillSwitch = async (
  reason = 'manual master kill switch',
): Promise<FireResult> => {
  const { url, token } = resolveTarget();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      type: SIGNAL_TYPE,
      data: {
        intent: MASTER_KILL_SWITCH_INTENT,
        reason,
        firedAt: new Date().toISOString(),
      },
    }),
  });

  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
};
