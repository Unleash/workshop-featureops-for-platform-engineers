import { unleashApi } from '../api';
import { CR_ENVIRONMENTS, REQUIRED_APPROVALS } from '../config';

/** One environment's change-request configuration, as returned by the project-scoped GET. */
interface ChangeRequestConfig {
  environment: string;
  changeRequestEnabled: boolean;
  requiredApprovals?: number | null;
}

/**
 * Toggle change requests for one (project, environment). Mutating flags in a change-request-
 * guarded environment files a DRAFT change request instead of applying, so we lift the guard,
 * mutate, then put back exactly what was there before.
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

/**
 * Read a project's per-environment change-request configuration.
 *
 * Returns `null` — NOT an empty list — when the endpoint is unavailable (e.g. non-Enterprise, or a
 * token that can't read it). The distinction is load-bearing: "no environment is guarded" and "we
 * have no idea which environments are guarded" call for opposite behaviour in the caller.
 */
export const readChangeRequestConfig = async (
  project: string,
): Promise<ChangeRequestConfig[] | null> => {
  const { status, data } = await unleashApi<ChangeRequestConfig[]>(
    `/projects/${project}/change-requests/config`,
  );
  if (status !== 200 || !Array.isArray(data)) {
    console.warn(
      `[change-requests] ${project}: could not read the current config (HTTP ${status.toString()}).`,
    );
    return null;
  }
  return data;
};

/**
 * Run `mutate` with change requests lifted on a project's guarded environments, then RESTORED TO
 * WHAT THEY WERE.
 *
 * Restoring the captured state — rather than a hard-coded `true` — matters in both directions.
 * Provisioning now leaves production unguarded (the attendee enables the guard themselves in step
 * 8), so forcing `true` here would hand them a guard they were supposed to switch on. And on
 * `destroy`, an attendee who *did* reach step 8 has the guard on; archiving their flags lifts it,
 * and we must put it back rather than silently clearing it.
 *
 * When the current state can't be read we do NOT assume "unguarded". A guard we failed to notice is
 * the one failure that is silent: the mutation would file a draft change request instead of
 * applying, and every call would still return a cheerful 2xx. So we disable defensively, and then
 * restore nothing — leaving an environment unguarded is loud and fixable; leaving flags un-created
 * is neither.
 */
export const withChangeRequestsDisabled = async <T>(
  project: string,
  mutate: () => Promise<T>,
): Promise<T> => {
  const before = await readChangeRequestConfig(project);
  const previous = new Map((before ?? []).map((config) => [config.environment, config]));
  const stateKnown = before !== null;

  if (!stateKnown) {
    console.warn(
      `[change-requests] ${project}: disabling change requests on ${CR_ENVIRONMENTS.join(', ')} ` +
        `defensively; they will NOT be restored (re-enable by hand if you had them on).`,
    );
  }

  for (const env of CR_ENVIRONMENTS) {
    if (!stateKnown || previous.get(env)?.changeRequestEnabled === true) {
      await setChangeRequests(project, env, false);
    }
  }
  try {
    return await mutate();
  } finally {
    if (stateKnown) {
      for (const env of CR_ENVIRONMENTS) {
        const config = previous.get(env);
        if (config?.changeRequestEnabled === true) {
          await setChangeRequests(
            project,
            env,
            true,
            config.requiredApprovals ?? REQUIRED_APPROVALS,
          );
        }
      }
    }
  }
};
