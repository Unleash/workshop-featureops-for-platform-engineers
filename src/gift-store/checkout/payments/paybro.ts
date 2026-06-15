/** PayBro strategy — our retro payment partner (port 8400). */
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
  const response = await fetch(`${config.paybroUrl}/api/payments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    // PayBro is rock-solid and never returns an error code, but the seam stays symmetric.
    const body = (await response.json().catch(() => ({}))) as { errorCode?: string };
    throw new ProviderPaymentError('paybro', body.errorCode ?? 'unknown_provider_error', response.status);
  }

  return (await response.json()) as ProviderPayment;
};

export const paybroStrategy: PaymentProviderStrategy = {
  id: 'paybro',
  createPayment,
  verifyWebhook: (config, headers) => headers['x-paybro-signature'] === config.paybroWebhookSecret,
};
