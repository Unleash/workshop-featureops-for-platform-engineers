import type {
  CreatePaymentRequest,
  CreatePaymentResponse,
  Order,
  Product,
} from '@gift-store/commerce';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8081';

/**
 * Cross-cutting targeting context carried as headers (not part of the domain body): the
 * userId, session id, region and email the backend feeds into its Unleash evaluation. (On
 * the checkout body the durable userId also rides as `customer.id`.)
 */
export interface RequestContext {
  userId: string;
  sessionId: string;
  region: string;
  email: string;
}

export const createPayment = async (
  request: CreatePaymentRequest,
  context: RequestContext,
): Promise<CreatePaymentResponse> => {
  const response = await fetch(`${API_URL}/checkout/pay`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-session-id': context.sessionId,
      'x-region': context.region,
      'x-email': context.email,
    },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error(`Checkout failed (${response.status.toString()})`);
  }
  return (await response.json()) as CreatePaymentResponse;
};

/**
 * Fetch the catalog from the back end. Products carry an `imageUrl` only when the
 * `product-images` flag is enabled SERVER-SIDE for this shopper — the back-end half of the
 * both-layers evaluation. The front-end still gates *rendering* on its own flag read.
 */
export const fetchCatalog = async (context: RequestContext): Promise<Product[]> => {
  const response = await fetch(`${API_URL}/catalog`, {
    headers: {
      'x-user-id': context.userId,
      'x-session-id': context.sessionId,
      'x-region': context.region,
      'x-email': context.email,
    },
  });
  if (!response.ok) {
    throw new Error(`Could not load catalog (${response.status.toString()})`);
  }
  return (await response.json()) as Product[];
};

export const fetchOrder = async (orderId: string): Promise<Order> => {
  const response = await fetch(`${API_URL}/checkout/orders/${orderId}`);
  if (!response.ok) {
    throw new Error(`Could not load order (${response.status.toString()})`);
  }
  return (await response.json()) as Order;
};
