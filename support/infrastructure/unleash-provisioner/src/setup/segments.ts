import { unleashApi } from '../api';
import { projectPrefix } from '../config';

/** Segment name for a project, e.g. project-001 → p001_internal-users. */
const segmentName = (project: string): string => `${projectPrefix(project)}internal-users`;

interface SegmentSummary {
  id: number;
  name: string;
}

/** GET /segments returns either a bare array or `{ segments: [...] }` depending on version. */
const fetchSegments = async (): Promise<SegmentSummary[]> => {
  const { data } = await unleashApi<SegmentSummary[] | { segments?: SegmentSummary[] }>(
    '/segments',
  );
  if (Array.isArray(data)) {
    return data;
  }
  return data.segments ?? [];
};

export const createSegments = async (project: string): Promise<void> => {
  const name = segmentName(project);
  console.log(`[segments] ${project}: creating the "${name}" segment ...`);
  const existing = await fetchSegments();
  if (existing.some((segment) => segment.name === name)) {
    console.log(`[segments] ${project}: "${name}" already exists. Skipping.`);
    return;
  }

  const { status } = await unleashApi('/segments', {
    method: 'POST',
    body: JSON.stringify({
      name,
      description: 'Users whose email ends with @getunleash.io (internal Unleash staff).',
      project,
      constraints: [
        {
          contextName: `${projectPrefix(project)}email`,
          operator: 'STR_ENDS_WITH',
          values: ['@getunleash.io'],
          caseInsensitive: true,
          inverted: false,
        },
      ],
    }),
  });

  if (status === 200 || status === 201) {
    console.log(`[segments] ${project}: created "${name}".`);
  } else {
    console.warn(`[segments] ${project}: failed to create "${name}" (HTTP ${status.toString()}).`);
  }
};

export const deleteSegments = async (project: string): Promise<void> => {
  const name = segmentName(project);
  console.log(`[segments] ${project}: deleting the "${name}" segment ...`);
  const segment = (await fetchSegments()).find((candidate) => candidate.name === name);
  if (!segment) {
    console.log(`[segments] ${project}: "${name}" not found. Skipping.`);
    return;
  }

  const { status } = await unleashApi(`/segments/${segment.id.toString()}`, { method: 'DELETE' });
  console.log(`[segments] ${project}: deleted "${name}" (HTTP ${status.toString()}).`);
};
