/**
 * The four project-scoped SDK tokens the app needs — one `frontend` (browser) and one `client`
 * (backend) token per environment. In the facilitated flow Terraform mints these (`tokens.tf`); the
 * self-paced flow has no Terraform, so the provisioner does it, reusing tokens.tf's naming
 * (`project-<id>-web-<env>` / `project-<id>-api-<env>`) so both flows look identical in the UI.
 *
 * `make workshop-configure` reads them straight back out of
 * `GET /projects/{id}/api-tokens` and writes them into .env — so nothing is returned from here.
 * Existing tokens are left alone: a token's secret is shown only at creation, and re-minting one
 * would silently invalidate the .env of an attendee who already configured their machine.
 */
import { unleashApi } from '../api';
import { ENVIRONMENTS } from '../config';

/** SDK token types, in the shape the app's .env expects. */
const TOKEN_TYPES = [
  { type: 'frontend', slug: 'web' },
  { type: 'client', slug: 'api' },
] as const;

interface ProjectToken {
  tokenName?: string;
  type?: string;
  environment?: string;
}

const existingTokens = async (project: string): Promise<ProjectToken[]> => {
  const { status, data } = await unleashApi<{ tokens?: ProjectToken[] }>(
    `/projects/${project}/api-tokens`,
  );
  if (status !== 200) {
    console.warn(
      `[api-tokens] ${project}: could not list existing tokens (HTTP ${status.toString()}).`,
    );
    return [];
  }
  return data.tokens ?? [];
};

/** Create any of the four (type, environment) SDK tokens that this project is missing. */
export const createProjectTokens = async (project: string): Promise<void> => {
  console.log(`[api-tokens] ${project}: minting the SDK tokens ...`);
  const existing = await existingTokens(project);

  for (const environment of ENVIRONMENTS) {
    for (const { type, slug } of TOKEN_TYPES) {
      const present = existing.some(
        (token) => token.type === type && token.environment === environment,
      );
      if (present) {
        console.log(`[api-tokens] ${project}: ${type}/${environment} token already exists.`);
        continue;
      }

      const tokenName = `${project}-${slug}-${environment}`;
      const { status } = await unleashApi(`/projects/${project}/api-tokens`, {
        method: 'POST',
        body: JSON.stringify({ tokenName, type, environment, projects: [project] }),
      });

      if (status === 200 || status === 201) {
        console.log(`[api-tokens] ${project}: created "${tokenName}" (${type}/${environment}).`);
      } else {
        console.warn(
          `[api-tokens] ${project}: failed to create "${tokenName}" (HTTP ${status.toString()}).`,
        );
      }
    }
  }
};
