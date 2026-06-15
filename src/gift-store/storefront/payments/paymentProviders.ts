/**
 * Front-end provider config: where to load each provider's hosted brand icon from. A real
 * payment integration pulls brand assets from the provider's own host, so we do the same —
 * the chooser renders `${baseUrl}/favicon.svg`, served by each provider service. Base URLs
 * are configuration (VITE_*), never literals, so they move with the environment.
 */
import type { PaymentProviderId } from '@gift-store/commerce';

const PROVIDER_BASE_URL: Record<PaymentProviderId, string> = {
  paybro: import.meta.env.VITE_PAYBRO_URL ?? 'http://localhost:8400',
  dashed: import.meta.env.VITE_DASHED_URL ?? 'http://localhost:8401',
};

/** URL of the provider's hosted brand icon (served at GET /favicon.svg). */
export const providerIconUrl = (id: PaymentProviderId): string =>
  `${PROVIDER_BASE_URL[id]}/favicon.svg`;
