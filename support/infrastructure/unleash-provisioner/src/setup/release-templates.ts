/**
 * Release templates — the vetted rollout shape every AI-generated change can inherit (workshop step
 * 6, "Author the release policy"). Two of them, neither expressible in the Terraform provider:
 *
 *   • PROJECT-level (Unleash 8.2+) — the "Project Golden Release Rollout", created in EVERY project.
 *     Its first two milestones already target that project's own concepts: the `<prefix>email`
 *     context field (one canary user) and the `<prefix>internal-users` segment. Step 6 applies it
 *     as is. A project-level template is visible only inside its project, so every project can
 *     carry the same name.
 *
 *   • INSTANCE-level — the "Golden Release Rollout", created/deleted ONCE for the whole instance,
 *     like the global Layer tag type. Kept as the org-wide example: an instance-level template
 *     cannot reference a project-scoped field or segment, so its first two milestones target the
 *     built-in `userId` and are meant to be adjusted per project when APPLIED to a flag (its
 *     description says as much). It is also step 6's fallback on an instance older than 8.2 —
 *     never a cloud-hosted one (those, a free trial included, all run 8.2+), only a self-hosted one.
 *
 * The last two milestones (50% of users → generally available) are generic and shared by both.
 */
import { unleashApi } from '../api';
import { projectPrefix } from '../config';
import { findSegment } from './segments';

const TEMPLATE_NAME = 'Golden Release Rollout';

// Kept faithful to the vetted `curl` payload (including the explicit milestone/strategy ids).
const TEMPLATE = {
  name: TEMPLATE_NAME,
  description:
    'This is a vetted template on how we are releasing software in our organization. Strategies for the first two milestones should be adjusted according to your project needs, next two milestones are generic - and most likely will not need any change.',
  milestones: [
    {
      id: 'a749d0ae-3fd0-40d1-94c6-56fc65da52b1',
      name: 'Canary deployment (single user)',
      sortOrder: 0,
      strategies: [
        {
          name: 'default',
          id: 'ad8131f3-3bb6-4d86-8b4f-2b1711eb14d4',
          title:
            'Enable feature only for a selected group of users, based on precise email targeting.',
          constraints: [
            {
              contextName: 'userId',
              caseInsensitive: false,
              inverted: false,
              operator: 'IN',
              values: ['example@getunleash.io'],
            },
          ],
          parameters: {},
          variants: [],
          sortOrder: 0,
        },
      ],
    },
    {
      id: '82b48c70-9979-4875-a814-546809fba612',
      name: 'Internal users only',
      sortOrder: 1,
      strategies: [
        {
          name: 'default',
          id: '6d266751-9ba0-4a8b-9969-3b1c33f1f26b',
          title: 'Enable feature for all internal users based on their email.',
          constraints: [
            {
              contextName: 'userId',
              caseInsensitive: false,
              inverted: false,
              operator: 'STR_ENDS_WITH',
              values: ['@getunleash.io'],
            },
          ],
          parameters: {},
          variants: [],
          sortOrder: 0,
        },
      ],
    },
    {
      id: 'e8c7d66d-9151-43be-b238-45f9920ed497',
      name: '50% of all users',
      sortOrder: 2,
      strategies: [
        {
          name: 'flexibleRollout',
          id: '42c58d19-fca3-4250-9f25-e4878a5ac851',
          title:
            'Feature will be available to the 50% of all users, and stickiness is based on user ID.',
          constraints: [],
          parameters: { rollout: '50', stickiness: 'default', groupId: '{{featureName}}' },
          variants: [],
          sortOrder: 0,
        },
      ],
    },
    {
      id: '0a1bbbd2-3730-4307-91d8-0abbaafaf02b',
      name: 'Generally available',
      sortOrder: 3,
      strategies: [
        {
          name: 'flexibleRollout',
          id: '7fee61cc-77de-4675-b62e-1e7d08fba527',
          title: 'Feature is generally available for all users, with stickines based on user ID.',
          constraints: [],
          parameters: { rollout: '100', stickiness: 'default', groupId: '{{featureName}}' },
          variants: [],
          sortOrder: 0,
        },
      ],
    },
  ],
};

/** Keep in step with RELEASE_TEMPLATE in support/scripts/workshop-final-check.sh. */
const PROJECT_TEMPLATE_NAME = 'Project Golden Release Rollout';

/** The canary milestone's one user — the address attendees type into the storefront DevTool. */
const CANARY_EMAIL = 'canary@getunleash.io';

/**
 * The generic tail (50% → generally available), copied from the vetted payload WITHOUT its ids:
 * ids are primary keys, so every project template lets the server generate its own.
 */
const GENERIC_MILESTONES = TEMPLATE.milestones.slice(2).map((milestone) => ({
  name: milestone.name,
  sortOrder: milestone.sortOrder,
  strategies: milestone.strategies.map((strategy) => ({
    name: strategy.name,
    title: strategy.title,
    constraints: strategy.constraints,
    parameters: strategy.parameters,
    variants: strategy.variants,
    sortOrder: strategy.sortOrder,
  })),
}));

/** The project template, wired to the project's own email context field and segment. */
const projectTemplate = (project: string, segment: { id: number; name: string }) => {
  const emailField = `${projectPrefix(project)}email`;
  return {
    name: PROJECT_TEMPLATE_NAME,
    description: `The vetted rollout for this project: one canary user (${emailField}), then internal users (the ${segment.name} segment), then 50% of all users, then everyone. It already targets this project's own context field and segment — apply it as is.`,
    milestones: [
      {
        name: 'Canary deployment (single user)',
        sortOrder: 0,
        strategies: [
          {
            name: 'default',
            title: `Enable the feature for one canary user, matched by ${emailField}.`,
            constraints: [
              {
                contextName: emailField,
                caseInsensitive: false,
                inverted: false,
                operator: 'IN',
                values: [CANARY_EMAIL],
              },
            ],
            parameters: {},
            variants: [],
            segments: [],
            sortOrder: 0,
          },
        ],
      },
      {
        name: 'Internal users only',
        sortOrder: 1,
        strategies: [
          {
            name: 'default',
            title: `Enable the feature for internal users — the ${segment.name} segment.`,
            constraints: [],
            parameters: {},
            variants: [],
            segments: [segment.id],
            sortOrder: 0,
          },
        ],
      },
      ...GENERIC_MILESTONES,
    ],
  };
};

interface TemplateSummary {
  id: string;
  name: string;
  /** Null (or absent) for an instance-level template. */
  project?: string | null;
}

/**
 * GET templates, tolerating either a bare array or a `{ templates: [...] }` envelope. Returns null
 * when the endpoint itself is missing (404 — the project-level API needs Unleash 8.2+).
 */
const listTemplates = async (path: string): Promise<TemplateSummary[] | null> => {
  const { status, data } = await unleashApi(path);
  if (status === 404) return null;
  if (status !== 200) return [];
  const items = Array.isArray(data) ? data : ((data as { templates?: unknown[] }).templates ?? []);
  return items.filter(
    (item): item is TemplateSummary =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as TemplateSummary).id === 'string' &&
      typeof (item as TemplateSummary).name === 'string',
  );
};

/** Instance-level templates only — the global endpoint must never touch a project's template. */
const listGlobalTemplates = async (): Promise<TemplateSummary[]> =>
  ((await listTemplates('/release-plan-templates')) ?? []).filter((t) => !t.project);

/** Pull an error message out of an API response body, for a more useful warning. */
const reason = (data: unknown): string =>
  typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
    ? `: ${data.message}`
    : '';

/**
 * Create the Golden Release Rollout (idempotent). Templates get a server-generated id and the API
 * permits duplicate names, so we skip when one already exists rather than relying on a 409.
 */
export const createReleaseTemplate = async (): Promise<void> => {
  if ((await listGlobalTemplates()).some((t) => t.name === TEMPLATE_NAME)) {
    console.log(`[release-template] "${TEMPLATE_NAME}" already exists.`);
    return;
  }
  const { status } = await unleashApi('/release-plan-templates', {
    method: 'POST',
    body: JSON.stringify(TEMPLATE),
  });
  if (status === 200 || status === 201) {
    console.log(`[release-template] "${TEMPLATE_NAME}" created.`);
  } else if (status === 409) {
    console.log(`[release-template] "${TEMPLATE_NAME}" already exists.`);
  } else {
    console.warn(
      `[release-template] Failed to create "${TEMPLATE_NAME}" (HTTP ${status.toString()}).`,
    );
  }
};

/** Delete the Golden Release Rollout once (idempotent — a missing template is fine). */
export const deleteReleaseTemplate = async (): Promise<void> => {
  const template = (await listGlobalTemplates()).find((t) => t.name === TEMPLATE_NAME);
  if (!template) {
    console.log(`[release-template] "${TEMPLATE_NAME}" already gone.`);
    return;
  }
  const { status } = await unleashApi(`/release-plan-templates/${template.id}`, {
    method: 'DELETE',
  });
  console.log(`[release-template] Deleted "${TEMPLATE_NAME}" (HTTP ${status.toString()}).`);
};

/**
 * Create the project's own Project Golden Release Rollout (idempotent, by name). Needs the
 * internal-users segment first — the template references it by id. On an instance without
 * project-level templates (a self-hosted one older than 8.2 — every cloud-hosted instance has
 * them) it warns and moves on: step 6 then falls back to the instance-level template.
 */
export const createProjectReleaseTemplate = async (project: string): Promise<void> => {
  const path = `/projects/${project}/release-templates`;
  const existing = await listTemplates(path);
  if (existing === null) {
    console.warn(
      `[release-template] ${project}: project-level release templates are not available (they need Unleash 8.2+, which every cloud-hosted instance has — is this an older self-hosted one?) — step 6 falls back to "${TEMPLATE_NAME}".`,
    );
    return;
  }
  if (existing.some((t) => t.name === PROJECT_TEMPLATE_NAME)) {
    console.log(`[release-template] ${project}: "${PROJECT_TEMPLATE_NAME}" already exists.`);
    return;
  }
  const segment = await findSegment(project);
  if (!segment) {
    console.warn(
      `[release-template] ${project}: no internal-users segment to reference — skipping "${PROJECT_TEMPLATE_NAME}".`,
    );
    return;
  }

  const { status, data } = await unleashApi(path, {
    method: 'POST',
    body: JSON.stringify(projectTemplate(project, segment)),
  });
  if (status === 200 || status === 201) {
    console.log(`[release-template] ${project}: created "${PROJECT_TEMPLATE_NAME}".`);
  } else if (status === 409) {
    console.log(`[release-template] ${project}: "${PROJECT_TEMPLATE_NAME}" already exists.`);
  } else {
    console.warn(
      `[release-template] ${project}: failed to create "${PROJECT_TEMPLATE_NAME}" (HTTP ${status.toString()}${reason(data)}).`,
    );
  }
};

/**
 * Delete the project's template (idempotent). Runs BEFORE the segment it references is deleted.
 * If a plain DELETE is refused, archive the template first and try once more.
 */
export const deleteProjectReleaseTemplate = async (project: string): Promise<void> => {
  const path = `/projects/${project}/release-templates`;
  const template = ((await listTemplates(path)) ?? []).find(
    (t) => t.name === PROJECT_TEMPLATE_NAME,
  );
  if (!template) {
    console.log(`[release-template] ${project}: "${PROJECT_TEMPLATE_NAME}" already gone.`);
    return;
  }

  let { status } = await unleashApi(`${path}/${template.id}`, { method: 'DELETE' });
  if (status >= 300) {
    await unleashApi(`${path}/archive/${template.id}`, { method: 'POST' });
    ({ status } = await unleashApi(`${path}/${template.id}`, { method: 'DELETE' }));
  }
  console.log(
    `[release-template] ${project}: deleted "${PROJECT_TEMPLATE_NAME}" (HTTP ${status.toString()}).`,
  );
};
