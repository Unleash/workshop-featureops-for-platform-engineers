/**
 * The provider factory: resolve a routing strategy from a provider id via a map lookup
 * (no `switch`). Registering a provider is one line in `STRATEGIES`.
 *
 * Only PayBro is registered today — symmetric with the storefront's `PAYMENT_PROVIDERS`.
 * The `dashed` line below is a ready one-liner: uncomment it to enable Dashed routing
 * (the workshop exercise). An id that isn't registered safely falls back to the default,
 * so the checkout never hard-fails on an unknown selection.
 */
import { DEFAULT_PAYMENT_PROVIDER, type PaymentProviderId } from '@gift-store/commerce';
import type { PaymentProviderStrategy } from './provider';
import { paybroStrategy } from './paybro';
// import { dashedStrategy } from './dashed';

const STRATEGIES: Partial<Record<PaymentProviderId, PaymentProviderStrategy>> = {
  paybro: paybroStrategy,
  // dashed: dashedStrategy,   // ← register to enable Dashed routing (workshop exercise)
};

export const getPaymentProvider = (
  id: PaymentProviderId = DEFAULT_PAYMENT_PROVIDER,
): PaymentProviderStrategy =>
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- the default is always registered
  STRATEGIES[id] ?? STRATEGIES[DEFAULT_PAYMENT_PROVIDER]!;
