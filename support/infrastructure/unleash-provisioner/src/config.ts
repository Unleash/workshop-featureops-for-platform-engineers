/**
 * Configuration for the provisioner, read from the same admin credentials the rest of the
 * workshop's provisioning uses (TF_VAR_* in .env) plus the project id Terraform outputs.
 *
 * Deliberately mirrors the conventions of the (now retired) flag shell scripts so the
 * provisioning story stays uniform: admin base URL + admin token, change-request-guarded
 * production. The workshop creates one project per attendee, so this provisions a LIST of
 * projects (project-NNN, project-NNN+1, …) — every flag/context-field/segment name is prefixed
 * with that project's number.
 */

/** Strip a stray CR (Windows-edited .env) and surrounding whitespace from a value. */
const trim = (value: string): string => value.replace(/\r/g, '').trim();

const requireEnv = (name: string): string => {
  const value = trim(process.env[name] ?? '');
  if (value === '') {
    throw new Error(`Set ${name} — the provisioner requires it (no default).`);
  }
  return value;
};

// Drop a trailing slash and an accidental trailing /api so we always build exactly one
// /api/admin suffix (same normalization the import/delete scripts did).
const normalizeBaseUrl = (raw: string): string => raw.replace(/\/+$/, '').replace(/\/api$/, '');

const splitWords = (value: string): string[] => value.split(/\s+/).filter((word) => word !== '');

/** Admin base URL, everything before /api (e.g. https://us.app.unleash-hosted.com/<instance>). */
export const BASE_URL = normalizeBaseUrl(requireEnv('TF_VAR_unleash_base_url'));

/** Admin Service Account token or PAT with admin rights — never the app's SDK tokens. */
export const TOKEN = requireEnv('TF_VAR_unleash_token');

/** Every project to provision, from the `;`-separated Terraform output `project_ids`. */
export const PROJECTS = requireEnv('UNLEASH_PROJECTS')
  .split(';')
  .map(trim)
  .filter((id) => id !== '');

/** Derive a project's zero-padded number ("NNN") from its id ("project-NNN") for name prefixes. */
export const projectNumber = (project: string): string => project.replace(/^project-/, '');

/**
 * Bypass the create loop's "already provisioned" skip so every project is re-reconciled — needed
 * after editing the flag/context/segment definitions, since otherwise provisioned projects are
 * skipped and never pick up the change. Off by default (skip already-provisioned projects for speed).
 */
export const FORCE_PROVISION = ['1', 'true', 'yes'].includes(
  trim(process.env.UNLEASH_FORCE_PROVISION ?? '').toLowerCase(),
);

/** Environments to provision flags into. */
export const ENVIRONMENTS = splitWords(
  process.env.UNLEASH_ENVIRONMENTS ?? 'development production',
);

/** Environments guarded by change requests — lifted while we mutate, then restored. */
export const CR_ENVIRONMENTS = splitWords(process.env.UNLEASH_CR_ENVIRONMENTS ?? 'production');

/** Approvals to restore on guarded environments (matches Terraform's desired state). */
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
