import type { Order } from '@gift-store/commerce';
import type { StoredOrder } from './order-store';

/** Project the internal stored order into the public shape returned to the storefront. */
export const toPublicOrder = (order: StoredOrder): Order => ({
  id: order.id,
  state: order.state,
  breakdown: order.breakdown,
  provider: order.provider,
  environment: order.environment,
  // Falls back to the requested total if a charge was somehow never recorded.
  amountCharged: order.amountCharged ?? order.breakdown.total,
});
