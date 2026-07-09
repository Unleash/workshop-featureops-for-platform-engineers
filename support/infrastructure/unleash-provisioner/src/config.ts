/**
 * Configuration for the provisioner, read from admin credentials plus the project id(s) to work on.
 *
 * Two callers, two shapes of the same thing:
 *   • the facilitated flow — `make unleash-create` passes TF_VAR_unleash_base_url /
 *     TF_VAR_unleash_token (already in .env for Terraform) and the `project_ids` Terraform output;
 *   • the self-paced flow — `make workshop-provision`, driven by workshop-configure.sh, passes
 *     UNLEASH_BASE_URL / UNLEASH_ADMIN_TOKEN (the attendee's own PAT) and a single project id.
 *
 * The self-paced attendee has no Terraform, so calling their credentials `TF_VAR_*` would be a lie —
 * hence the alias, with the TF_VAR_* names kept as the fallback.
 */

/** Strip a stray CR (Windows-edited .env) and surrounding whitespace from a value. */
const trim = (value: string): string => value.replace(/\r/g, '').trim();

const readEnv = (name: string): string => trim(process.env[name] ?? '');

const requireEnv = (name: string): string => {
  const value = readEnv(name);
  if (value === '') {
    throw new Error(`Set ${name} — the provisioner requires it (no default).`);
  }
  return value;
};

/** First non-empty of the given vars, else throw naming the preferred one and its fallbacks. */
const requireOneOf = (preferred: string, ...fallbacks: string[]): string => {
  for (const name of [preferred, ...fallbacks]) {
    const value = readEnv(name);
    if (value !== '') {
      return value;
    }
  }
  throw new Error(`Set ${preferred} (or ${fallbacks.join(' / ')}) — no default.`);
};

const isTruthy = (name: string): boolean =>
  ['1', 'true', 'yes'].includes(readEnv(name).toLowerCase());

// Drop a trailing slash and an accidental trailing /api so we always build exactly one
// /api/admin suffix (same normalization the import/delete scripts did).
const normalizeBaseUrl = (raw: string): string => raw.replace(/\/+$/, '').replace(/\/api$/, '');

const splitWords = (value: string): string[] => value.split(/\s+/).filter((word) => word !== '');

/** Admin base URL, everything before /api (e.g. https://us.app.unleash-hosted.com/<instance>). */
export const BASE_URL = normalizeBaseUrl(
  requireOneOf('UNLEASH_BASE_URL', 'TF_VAR_unleash_base_url'),
);

/** Admin Service Account token or PAT with admin rights — never the app's SDK tokens. */
export const TOKEN = requireOneOf('UNLEASH_ADMIN_TOKEN', 'TF_VAR_unleash_token');

/** Every project to provision, from the `;`-separated Terraform output `project_ids`. */
export const PROJECTS = requireEnv('UNLEASH_PROJECTS')
  .split(';')
  .map(trim)
  .filter((id) => id !== '');

/**
 * The prefix every flag, context field, segment, and action name in a project carries.
 *
 * Only Terraform-provisioned projects get one. They are named `project-NNN` and share a single
 * Unleash instance with up to a few hundred sibling projects, so their names must not collide —
 * context-field names in particular are globally unique across the instance. A self-paced attendee
 * owns their whole instance and names their project whatever they like, so there is nothing to
 * disambiguate against: their flags are unprefixed.
 *
 * The prefix is therefore always `p<digits>_` or the empty string — never anything else. That
 * invariant is what lets the checkout API reuse it verbatim as a Prometheus metric prefix
 * (`p001_checkout_error_total`), where a hyphenated slug would be an invalid metric name.
 */
export const projectPrefix = (project: string): string => {
  const digits = /^project-(\d+)$/.exec(project)?.[1];
  return digits === undefined ? '' : `p${digits}_`;
};

/**
 * Self-paced mode: the attendee's own instance, provisioned by `make workshop-provision` instead of
 * Terraform. Creates the project and its SDK tokens (Terraform's job in the facilitated flow), and
 * skips everything that assumes Terraform ran or that we own the whole instance: archiving the
 * built-in "Default" project, and the master kill switch (which needs a Terraform service account).
 */
export const SELF_PACED = isTruthy('UNLEASH_SELF_PACED');

/** Display name for a self-paced project, defaulting to its id. Ignored outside SELF_PACED. */
export const PROJECT_NAME = readEnv('UNLEASH_PROJECT_NAME');

/**
 * Bypass the create loop's "already provisioned" skip so every project is re-reconciled — needed
 * after editing the flag/context/segment definitions, since otherwise provisioned projects are
 * skipped and never pick up the change. Off by default (skip already-provisioned projects for speed).
 */
export const FORCE_PROVISION = isTruthy('UNLEASH_FORCE_PROVISION');

/**
 * Bypass the destroy loop's "no Layer sentinel → skip" guard so every project is torn down even
 * when its sentinel is missing (e.g. a create run interrupted before applyTags left orphans). Off
 * by default (skip projects we can't confirm the provisioner provisioned).
 */
export const FORCE_DESTROY = isTruthy('UNLEASH_FORCE_DESTROY');

/** Environments to provision flags into. */
export const ENVIRONMENTS = splitWords(
  process.env.UNLEASH_ENVIRONMENTS ?? 'development production',
);

/** Environments that MAY be guarded by change requests — lifted while we mutate, then restored. */
export const CR_ENVIRONMENTS = splitWords(process.env.UNLEASH_CR_ENVIRONMENTS ?? 'production');

/**
 * Approvals to restore on an environment we found guarded but whose `requiredApprovals` the API
 * didn't report. Provisioning no longer enables change requests anywhere (the attendee does that in
 * step 8), so this is a fallback, not a desired state.
 */
export const REQUIRED_APPROVALS = Number(process.env.UNLEASH_PROD_REQUIRED_APPROVALS ?? '1');

// --- Master kill switch (Signals + Actions) ------------------------------------------------------
// One instance-level signal endpoint; per-project actions react to it and turn the SWAG-store-link
// kill switch off in every environment. The actor is the Terraform-provisioned service account
// (resolved by username), and the intent string is what each action matches on to validate the
// signal before firing — see support/master-kill-switch for the sender.

/** Name of the single signal endpoint that fires the master kill switch. */
export const MASTER_KILL_SWITCH_SIGNAL = 'master-kill-switch';

/** Payload intent (data.intent) an incoming signal must carry for the actions to fire. */
export const MASTER_KILL_SWITCH_INTENT = 'disable-swag-store-killswitch';

/** Username of the Terraform-provisioned service account the actions run as (their `actorId`). */
export const MASTER_KILL_SWITCH_ACTOR_USERNAME = 'master-kill-switch-actor';

/** Repo-root file the provisioner writes the signal URL + token to, for the sender to read. */
export const MASTER_KILL_SWITCH_FILE = '.master-kill-switch.json';
