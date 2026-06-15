/**
 * Configuration for the provisioner, read from the same admin credentials the rest of the
 * workshop's provisioning uses (TF_VAR_* in .env) plus the project id Terraform outputs.
 *
 * Deliberately mirrors the conventions of the (now retired) flag shell scripts so the
 * provisioning story stays uniform: admin base URL + admin token, change-request-guarded
 * production. The workshop creates one project per attendee, so this provisions a LIST of
 * projects (project-001, project-002, …) — every flag/context-field/segment name is prefixed
 * with that project's number.
 */

/** Strip a stray CR (Windows-edited .env) and surrounding whitespace from a value. */
const trim = (value: string): string => value.replace(/\r/g, '').trim();

const requireEnv = (name: string): string => {
  const value = trim(process.env[name] ?? '');
  if (value === '') {
    throw new Error(`Set ${name} — the provisioner needs the admin Unleash base URL and token.`);
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
export const PROJECTS = (process.env.UNLEASH_PROJECTS ?? 'project-001')
  .split(';')
  .map(trim)
  .filter((id) => id !== '');

/** Derive a project's zero-padded number ("001") from its id ("project-001") for name prefixes. */
export const projectNumber = (project: string): string => project.replace(/^project-/, '');

/** Environments to provision flags into. */
export const ENVIRONMENTS = splitWords(
  process.env.UNLEASH_ENVIRONMENTS ?? 'development production',
);

/** Environments guarded by change requests — lifted while we mutate, then restored. */
export const CR_ENVIRONMENTS = splitWords(process.env.UNLEASH_CR_ENVIRONMENTS ?? 'production');

/** Approvals to restore on guarded environments (matches Terraform's desired state). */
export const REQUIRED_APPROVALS = Number(process.env.UNLEASH_PROD_REQUIRED_APPROVALS ?? '1');
