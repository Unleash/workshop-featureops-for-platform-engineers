/**
 * Dashed strategy — the modern alternative (port 8401). Built and ready, but NOT yet
 * registered in `router.ts`: enabling it (there, plus adding `DASHED_OPTION` to the
 * storefront's `PAYMENT_PROVIDERS`) is the workshop exercise. Dashed's `/api/payments`
 * contract matches PayBro's; only its base URL and webhook signature header differ.
 */
import type { Config } from '../support/config';
import {
  ProviderPaymentError,
  type PaymentProviderStrategy,
  type ProviderPayment,
  type ProviderPaymentInput,
} from './provider';

const createPayment = async (
  config: Config,
  input: ProviderPaymentInput,
): Promise<ProviderPayment> => {
  const response = await fetch(`${config.dashedUrl}/api/payments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    // Dashed sends a unified `errorCode` on the failure body; surface it on the typed error.
    const body = (await response.json().catch(() => ({}))) as { errorCode?: string };
    throw new ProviderPaymentError(
      'dashed',
      body.errorCode ?? 'unknown_provider_error',
      response.status,
    );
  }

  return (await response.json()) as ProviderPayment;
};

export const dashedStrategy: PaymentProviderStrategy = {
  id: 'dashed',
  createPayment,
  verifyWebhook: (config, headers) => headers['x-dashed-signature'] === config.dashedWebhookSecret,
};
