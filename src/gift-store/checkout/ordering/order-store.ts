/** Tiny in-memory order store. A real app would persist these; the demo keeps it simple. */
import { randomUUID } from 'node:crypto';
import type {
  Environment,
  Money,
  OrderState,
  PaymentProviderId,
  PriceBreakdown,
  ShippingAddress,
} from '@gift-store/commerce';

export interface StoredOrder {
  id: string;
  state: OrderState;
  breakdown: PriceBreakdown;
  shipping: ShippingAddress;
  /** Which provider this order was routed to (drives webhook verification). */
  provider: PaymentProviderId;
  environment: Environment;
  /** What the provider actually charged; set once the payment session is created. */
  amountCharged?: Money;
  paymentId?: string;
  /** Unified provider error code recorded when the order fails (e.g. PAYMENT_CAPTURE_FAILED). */
  errorCode?: string;
}

const orders = new Map<string, StoredOrder>();

export const createOrder = (input: {
  breakdown: PriceBreakdown;
  shipping: ShippingAddress;
  provider: PaymentProviderId;
  environment: Environment;
}): StoredOrder => {
  const order: StoredOrder = { id: randomUUID(), state: 'pending', ...input };
  orders.set(order.id, order);
  return order;
};

export const attachPayment = (orderId: string, paymentId: string): void => {
  const order = orders.get(orderId);
  if (order) order.paymentId = paymentId;
};

/** Record what the provider charged (the requested quote lives in `breakdown.total`). */
export const setOrderCharge = (orderId: string, amountCharged: Money): void => {
  const order = orders.get(orderId);
  if (order) order.amountCharged = amountCharged;
};

export const setOrderState = (orderId: string, state: OrderState, errorCode?: string): void => {
  const order = orders.get(orderId);
  if (order) {
    order.state = state;
    // Record the failure code when one is supplied; leave any prior value untouched otherwise.
    if (errorCode !== undefined) order.errorCode = errorCode;
  }
};

export const getOrder = (orderId: string): StoredOrder | undefined => orders.get(orderId);
