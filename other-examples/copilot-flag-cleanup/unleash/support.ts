/**
 * Shared helpers for the webhook register/unregister scripts. Deliberately a trimmed copy of the
 * patterns in `support/infrastructure/unleash-provisioner/src/{config,api}.ts` so this example
 * stays fully self-contained under `other-examples/` — it imports nothing from the workspace.
 */
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Load this example's own `.env` (copied from `.env.example`) when present. Values already in the
// shell — the same TF_VAR_* the provisioner uses — still work when no file is there.
const here = dirname(fileURLToPath(import.meta.url));
const envFile = join(here, '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

/** Strip a stray CR (Windows-edited .env) and surrounding whitespace from a value. */
const trim = (value: string): string => value.replace(/\r/g, '').trim();

const requireEnv = (name: string): string => {
  const value = trim(process.env[name] ?? '');
  if (value === '') {
    throw new Error(`Set ${name} — see .env.example in this directory.`);
  }
  return value;
};

// Drop a trailing slash and an accidental trailing /api so we always build exactly one /api/admin.
const normalizeBaseUrl = (raw: string): string => raw.replace(/\/+$/, '').replace(/\/api$/, '');

/** Admin base URL + token — the SAME TF_VAR_* the Terraform/provisioner flow already uses. */
export const BASE_URL = normalizeBaseUrl(requireEnv('TF_VAR_unleash_base_url'));
export const TOKEN = requireEnv('TF_VAR_unleash_token');

/** Where cleanup issues are opened (OWNER/REPO) and a token with `issues: write` there. */
export const GITHUB_REPO = requireEnv('GITHUB_REPO');
export const GITHUB_TOKEN = requireEnv('GITHUB_TOKEN');

/**
 * Well-known description we stamp on the addon, so register/unregister find exactly the integration
 * this example created (the webhook addon has no unique name field — we match on description).
 */
export const ADDON_DESCRIPTION =
  'FeatureOps example — feature-completed → GitHub issue (other-examples/copilot-flag-cleanup)';

export interface ApiResponse<T> {
  status: number;
  data: T;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Statuses worth retrying: rate limiting + transient gateway/availability errors.
const RETRYABLE = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 5;

/** Thin Unleash Admin API client (retry on rate-limit / transient 5xx), mirroring the provisioner. */
export const unleashApi = async <T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> => {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${BASE_URL}/api/admin${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: TOKEN },
    });

    if (RETRYABLE.has(response.status) && attempt < MAX_ATTEMPTS) {
      await sleep(500 * 2 ** (attempt - 1)); // 0.5s, 1s, 2s, 4s, …
      continue;
    }

    const text = await response.text();
    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = text as unknown as T;
    }
    return { status: response.status, data };
  }
};

export interface Addon {
  id: number;
  provider?: string;
  description?: string;
}

/** Find the addon this example created (matched by ADDON_DESCRIPTION), or undefined if absent. */
export const findExampleAddon = async (): Promise<Addon | undefined> => {
  const { status, data } = await unleashApi<{ addons?: Addon[] } | Addon[]>('/addons');
  if (status !== 200) return undefined;
  const addons = Array.isArray(data) ? data : (data.addons ?? []);
  return addons.find((addon) => addon.description === ADDON_DESCRIPTION);
};
