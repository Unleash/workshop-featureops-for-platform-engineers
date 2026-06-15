import { unleashApi } from '../api';
import { CR_ENVIRONMENTS, REQUIRED_APPROVALS } from '../config';

/**
 * Toggle change requests for one (project, environment). Mutating flags in a change-request-
 * guarded environment files a DRAFT change request instead of applying, so we lift the guard,
 * mutate, then restore — ending CR-enabled to match Terraform's desired state.
 */
export const setChangeRequests = async (
  project: string,
  env: string,
  enabled: boolean,
  approvals: number = REQUIRED_APPROVALS,
): Promise<void> => {
  const body = enabled
    ? JSON.stringify({ changeRequestsEnabled: true, requiredApprovals: approvals })
    : JSON.stringify({ changeRequestsEnabled: false });

  const { status } = await unleashApi(
    `/projects/${project}/environments/${env}/change-requests/config`,
    { method: 'PUT', body },
  );

  console.log(
    `[change-requests] ${project}/${env} → enabled=${enabled.toString()} (HTTP ${status.toString()}).`,
  );
};

/** Run `mutate` with change requests lifted on a project's guarded environments, then restored. */
export const withChangeRequestsDisabled = async <T>(
  project: string,
  mutate: () => Promise<T>,
): Promise<T> => {
  for (const env of CR_ENVIRONMENTS) {
    await setChangeRequests(project, env, false);
  }
  try {
    return await mutate();
  } finally {
    for (const env of CR_ENVIRONMENTS) {
      await setChangeRequests(project, env, true);
    }
  }
};
