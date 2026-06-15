import { useMemo, useState, type ReactNode } from 'react';
import {
  buildBasket,
  computeBreakdown,
  DEFAULT_PAYMENT_PROVIDER,
  PAYMENT_PROVIDERS,
  resolvePromo,
  type PaymentProviderId,
  type ShippingAddress,
} from '@gift-store/commerce';
import { useFreeShippingNudge, usePromoCodeFlag } from '../support/feature-flags';
import { createPayment } from '../support/api';
import { Basket } from '../cart/Basket';
import { Shipping } from './Shipping';
import { PaymentSection } from '../payments/Payment';
import type { Cart } from '../cart/useCart';

const Card = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 className="mb-2 text-lg font-bold">{title}</h2>
    {children}
  </section>
);

export interface CheckoutProps {
  cart: Cart;
  // Shipping state is owned by the app shell (so the dev panel can rotate it);
  // this component is a pure consumer and knows nothing about the dev tooling.
  shipping: ShippingAddress;
  onShippingChange: (value: ShippingAddress) => void;
  // Plain shopper identity (no Unleash types): userId → order body, session/region/email → headers.
  identity: { userId: string; sessionId: string; region: string; email: string };
  // Product image URLs from the back end (present only when product-images is ON server-side).
  imageUrls: Record<string, string>;
}

export const Checkout = ({
  cart,
  shipping,
  onShippingChange,
  identity,
  imageUrls,
}: CheckoutProps) => {
  const promoEnabled = usePromoCodeFlag();
  const freeShippingNudge = useFreeShippingNudge();
  const [promoCode, setPromoCode] = useState('');
  // Provider is hardwired to PayBro — no shopper-facing chooser (yet). When a second
  // provider is offered, lift this back to state and mount PaymentProviderChooser.
  const provider: PaymentProviderId = DEFAULT_PAYMENT_PROVIDER;
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const breakdown = useMemo(() => {
    const basket = buildBasket({ items: cart.lines });
    const promo = promoEnabled ? resolvePromo(promoCode) : null;
    return computeBreakdown(basket, { promo });
  }, [cart.lines, promoEnabled, promoCode]);

  const handlePay = async (): Promise<void> => {
    setPaying(true);
    setError(null);
    try {
      const { redirectUrl } = await createPayment(
        {
          selection: cart.selection,
          shipping,
          promoCode: promoEnabled ? promoCode : undefined,
          customer: { id: identity.userId },
          provider,
        },
        identity,
      );
      window.location.assign(redirectUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Checkout failed');
      setPaying(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-3 p-6">
      <Card title="Your basket">
        <Basket cart={cart} imageUrls={imageUrls} />
      </Card>
      <Card title="Shipping">
        <Shipping value={shipping} onChange={onShippingChange} />
      </Card>
      <Card title="Payment">
        <PaymentSection
          promoEnabled={promoEnabled}
          promoCode={promoCode}
          onPromoChange={setPromoCode}
          freeShippingNudge={freeShippingNudge}
          breakdown={breakdown}
          providers={PAYMENT_PROVIDERS}
          selectedProvider={provider}
          canPay={cart.lines.length > 0}
          paying={paying}
          onPay={() => {
            void handlePay();
          }}
        />
        {error !== null && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>
    </div>
  );
};
