import { unleashApi } from '../api';
import { ENVIRONMENTS, projectPrefix } from '../config';
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
  return (
    status === 200 && Array.isArray(data.tags) && data.tags.some((tag) => tag.type === 'Layer')
  );
};

// --- Self-paced project creation (Terraform's job in the facilitated flow) ------------------------

interface InstanceEnvironment {
  name: string;
}

/**
 * The instance's environment names. `development` and `production` are instance-level and ship with
 * every Unleash instance — neither Terraform (which reads them via `data "unleash_environment"`) nor
 * this tool creates them. We only check they are there before claiming to enable them on a project.
 */
const instanceEnvironments = async (): Promise<string[]> => {
  const { status, data } = await unleashApi<{ environments?: InstanceEnvironment[] }>(
    '/environments',
  );
  if (status !== 200) {
    console.warn(`[projects] Could not list instance environments (HTTP ${status.toString()}).`);
    return [];
  }
  return (data.environments ?? []).map((environment) => environment.name);
};

/**
 * Create a project with ENVIRONMENTS enabled on it and change requests OFF.
 *
 * A freshly created project has NO environments enabled — that is why the facilitated flow needs two
 * `unleash_project_environment` resources in main.tf, and why flag writes 404 until they run. The
 * self-paced flow has no Terraform, so `createProjectSchema.environments` does that enabling in the
 * same call. `changeRequestEnvironments: []` leaves production unguarded: the attendee turns change
 * requests on themselves in step 8.
 *
 * Idempotent: an existing project (409) is reported and reused.
 */
export const createProject = async (project: string, name: string): Promise<boolean> => {
  const available = await instanceEnvironments();
  const missing = ENVIRONMENTS.filter((environment) => !available.includes(environment));
  if (available.length > 0 && missing.length > 0) {
    console.error(
      `[projects] ${project}: this instance has no ${missing.join(' / ')} environment(s). ` +
        `Create them (or set UNLEASH_ENVIRONMENTS) before provisioning — a project with no enabled ` +
        `environment cannot hold flags.`,
    );
    return false;
  }

  const { status } = await unleashApi('/projects', {
    method: 'POST',
    body: JSON.stringify({
      id: project,
      name: name === '' ? project : name,
      environments: ENVIRONMENTS,
      changeRequestEnvironments: [],
    }),
  });

  if (status === 200 || status === 201) {
    console.log(`[projects] Created "${project}" with ${ENVIRONMENTS.join(' + ')} enabled.`);
    return true;
  }
  if (status === 409) {
    console.log(`[projects] "${project}" already exists. Reusing it.`);
    return true;
  }
  console.error(`[projects] Failed to create "${project}" (HTTP ${status.toString()}).`);
  return false;
};

/**
 * The flag naming pattern enforced on a project, mirroring the one Terraform sets in main.tf. The
 * project prefix is `p<digits>_` or empty (see `projectPrefix`), so it needs no regex escaping.
 * Unleash anchors the pattern itself — supply it without ^…$ delimiters.
 */
const featureNaming = (project: string) => {
  const prefix = projectPrefix(project);
  const slug = '[a-z][a-z0-9-]*';
  return {
    pattern: `${prefix}(rl|ex|op|kx|pm)_(v_)?${slug}_${slug}_${slug}`,
    example: `${prefix}kx_checkout-page_headline_link-to-real-unleash-store`,
    description: `${prefix}<rl|ex|op|kx|pm>_[v_]<domain>_<component>_<slug>`,
  };
};

/**
 * Apply the project settings the create call can't carry: the flag naming pattern and the reference
 * links. This is `PUT /projects/{id}/settings` (updateProjectEnterpriseSettingsSchema) — NOT
 * `PUT /projects/{id}`, whose updateProjectSchema has no `featureNaming`.
 */
export const applyProjectSettings = async (project: string): Promise<void> => {
  const { status } = await unleashApi(`/projects/${project}/settings`, {
    method: 'PUT',
    body: JSON.stringify({
      featureNaming: featureNaming(project),
      linkTemplates: [
        {
          title: 'Source',
          urlTemplate: 'https://github.com/unleash/workshop-featureops-for-platform-engineers',
        },
        { title: 'Checkout Page (DEV)', urlTemplate: 'http://localhost:8080' },
        { title: 'Checkout Page (PROD)', urlTemplate: 'http://localhost:8090' },
      ],
    }),
  });

  if (status === 200 || status === 204) {
    console.log(`[projects] ${project}: applied the flag naming pattern and reference links.`);
  } else {
    console.warn(
      `[projects] ${project}: could not apply project settings (HTTP ${status.toString()}) — ` +
        `flags will still work, they just won't be name-checked.`,
    );
  }
};
