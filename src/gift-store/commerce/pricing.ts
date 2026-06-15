/** Pricing: turn a basket (and an optional, backend-confirmed promo) into a breakdown. */

import { money, type Money } from './money';
import { basketSubtotal, type Basket } from './basket';
import type { PromoCode } from './promo';

export interface PriceBreakdown {
  readonly subtotal: Money;
  readonly discount: Money;
  readonly shipping: Money;
  readonly total: Money;
}

/** Flat shipping fee, waived for larger baskets or an empty cart. */
const SHIPPING_FEE_CENTS = 599;
/** Subtotal (in cents) at or above which shipping is free. */
export const FREE_SHIPPING_THRESHOLD_CENTS = 5000;

export interface BreakdownOptions {
  /** Only honoured when the caller (the backend) has confirmed the promo flag is on. */
  readonly promo?: PromoCode | null;
}

export const computeBreakdown = (
  basket: Basket,
  options: BreakdownOptions = {},
): PriceBreakdown => {
  const subtotal = basketSubtotal(basket);
  const percentOff = options.promo?.percentOff ?? 0;
  const discount = money(Math.round((subtotal.amountCents * percentOff) / 100));

  const hasItems = subtotal.amountCents > 0;
  const shippingDue = hasItems && subtotal.amountCents < FREE_SHIPPING_THRESHOLD_CENTS;
  const shipping = money(shippingDue ? SHIPPING_FEE_CENTS : 0);

  const total = money(subtotal.amountCents - discount.amountCents + shipping.amountCents);
  return { subtotal, discount, shipping, total };
};
