import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildBasket, computeBreakdown, PAYMENT_PROVIDERS } from '@gift-store/commerce';
import { PaymentSection } from '../payments/Payment';

const breakdown = computeBreakdown(
  buildBasket({ items: [{ productId: 'featureops-hoodie', quantity: 1 }] }),
);

const noop = (): void => undefined;

// Shared provider props; individual tests override `promoEnabled` to exercise the flag.
const providerProps = {
  providers: PAYMENT_PROVIDERS,
  selectedProvider: 'paybro' as const,
  onProviderChange: noop,
};

describe('PaymentSection — the promo-code flag drives the UI', () => {
  it('given the flag is ON, when rendering payment, then the promo field is shown', () => {
    render(
      <PaymentSection
        promoEnabled
        promoCode=""
        onPromoChange={noop}
        freeShippingNudge={{ enabled: false, startPercent: 0 }}
        breakdown={breakdown}
        {...providerProps}
        canPay
        paying={false}
        onPay={noop}
      />,
    );

    expect(screen.getByLabelText('Promo code')).toBeInTheDocument();
  });

  it('given the flag is OFF, when rendering payment, then the promo field is hidden', () => {
    render(
      <PaymentSection
        promoEnabled={false}
        promoCode=""
        onPromoChange={noop}
        freeShippingNudge={{ enabled: false, startPercent: 0 }}
        breakdown={breakdown}
        {...providerProps}
        canPay
        paying={false}
        onPay={noop}
      />,
    );

    expect(screen.queryByLabelText('Promo code')).toBeNull();
  });

  it('given a selected provider, when rendering payment, then the Pay button names it', () => {
    render(
      <PaymentSection
        promoEnabled={false}
        promoCode=""
        onPromoChange={noop}
        freeShippingNudge={{ enabled: false, startPercent: 0 }}
        breakdown={breakdown}
        {...providerProps}
        canPay
        paying={false}
        onPay={noop}
      />,
    );

    expect(screen.getByRole('button', { name: /Pay .* with PayBro/ })).toBeInTheDocument();
  });
});
