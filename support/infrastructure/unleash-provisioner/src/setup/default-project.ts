/**
 * Archive the built-in "Default" project so attendees only ever see their own project-NNN. Every
 * Unleash instance ships with a "Default" project (id `default`, lowercase, despite the display
 * name) — it is INSTANCE-level, not something Terraform or the per-attendee provisioning owns, so
 * this is archived/revived ONCE, outside the per-project loop, like the Layer tag type and the
 * Golden Release Rollout.
 *
 * Idempotent in both directions: archiving skips when `default` is already gone from the active
 * list, and reviving tolerates the project already being active / not found.
 */
import { unleashApi } from '../api';

const DEFAULT_PROJECT_ID = 'default';

/** GET active projects, tolerating either a bare array or a `{ projects: [...] }` envelope. */
const listProjectIds = async (): Promise<string[]> => {
  const { status, data } = await unleashApi('/projects');
  if (status !== 200) return [];
  const items = Array.isArray(data) ? data : ((data as { projects?: unknown[] }).projects ?? []);
  return items
    .filter((item): item is { id: string } => typeof (item as { id?: unknown }).id === 'string')
    .map((item) => item.id);
};

/** Archive the built-in Default project once (idempotent — already-archived is fine). */
export const archiveDefaultProject = async (): Promise<void> => {
  if (!(await listProjectIds()).includes(DEFAULT_PROJECT_ID)) {
    console.log('[default-project] "Default" already archived.');
    return;
  }
  const { status } = await unleashApi(`/projects/archive/${DEFAULT_PROJECT_ID}`, { method: 'POST' });
  if (status === 200 || status === 202) {
    console.log('[default-project] "Default" archived.');
  } else {
    console.warn(`[default-project] Failed to archive "Default" (HTTP ${status.toString()}).`);
  }
};

/** Revive the built-in Default project once (idempotent — already-active / missing is fine). */
export const reviveDefaultProject = async (): Promise<void> => {
  if ((await listProjectIds()).includes(DEFAULT_PROJECT_ID)) {
    console.log('[default-project] "Default" already active.');
    return;
  }
  const { status } = await unleashApi(`/projects/revive/${DEFAULT_PROJECT_ID}`, { method: 'POST' });
  console.log(`[default-project] Revived "Default" (HTTP ${status.toString()}).`);
};
