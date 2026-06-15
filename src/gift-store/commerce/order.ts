/** Orders, shipping, and the request/response contract for the merchant checkout API. */

import type { Money } from './money';
import type { PriceBreakdown } from './pricing';
import type { BasketSelection } from './basket';
import type { PaymentProviderId } from './payment-providers';
import type { Environment } from './environment';

export interface ShippingAddress {
  readonly fullName: string;
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly postalCode: string;
  readonly country: string;
}

export type OrderState = 'pending' | 'paid' | 'failed';

export interface Order {
  readonly id: string;
  readonly state: OrderState;
  readonly breakdown: PriceBreakdown;
  /** Which payment provider this order was routed to. */
  readonly provider: PaymentProviderId;
  /** The Unleash environment this order was placed against (e.g. development | production). */
  readonly environment: Environment;
  /**
   * What the payment provider actually charged. The requested quote is `breakdown.total`;
   * in a sandbox environment (development) the charged amount is $0.00, so the UI can show
   * the requested total struck through beside the real charge.
   */
  readonly amountCharged: Money;
}

/** A reference to the (possibly guest) shopper placing the order. */
export interface CustomerRef {
  readonly id: string;
}

/** Request/response contract for the merchant checkout API. */
export interface CreatePaymentRequest {
  readonly selection: BasketSelection;
  readonly shipping: ShippingAddress;
  readonly promoCode?: string;
  /** Optional: absent for a fully anonymous guest. */
  readonly customer?: CustomerRef;
  /** Which provider to route to. Absent → the default provider (PayBro). */
  readonly provider?: PaymentProviderId;
}

export interface CreatePaymentResponse {
  readonly orderId: string;
  /** Where the browser must be sent to complete payment on the provider. */
  readonly redirectUrl: string;
}
