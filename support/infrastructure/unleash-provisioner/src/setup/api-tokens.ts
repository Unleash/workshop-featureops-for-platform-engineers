/**
 * The four project-scoped SDK tokens the app needs — one `frontend` (browser) and one `client`
 * (backend) token per environment — are not created here, nor by Terraform. Since Unleash 8.2 a
 * token's secret is returned only by the call that creates it (every list shows a short id instead,
 * which the SDK endpoints reject), so a token made ahead of time is useless to the attendee.
 * `make workshop-configure` creates them itself, as the attendee (a project Owner), and writes each
 * secret straight from the create response into .env.
 *
 * What is left here is the cleanup: destroy deletes those tokens (named `<project>-<web|api>-<env>`,
 * see workshop-configure.sh) so the project can be torn down, in both the facilitated and the
 * self-paced flow.
 */
import { unleashApi } from '../api';
import { ENVIRONMENTS } from '../config';

/** Name slugs, in step with the token names workshop-configure.sh gives the tokens it creates. */
const TOKEN_SLUGS = ['web', 'api'] as const;

interface ProjectToken {
  tokenName?: string;
  /** For a secure (8.2+) token, the short id DELETE expects — never the real secret. */
  secret?: string;
}

/** Delete the workshop's SDK tokens from a project (idempotent — missing tokens are fine). */
export const deleteProjectTokens = async (project: string): Promise<void> => {
  console.log(`[api-tokens] ${project}: deleting the SDK tokens ...`);
  const { status, data } = await unleashApi<{ tokens?: ProjectToken[] }>(
    `/projects/${project}/api-tokens`,
  );
  if (status !== 200) {
    console.warn(`[api-tokens] ${project}: could not list tokens (HTTP ${status.toString()}).`);
    return;
  }

  const names = new Set(
    ENVIRONMENTS.flatMap((environment) =>
      TOKEN_SLUGS.map((slug) => `${project}-${slug}-${environment}`),
    ),
  );
  const ours = (data.tokens ?? []).filter(
    (token) => token.tokenName !== undefined && names.has(token.tokenName) && token.secret,
  );
  if (ours.length === 0) {
    console.log(`[api-tokens] ${project}: no SDK tokens to delete.`);
    return;
  }
  for (const token of ours) {
    const { status: deleted } = await unleashApi(
      `/projects/${project}/api-tokens/${encodeURIComponent(token.secret ?? '')}`,
      { method: 'DELETE' },
    );
    console.log(
      `[api-tokens] ${project}: deleted "${token.tokenName ?? ''}" (HTTP ${deleted.toString()}).`,
    );
  }
};
