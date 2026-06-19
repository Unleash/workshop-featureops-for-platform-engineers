import { unleashApi } from '../api';
import { ENVIRONMENTS, projectNumber } from '../config';

interface Variant {
  name: string;
  weight: number;
  weightType: 'variable' | 'fix';
  stickiness: string;
  payload: { type: string; value: string };
}

interface FlagDef {
  /** Name without the project prefix; the full name is `p<number>_<suffix>`. */
  suffix: string;
  type: 'release' | 'experiment' | 'operational' | 'kill-switch' | 'permission';
  description: string;
  /** Environments where the flag ships enabled (everything else is created but OFF). */
  enabledEnvironments: string[];
  /** Strategy-level variants, when the flag carries them. */
  variants?: Variant[];
}

// The workshop's four flags, named per the project's enforced convention
// (p<NNN>_<type>_[v_]<domain>_<component>_<slug>). Each gets a 100% flexibleRollout strategy in
// every environment so a Toolbar flip turns it fully on; only the kill switch ships enabled.
const FLAGS: FlagDef[] = [
  {
    suffix: 'rl_checkout-page_payment-section_promo-code',
    type: 'release',
    description: 'Show the promo-code field at checkout (enforced back-end).',
    enabledEnvironments: [],
  },
  {
    suffix: 'rl_checkout-page_basket-preview_product-images',
    type: 'release',
    description: 'Return product image URLs from the catalog API for the basket preview.',
    enabledEnvironments: [],
  },
  {
    suffix: 'kx_checkout-page_headline_link-to-real-unleash-store',
    type: 'kill-switch',
    description: 'Kill switch: when ENABLED, hides the link to the real Unleash store.',
    enabledEnvironments: ['development', 'production'],
  },
  {
    suffix: 'ex_v_checkout-page_payment-section_free-shipping-nudge',
    type: 'experiment',
    description:
      'Nudge shoppers toward the free-shipping goal, where variant sets the % start point.',
    enabledEnvironments: [],
    variants: [
      {
        name: 'always',
        weight: 500,
        weightType: 'variable',
        stickiness: 'default',
        payload: { type: 'number', value: '0' },
      },
      {
        name: 'from-threshold',
        weight: 500,
        weightType: 'fix',
        stickiness: 'default',
        payload: { type: 'number', value: '50' },
      },
    ],
  },
];

/** Full flag name for a project, e.g. (project-001, rl_…promo-code) → p001_rl_…promo-code. */
const flagName = (project: string, suffix: string): string =>
  `p${projectNumber(project)}_${suffix}`;

/** The flag-name suffixes, exposed so other tooling can reference the same source of truth. */
export const FLAG_SUFFIXES: string[] = FLAGS.map((flag) => flag.suffix);

/** The single kill-switch flag — the master kill switch's target. */
const killSwitchFlag = FLAGS.find((flag) => flag.type === 'kill-switch');
if (!killSwitchFlag) {
  throw new Error('No kill-switch flag defined in FLAGS — the master kill switch needs one.');
}

/** Full name of a project's kill-switch flag, e.g. p001_kx_checkout-page_headline_link-to-real-unleash-store. */
export const killSwitchFlagName = (project: string): string =>
  flagName(project, killSwitchFlag.suffix);

interface StrategySummary {
  id: string;
}

const existingStrategies = async (
  project: string,
  flag: string,
  env: string,
): Promise<StrategySummary[]> => {
  const { data } = await unleashApi<StrategySummary[] | { strategies?: StrategySummary[] }>(
    `/projects/${project}/features/${flag}/environments/${env}/strategies`,
  );
  if (Array.isArray(data)) {
    return data;
  }
  return data.strategies ?? [];
};

const setEnabled = async (
  project: string,
  flag: string,
  env: string,
  enabled: boolean,
): Promise<void> => {
  const { status } = await unleashApi(
    `/projects/${project}/features/${flag}/environments/${env}/${enabled ? 'on' : 'off'}`,
    { method: 'POST' },
  );
  console.log(`[flags]   ${env}: ${enabled ? 'enabled' : 'disabled'} (HTTP ${status.toString()}).`);
};

export const createFlags = async (project: string): Promise<void> => {
  console.log(`[flags] ${project}: creating feature flags ...`);
  for (const flag of FLAGS) {
    const name = flagName(project, flag.suffix);
    const { status } = await unleashApi(`/projects/${project}/features`, {
      method: 'POST',
      body: JSON.stringify({ name, type: flag.type, description: flag.description }),
    });

    if (status === 200 || status === 201) {
      console.log(`[flags] ${project}: created "${name}" (${flag.type}).`);
    } else if (status === 409) {
      console.log(`[flags] ${project}: "${name}" already exists. Reconciling.`);
    } else {
      console.warn(`[flags] ${project}: failed to create "${name}" (HTTP ${status.toString()}).`);
      continue;
    }

    for (const env of ENVIRONMENTS) {
      if ((await existingStrategies(project, name, env)).length === 0) {
        const strategy = {
          name: 'flexibleRollout',
          parameters: { rollout: '100', stickiness: 'default', groupId: name },
          segments: [] as number[],
          ...(flag.variants ? { variants: flag.variants } : {}),
        };
        const { status: strategyStatus } = await unleashApi(
          `/projects/${project}/features/${name}/environments/${env}/strategies`,
          { method: 'POST', body: JSON.stringify(strategy) },
        );
        console.log(`[flags]   ${env}: strategy added (HTTP ${strategyStatus.toString()}).`);
      }
      await setEnabled(project, name, env, flag.enabledEnvironments.includes(env));
    }
  }
};

export const archiveFlags = async (project: string): Promise<void> => {
  console.log(`[flags] ${project}: archiving feature flags ...`);
  for (const flag of FLAGS) {
    const name = flagName(project, flag.suffix);
    const { status } = await unleashApi(`/projects/${project}/features/${name}`, {
      method: 'DELETE',
    });
    console.log(`[flags] ${project}: archived "${name}" (HTTP ${status.toString()}).`);
  }
};
