/**
 * The "Golden Release Template" — the vetted, org-wide rollout shape every AI-generated change
 * can inherit (Segment 6, "Author the release policy"). Release plan templates are INSTANCE-level
 * (one shared template for every attendee project — the Terraform provider can't express them, and
 * the API has no project scope), so this is created/deleted ONCE, not per project, like the global
 * Layer tag type.
 *
 * The first two milestones target the built-in `userId` context with example emails: a template is
 * instance-global, so it cannot reference a project-scoped field (pNNN_email) or segment. Their
 * strategies are meant to be adjusted per project when the template is APPLIED to a flag (the
 * template description says as much) — that is the workshop-time activity, not provisioning.
 */
import { unleashApi } from '../api';

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

interface TemplateSummary {
  id: string;
  name: string;
}

/** GET existing templates, tolerating either a bare array or a `{ templates: [...] }` envelope. */
const listTemplates = async (): Promise<TemplateSummary[]> => {
  const { status, data } = await unleashApi('/release-plan-templates');
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

/**
 * Create the Golden Release Template (idempotent). Templates get a server-generated id and the API
 * permits duplicate names, so we skip when one already exists rather than relying on a 409.
 */
export const createReleaseTemplate = async (): Promise<void> => {
  if ((await listTemplates()).some((t) => t.name === TEMPLATE_NAME)) {
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

/** Delete the Golden Release Template once (idempotent — a missing template is fine). */
export const deleteReleaseTemplate = async (): Promise<void> => {
  const template = (await listTemplates()).find((t) => t.name === TEMPLATE_NAME);
  if (!template) {
    console.log(`[release-template] "${TEMPLATE_NAME}" already gone.`);
    return;
  }
  const { status } = await unleashApi(`/release-plan-templates/${template.id}`, {
    method: 'DELETE',
  });
  console.log(`[release-template] Deleted "${TEMPLATE_NAME}" (HTTP ${status.toString()}).`);
};
