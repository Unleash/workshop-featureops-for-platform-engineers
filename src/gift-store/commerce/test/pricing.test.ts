import { describe, it, expect } from 'vitest';
import { computeBreakdown, money, resolvePromo, type Basket, type Product } from '../index.js';

const product = (id: string, cents: number): Product => ({
  id,
  name: `Item ${id}`,
  unitPrice: money(cents),
});

describe('checkout pricing', () => {
  it('given a small basket, when computing the breakdown, then shipping is charged', () => {
    const basket: Basket = { items: [{ product: product('a', 1200), quantity: 2 }] };

    const breakdown = computeBreakdown(basket);

    expect(breakdown.subtotal.amountCents).toBe(2400);
    expect(breakdown.shipping.amountCents).toBe(599);
    expect(breakdown.discount.amountCents).toBe(0);
    expect(breakdown.total.amountCents).toBe(2999);
  });

  it('given a resolved promo, when applied, then the discount and total reflect it', () => {
    const basket: Basket = { items: [{ product: product('a', 3000), quantity: 2 }] };

    const promo = resolvePromo('save10');
    const breakdown = computeBreakdown(basket, { promo });

    expect(promo?.percentOff).toBe(10);
    expect(breakdown.subtotal.amountCents).toBe(6000);
    expect(breakdown.discount.amountCents).toBe(600);
    // Subtotal is over the free-shipping threshold, so shipping is waived.
    expect(breakdown.shipping.amountCents).toBe(0);
    expect(breakdown.total.amountCents).toBe(5400);
  });
});
