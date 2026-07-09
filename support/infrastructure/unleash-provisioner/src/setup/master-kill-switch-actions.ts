/**
 * Per-project Action that reacts to the master-kill-switch signal. Each project gets ONE action set
 * bound to the signal endpoint, validating the payload's intent string, with TWO actuator actions:
 * turn the SWAG-store-link kill switch OFF in development and in production. The action runs as the
 * Terraform-provisioned service account (resolved by username), whose custom role lets it skip
 * production change requests so the kill is instant.
 *
 * The kill switch is INVERTED (enabled = link hidden), so "disable the kill switch" is
 * TOGGLE_FEATURE_OFF — which makes the real store link reappear.
 */
import { unleashApi } from '../api';
import {
  MASTER_KILL_SWITCH_ACTOR_USERNAME,
  MASTER_KILL_SWITCH_INTENT,
  projectPrefix,
} from '../config';
import { killSwitchFlagName } from '../flags/flags';

interface ServiceAccount {
  id: number;
  username: string;
}

interface ActionSet {
  id: number;
  name: string;
}

/** Action set name for a project, e.g. p001_master-kill-switch_disable-swag-store-link. */
const actionName = (project: string): string =>
  `${projectPrefix(project)}master-kill-switch_disable-swag-store-link`;

/**
 * Resolve the numeric id of the Terraform-provisioned actor service account. Returns null when it's
 * missing (Terraform not applied) so callers can skip action creation.
 */
export const resolveActorId = async (): Promise<number | null> => {
  const { status, data } = await unleashApi<{ serviceAccounts?: ServiceAccount[] }>(
    '/service-account',
  );
  if (status !== 200) {
    console.warn(
      `[mks] Could not list service accounts (HTTP ${status.toString()}). Skipping actions.`,
    );
    return null;
  }
  const actor = (data.serviceAccounts ?? []).find(
    (a) => a.username === MASTER_KILL_SWITCH_ACTOR_USERNAME,
  );
  if (!actor) {
    console.warn(
      `[mks] Service account "${MASTER_KILL_SWITCH_ACTOR_USERNAME}" not found — run \`terraform apply\` first. Skipping actions.`,
    );
    return null;
  }
  console.log(`[mks] Master kill switch actor resolved (id=${actor.id.toString()}).`);
  return actor.id;
};

/** Create (idempotent) the master-kill-switch action set for one project. */
export const createMasterKillSwitchAction = async (
  project: string,
  endpointId: number,
  actorId: number,
): Promise<void> => {
  const name = actionName(project);

  const { status: listStatus, data: listData } = await unleashApi<{ actionSets?: ActionSet[] }>(
    `/projects/${project}/actions`,
  );
  if (listStatus === 200 && (listData.actionSets ?? []).some((a) => a.name === name)) {
    console.log(`[mks] ${project}: action "${name}" already exists. Skipping.`);
    return;
  }

  const flag = killSwitchFlagName(project);
  const toggleOff = (environment: string, sortOrder: number) => ({
    action: 'TOGGLE_FEATURE_OFF',
    sortOrder,
    executionParams: { project, environment, featureName: flag },
  });

  const body = {
    enabled: true,
    name,
    description: `Disable ${flag} in development + production on a master-kill-switch signal.`,
    match: {
      source: 'signal-endpoint',
      sourceId: endpointId,
      payload: {
        'data.intent': { operator: 'IN', values: [MASTER_KILL_SWITCH_INTENT] },
      },
    },
    actorId,
    actions: [toggleOff('development', 1), toggleOff('production', 2)],
  };

  const { status } = await unleashApi(`/projects/${project}/actions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (status === 200 || status === 201) {
    console.log(`[mks] ${project}: created action "${name}".`);
  } else {
    console.warn(
      `[mks] ${project}: failed to create action "${name}" (HTTP ${status.toString()}).`,
    );
  }
};

/** Delete the master-kill-switch action set for one project — idempotent. */
export const deleteMasterKillSwitchAction = async (project: string): Promise<void> => {
  const name = actionName(project);
  const { status, data } = await unleashApi<{ actionSets?: ActionSet[] }>(
    `/projects/${project}/actions`,
  );
  if (status !== 200) {
    console.warn(`[mks] ${project}: could not list actions (HTTP ${status.toString()}). Skipping.`);
    return;
  }
  const existing = (data.actionSets ?? []).find((a) => a.name === name);
  if (!existing) {
    console.log(`[mks] ${project}: action "${name}" already gone.`);
    return;
  }
  const { status: delStatus } = await unleashApi(
    `/projects/${project}/actions/${existing.id.toString()}`,
    { method: 'DELETE' },
  );
  console.log(`[mks] ${project}: deleted action "${name}" (HTTP ${delStatus.toString()}).`);
};
