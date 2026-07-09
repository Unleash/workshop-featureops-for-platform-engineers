/**
 * ★ The single place the backend pushes Unleash Impact Metrics. These ride out on the same
 *   SDK client (and the same 5s metrics interval) as flag-usage metrics — no OTEL, no extra
 *   transport. A release-template safeguard watches `<prefix>checkout_error_total` to pause or
 *   disable a rollout when checkouts start failing.
 *
 * Why explicit counters instead of labels? The SDK's public `incrementCounter` only attaches
 * the static context labels `{ appName, environment }` (the dimensions a safeguard can filter
 * on). Everything else we'd want to slice by — the leg the request was on (redirect vs
 * after-payment) and the outcome (success vs error) — is therefore encoded in the metric NAME,
 * one explicit counter per case. Every name carries this project's flag prefix, when it has one.
 *
 * Like `isFlagEnabled`, every emit is a safe no-op until `startImpactMetrics` has run with a
 * live client (e.g. when `UNLEASH_API_TOKEN` is empty, or in tests).
 */
import type { Unleash } from 'unleash-client';
import type { FastifyBaseLogger } from 'fastify';
import { metricPrefix } from './feature-flags';

/** The explicit counters we push. Names are project-scoped via `metricPrefix` (may be empty). */
export const IMPACT_METRICS = {
  checkoutSuccess: {
    name: `${metricPrefix}checkout_success_total`,
    help: 'Checkouts that resolved as paid.',
  },
  checkoutError: {
    name: `${metricPrefix}checkout_error_total`,
    help: 'Checkouts that ended in a failed state (redirect failure or a failed webhook).',
  },
  providerRedirectSuccess: {
    name: `${metricPrefix}payment_provider_redirect_success_total`,
    help: 'Payment sessions the provider created successfully (redirect leg).',
  },
  providerRedirectError: {
    name: `${metricPrefix}payment_provider_redirect_error_total`,
    help: 'Payment sessions the provider failed to create (redirect leg).',
  },
  providerAfterPaymentSuccess: {
    name: `${metricPrefix}payment_provider_after_payment_success_total`,
    help: 'Provider confirmations that came back paid (after-payment leg).',
  },
  providerAfterPaymentError: {
    name: `${metricPrefix}payment_provider_after_payment_error_total`,
    help: 'Provider confirmations that came back failed (after-payment leg).',
  },
} as const;

let unleash: Unleash | undefined;

/**
 * Register the counters with the SDK so they are collected and pushed. Pass the live client
 * (see `getUnleash`); when it is undefined the module stays disabled and every emit no-ops.
 */
export const startImpactMetrics = (client: Unleash | undefined, log: FastifyBaseLogger): void => {
  if (!client) {
    log.warn('Impact metrics disabled — Unleash client is not initialized.');
    return;
  }
  for (const { name, help } of Object.values(IMPACT_METRICS)) {
    client.impactMetrics.defineCounter(name, help);
  }
  unleash = client;
};

/** Stop emitting (used on shutdown / between tests). */
export const stopImpactMetrics = (): void => {
  unleash = undefined;
};

/**
 * What the checkout routes depend on — injected like `isPromoEnabled` so the routes stay
 * testable without a live Unleash client. Each call is auto-labeled `{ appName, environment }`.
 */
export interface ImpactMetrics {
  recordCheckoutSuccess(): void;
  recordCheckoutError(): void;
  recordProviderRedirectSuccess(): void;
  recordProviderRedirectError(): void;
  recordProviderAfterPaymentSuccess(): void;
  recordProviderAfterPaymentError(): void;
}

const increment = (name: string): void => {
  // The SDK marks only `incrementCounter`'s optional `flagContext` parameter as deprecated —
  // we never pass it, and the counter API itself is current — so this notice is a false alarm.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  unleash?.impactMetrics.incrementCounter(name);
};

export const impactMetrics: ImpactMetrics = {
  recordCheckoutSuccess: () => {
    increment(IMPACT_METRICS.checkoutSuccess.name);
  },
  recordCheckoutError: () => {
    increment(IMPACT_METRICS.checkoutError.name);
  },
  recordProviderRedirectSuccess: () => {
    increment(IMPACT_METRICS.providerRedirectSuccess.name);
  },
  recordProviderRedirectError: () => {
    increment(IMPACT_METRICS.providerRedirectError.name);
  },
  recordProviderAfterPaymentSuccess: () => {
    increment(IMPACT_METRICS.providerAfterPaymentSuccess.name);
  },
  recordProviderAfterPaymentError: () => {
    increment(IMPACT_METRICS.providerAfterPaymentError.name);
  },
};
