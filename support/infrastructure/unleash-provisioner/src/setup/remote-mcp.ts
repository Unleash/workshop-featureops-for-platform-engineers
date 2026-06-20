/**
 * The instance-level remote (cloud) MCP server — the preferred way attendees connect their AI
 * coding assistant for this workshop (see .env.example). It is an INSTANCE-wide setting, not
 * something the Terraform provider or the per-attendee project provisioning can express, so it is
 * toggled ONCE, outside the per-project loop, like the Layer tag type and the Golden Release Rollout.
 *
 * The remote MCP server is an Enterprise feature; if the API isn't available this fails SAFE — it
 * warns and returns so the rest of provisioning still runs. Idempotent: the current state is read
 * first, so re-running (or tearing down twice) is a no-op.
 */
import { unleashApi } from '../api';

const SETTINGS_PATH = '/remote-mcp/settings';

interface RemoteMcpSettings {
  enabled: boolean;
}

/** Read the current remote MCP state. Returns null when the feature/API is unavailable. */
const readEnabled = async (): Promise<boolean | null> => {
  const { status, data } = await unleashApi<RemoteMcpSettings>(SETTINGS_PATH);
  if (status === 200 && typeof data.enabled === 'boolean') {
    return data.enabled;
  }
  console.warn(
    `[remote-mcp] Remote MCP settings not available (HTTP ${status.toString()}; may require Enterprise). Skipping.`,
  );
  return null;
};

/** POST the desired enabled state; treats 200/204 as success, anything else as a warning. */
const setEnabled = async (enabled: boolean): Promise<void> => {
  const { status } = await unleashApi(SETTINGS_PATH, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });
  if (status === 200 || status === 204) {
    console.log(`[remote-mcp] Remote MCP server ${enabled ? 'enabled' : 'disabled'}.`);
  } else {
    console.warn(
      `[remote-mcp] Failed to ${enabled ? 'enable' : 'disable'} remote MCP server (HTTP ${status.toString()}).`,
    );
  }
};

/** Enable the remote MCP server once (idempotent — already-enabled / non-Enterprise is fine). */
export const enableRemoteMcp = async (): Promise<void> => {
  const current = await readEnabled();
  if (current === null) return;
  if (current) {
    console.log('[remote-mcp] Remote MCP server already enabled.');
    return;
  }
  await setEnabled(true);
};

/** Disable the remote MCP server once (idempotent — already-disabled / non-Enterprise is fine). */
export const disableRemoteMcp = async (): Promise<void> => {
  const current = await readEnabled();
  if (current === null) return;
  if (!current) {
    console.log('[remote-mcp] Remote MCP server already disabled.');
    return;
  }
  await setEnabled(false);
};
