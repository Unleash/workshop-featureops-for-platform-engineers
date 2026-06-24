/**
 * ★ The single place the backend talks to Unleash. To add a flag, add it to `FLAGS`
 *   and call `isFlagEnabled(FLAGS.yourFlag)` where you need it — nothing else changes.
 *
 * The browser evaluates flags independently (see the storefront's `support/feature-flags.ts`);
 * this module is the server-side source of truth, so the backend never trusts a client override.
 */
import { initialize, type Context, type Unleash } from 'unleash-client';
import type { FastifyBaseLogger } from 'fastify';
import type { Config } from './config';

// This tier evaluates flags for ONE attendee project (project-NNN). Both the flag names and the
// project-scoped context-field names carry that number as a `pNNN_` prefix, supplied via
// UNLEASH_PROJECT_NUMBER. There is no default: an absent value means "not configured yet", so we
// fail loudly rather than silently evaluating some other project's flags.
const requireProjectNumber = (): string => {
  const value = process.env.UNLEASH_PROJECT_NUMBER?.trim();
  if (!value) {
    throw new Error(
      'UNLEASH_PROJECT_NUMBER is required. Run `make workshop-configure` (it infers your ' +
        'project from your Unleash permissions), or set it manually to your assigned number.',
    );
  }
  return value;
};
export const PROJECT_NUMBER = requireProjectNumber();
const flag = (suffix: string): string => `p${PROJECT_NUMBER}_${suffix}`;
/** Context property key for this project's context fields (e.g. pNNN_region, pNNN_email). */
export const contextKey = (name: string): string => `p${PROJECT_NUMBER}_${name}`;
/** Prometheus metric-name prefix for this project, e.g. "pNNN_" (keeps metrics project-scoped). */
export const metricPrefix = `p${PROJECT_NUMBER}_`;

export const FLAGS = {
  /** When ON, the checkout accepts and applies promo codes. */
  promoCode: flag('rl_checkout-page_payment-section_promo-code'),
  /** When ON, the catalog endpoint returns a product image URL per line (back-end evaluated). */
  productImages: flag('rl_checkout-page_basket-preview_product-images'),
} as const;

export type FlagName = (typeof FLAGS)[keyof typeof FLAGS];

let unleash: Unleash | undefined;

/** Connect to Unleash. Never blocks startup on an unreachable server. */
export const startFeatureFlags = async (config: Config, log: FastifyBaseLogger): Promise<void> => {
  if (!config.unleashApiToken) {
    log.warn(
      'UNLEASH_API_TOKEN is empty — feature flags default to OFF. Run `make infra-provision` first.',
    );
    return;
  }

  const client = initialize({
    url: config.unleashUrl,
    appName: config.appName,
    // The token already scopes evaluation to an environment; declaring it here keeps the
    // SDK's static context honest (and visible) for this tier.
    environment: config.environment,
    customHeaders: { Authorization: config.unleashApiToken },
    refreshInterval: 5_000,
    metricsInterval: 5_000,
  });
  unleash = client;
  client.on('error', (err: unknown) => {
    log.error({ err }, 'Unleash client error');
  });

  await new Promise<void>((resolve) => {
    client.on('synchronized', () => {
      resolve();
    });
    client.on('error', () => {
      resolve();
    });
    setTimeout(resolve, 3_000);
  });
};

export const isFlagEnabled = (flag: FlagName, context: Context = {}): boolean =>
  unleash?.isEnabled(flag, context) ?? false;

/** The live client (or undefined when the token was empty), so impact metrics can attach to it. */
export const getUnleash = (): Unleash | undefined => unleash;

export const stopFeatureFlags = (): void => {
  unleash?.destroy();
  unleash = undefined;
};
