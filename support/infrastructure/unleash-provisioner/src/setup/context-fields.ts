import { unleashApi } from '../api';
import { projectNumber } from '../config';

interface LegalValue {
  value: string;
  description?: string;
}

interface ContextFieldDef {
  /** Bare name; the project number is prefixed at provision time (e.g. region → pNNN_region). */
  suffix: string;
  description: string;
  stickiness: boolean;
  legalValues?: LegalValue[];
}

// PROJECT-SCOPED context fields. The official Terraform provider's unleash_context_field has no
// `project` argument, so these live here (the Admin API's createContextFieldSchema accepts a
// `project`). Context-field NAMES are globally unique across the instance, so each project's
// fields are prefixed with its number (pNNN_region, pNNN+1_region, …) to stay isolated per attendee.
const CONTEXT_FIELDS: ContextFieldDef[] = [
  {
    suffix: 'region',
    description: 'Geographical region for the affected user.',
    stickiness: true,
    legalValues: [
      { value: 'AMER', description: 'Americas (🌎)' },
      { value: 'APAC', description: 'Asia-Pacific (🌏)' },
      { value: 'EEA', description: 'European Economic Area (🌍)' },
      { value: 'EU', description: 'European Union (🇪🇺)' },
      { value: 'US', description: 'United States (🇺🇸)' },
    ],
  },
  {
    suffix: 'email',
    description: "Shopper's email address — targeted by the internal-users segment.",
    stickiness: true,
  },
];

const fieldName = (project: string, suffix: string): string =>
  `p${projectNumber(project)}_${suffix}`;

export const createContextFields = async (project: string): Promise<void> => {
  console.log(`[context-fields] ${project}: creating project-scoped context fields ...`);
  for (const field of CONTEXT_FIELDS) {
    const name = fieldName(project, field.suffix);
    const { status } = await unleashApi('/context', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: field.description,
        stickiness: field.stickiness,
        project,
        ...(field.legalValues ? { legalValues: field.legalValues } : {}),
      }),
    });

    if (status === 200 || status === 201) {
      console.log(`[context-fields] ${project}: created "${name}".`);
    } else if (status === 409) {
      console.log(`[context-fields] ${project}: "${name}" already exists. Skipping.`);
    } else {
      console.warn(
        `[context-fields] ${project}: failed to create "${name}" (HTTP ${status.toString()}).`,
      );
    }
  }
};

export const deleteContextFields = async (project: string): Promise<void> => {
  console.log(`[context-fields] ${project}: deleting project-scoped context fields ...`);
  for (const field of [...CONTEXT_FIELDS].reverse()) {
    const name = fieldName(project, field.suffix);
    const { status } = await unleashApi(`/context/${name}`, { method: 'DELETE' });
    console.log(`[context-fields] ${project}: deleted "${name}" (HTTP ${status.toString()}).`);
  }
};
