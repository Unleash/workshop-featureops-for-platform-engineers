/**
 * The instance-level signal endpoint that fires the master kill switch. A single token-authenticated
 * POST to it (see support/master-kill-switch) is fanned out by per-project Actions
 * (master-kill-switch-actions.ts) to turn every project's SWAG-store-link kill switch off.
 *
 * Signals/Actions are an Enterprise feature; if the API isn't available this fails SAFE — it warns
 * and returns null so the rest of provisioning still runs. The endpoint + token are idempotent
 * (reused when they already exist). The token is written to a repo-root handoff file the sender reads.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unleashApi } from '../api';
import { BASE_URL, MASTER_KILL_SWITCH_FILE, MASTER_KILL_SWITCH_SIGNAL } from '../config';

interface SignalEndpoint {
  id: number;
  name: string;
}

interface SignalEndpointToken {
  id: number;
  name: string;
  token?: string;
}

export interface MasterKillSwitchSignal {
  endpointId: number;
  token: string;
}

// Repo root, four levels up from this file's src/setup/ directory — where the handoff file lives.
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

/** Reuse the endpoint's first token, or mint a "provisioned-token" if it has none. */
const ensureToken = async (endpointId: number): Promise<string | undefined> => {
  const { status, data } = await unleashApi<
    { tokens?: SignalEndpointToken[] } | SignalEndpointToken[]
  >(`/signal-endpoints/${endpointId.toString()}/tokens`);

  if (status !== 200) {
    console.warn(
      `[mks] Could not list tokens (HTTP ${status.toString()}). Skipping token creation.`,
    );
    return undefined;
  }

  const tokens = Array.isArray(data) ? data : (data.tokens ?? []);
  if (tokens.length > 0) {
    console.log('[mks] Signal endpoint already has a token. Reusing it.');
    return tokens[0]?.token;
  }

  const { status: createStatus, data: created } = await unleashApi<SignalEndpointToken>(
    `/signal-endpoints/${endpointId.toString()}/tokens`,
    { method: 'POST', body: JSON.stringify({ name: 'provisioned-token' }) },
  );
  if (createStatus === 200 || createStatus === 201) {
    console.log('[mks] Minted a signal endpoint token.');
    return created.token;
  }
  console.warn(`[mks] Failed to mint signal token (HTTP ${createStatus.toString()}).`);
  return undefined;
};

/** Write the signal URL + token to the repo-root handoff file the sender reads. */
const writeHandoffFile = (token: string): void => {
  const target = path.join(REPO_ROOT, MASTER_KILL_SWITCH_FILE);
  const body = {
    url: `${BASE_URL}/api/signal-endpoint/${MASTER_KILL_SWITCH_SIGNAL}`,
    token,
  };
  try {
    fs.writeFileSync(target, `${JSON.stringify(body, null, 2)}\n`);
    console.log(`[mks] Wrote signal URL + token to ${target}`);
  } catch (error: unknown) {
    console.warn(`[mks] Could not write ${target}:`, error);
  }
};

/**
 * Create (or reuse) the master-kill-switch signal endpoint and its token. Returns null when the
 * Signals API is unavailable (non-Enterprise) so callers can skip the actions too.
 */
export const createMasterKillSwitchSignal = async (): Promise<MasterKillSwitchSignal | null> => {
  console.log('[mks] Provisioning the master-kill-switch signal endpoint ...');

  const { status, data } = await unleashApi<{ signalEndpoints?: SignalEndpoint[] }>(
    '/signal-endpoints',
  );
  if (status !== 200) {
    console.warn(
      `[mks] Signals API not available (HTTP ${status.toString()}; may require Enterprise). Skipping master kill switch.`,
    );
    return null;
  }

  const existing = (data.signalEndpoints ?? []).find((e) => e.name === MASTER_KILL_SWITCH_SIGNAL);
  let endpointId: number;
  if (existing) {
    console.log(`[mks] Signal endpoint "${MASTER_KILL_SWITCH_SIGNAL}" already exists.`);
    endpointId = existing.id;
  } else {
    const { status: createStatus, data: created } = await unleashApi<SignalEndpoint>(
      '/signal-endpoints',
      {
        method: 'POST',
        body: JSON.stringify({
          name: MASTER_KILL_SWITCH_SIGNAL,
          description:
            'Master kill switch: disable the SWAG-store-link kill switch in every project.',
          enabled: true,
        }),
      },
    );
    if (createStatus !== 200 && createStatus !== 201) {
      console.warn(`[mks] Failed to create signal endpoint (HTTP ${createStatus.toString()}).`);
      return null;
    }
    console.log(`[mks] Created signal endpoint "${MASTER_KILL_SWITCH_SIGNAL}".`);
    endpointId = created.id;
  }

  const token = await ensureToken(endpointId);
  if (!token) {
    console.warn(
      '[mks] No signal token available — the sender will not be able to fire. Skipping.',
    );
    return null;
  }
  writeHandoffFile(token);
  return { endpointId, token };
};

/** Delete the master-kill-switch signal endpoint (and its tokens) — idempotent. */
export const deleteMasterKillSwitchSignal = async (): Promise<void> => {
  const { status, data } = await unleashApi<{ signalEndpoints?: SignalEndpoint[] }>(
    '/signal-endpoints',
  );
  if (status !== 200) {
    console.warn(`[mks] Could not list signal endpoints (HTTP ${status.toString()}). Skipping.`);
    return;
  }
  const existing = (data.signalEndpoints ?? []).find((e) => e.name === MASTER_KILL_SWITCH_SIGNAL);
  if (!existing) {
    console.log(`[mks] Signal endpoint "${MASTER_KILL_SWITCH_SIGNAL}" already gone.`);
    return;
  }
  const { status: delStatus } = await unleashApi(`/signal-endpoints/${existing.id.toString()}`, {
    method: 'DELETE',
  });
  console.log(
    `[mks] Deleted signal endpoint "${MASTER_KILL_SWITCH_SIGNAL}" (HTTP ${delStatus.toString()}).`,
  );
};
