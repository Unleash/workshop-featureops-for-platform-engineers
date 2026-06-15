import { AnimatePresence } from 'motion/react';
import {
  FREE_SHIPPING_THRESHOLD_CENTS,
  type PaymentProviderId,
  type PaymentProviderOption,
  type PriceBreakdown,
} from '@gift-store/commerce';
import type { FreeShippingNudge } from '../support/feature-flags';
import { PromoField } from './PromoField';
import { FreeShippingBanner } from './FreeShippingBanner';
import { PriceSummary } from './PriceSummary';
import { PaymentAction } from './PaymentAction';

export interface PaymentSectionProps {
  /** Driven by the `promo-code` Unleash flag (see Checkout). */
  promoEnabled: boolean;
  promoCode: string;
  onPromoChange: (value: string) => void;
  /** Driven by the `free-shipping-nudge` variant flag (see Checkout). */
  freeShippingNudge: FreeShippingNudge;
  breakdown: PriceBreakdown;
  /** The provider this checkout routes to (hardwired to PayBro for now). */
  providers: readonly PaymentProviderOption[];
  selectedProvider: PaymentProviderId;
  canPay: boolean;
  paying: boolean;
  onPay: () => void;
}

/**
 * Composes the payment section from focused pieces (each in its own file): the promo field,
 * the free-shipping nudge, the price summary, and the payment action. It owns only layout +
 * the small "should the nudge show" calculation; everything else is a prop-driven child,
 * which is what lets a flag-gating assignment swap pieces without touching this file's
 * internals. The provider is hardwired (PayBro) — the PaymentProviderChooser component
 * stays ready for the day a second provider is offered, but isn't mounted here.
 */
export const PaymentSection = ({
  promoEnabled,
  promoCode,
  onPromoChange,
  freeShippingNudge,
  breakdown,
  providers,
  selectedProvider,
  canPay,
  paying,
  onPay,
}: PaymentSectionProps) => {
  const goalCents = FREE_SHIPPING_THRESHOLD_CENTS;
  const gapCents = Math.max(0, goalCents - breakdown.subtotal.amountCents);
  const startAtCents = Math.round((freeShippingNudge.startPercent / 100) * goalCents);
  const showNudge =
    freeShippingNudge.enabled && gapCents > 0 && breakdown.subtotal.amountCents >= startAtCents;

  const selectedLabel =
    providers.find((option) => option.id === selectedProvider)?.label ?? selectedProvider;

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {promoEnabled && (
          <PromoField key="promo" promoCode={promoCode} onPromoChange={onPromoChange} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNudge && (
          <FreeShippingBanner key="free-shipping" gapCents={gapCents} goalCents={goalCents} />
        )}
      </AnimatePresence>

      <PriceSummary breakdown={breakdown} />

      <PaymentAction
        providerLabel={selectedLabel}
        total={breakdown.total}
        canPay={canPay}
        paying={paying}
        onPay={onPay}
      />
    </div>
  );
};
