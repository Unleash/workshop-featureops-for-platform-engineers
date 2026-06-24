import { unleashApi } from '../api';
import { killSwitchFlagName } from '../flags/flags';

/**
 * Cheap existence probe for a project. A 400-project run fires ~15–20 project-scoped calls per
 * project; if a project doesn't exist (e.g. Terraform hasn't created it, or UNLEASH_PROJECTS lists
 * a stale id) every one of those is wasted and, on a 429, retry-amplified. The create/destroy loops
 * call this first and skip the whole project when it's missing.
 *
 * `unleashApi` retries 429/5xx but NOT 404, so a missing project resolves in a single fast call,
 * while a transient 429 on the probe itself still backs off via the shared retry.
 */
export const projectExists = async (project: string): Promise<boolean> => {
  const { status } = await unleashApi(`/projects/${project}/overview`);
  return status === 200;
};

interface FeatureTags {
  tags?: { type: string; value: string }[];
}

/**
 * Cheap "is this project already provisioned?" probe — the inverse optimization to projectExists.
 * The create loop fires ~30 project-scoped calls per project; on a no-op re-run they all resolve to
 * 409 ("already exists") and are pure waste (~12k calls across 400 projects). This lets the loop skip
 * the whole per-project block after a single call.
 *
 * It checks for the Layer tag on the project's kill-switch flag: applyTags is the LAST of the four
 * per-project data steps (context-fields → flags → segments → tags), so the tag's presence means
 * those steps ran to completion. The skip is only an optimization — every step stays 409-idempotent,
 * so a false "not provisioned" (e.g. a run interrupted before tagging) just re-reconciles, and
 * UNLEASH_FORCE_PROVISION bypasses the skip entirely to push changed definitions into every project.
 */
export const projectProvisioned = async (project: string): Promise<boolean> => {
  const { status, data } = await unleashApi<FeatureTags>(
    `/features/${killSwitchFlagName(project)}/tags`,
  );
  return status === 200 && Array.isArray(data.tags) && data.tags.some((tag) => tag.type === 'Layer');
};
