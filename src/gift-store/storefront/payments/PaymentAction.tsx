import type { Money } from '@gift-store/commerce';
import { formatMoney } from '../support/format';

export interface PaymentActionProps {
  /** The provider the shopper will be sent to, e.g. "PayBro". */
  providerLabel: string;
  total: Money;
  canPay: boolean;
  paying: boolean;
  onPay: () => void;
}

/**
 * The Pay button + redirect prompt — fully templated by props, with no flag or provider
 * logic of its own. Flag-gating to a single provider is just instantiating this with a
 * different `providerLabel` behind an `if` upstream; the shopper-chooses path feeds it the
 * selected provider's label. That separation is the point.
 */
export const PaymentAction = ({
  providerLabel,
  total,
  canPay,
  paying,
  onPay,
}: PaymentActionProps) => (
  <div className="space-y-3">
    <button
      type="button"
      disabled={!canPay || paying}
      onClick={onPay}
      className="w-full rounded-xl bg-brand px-4 py-2.5 font-bold text-white transition hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
    >
      {paying
        ? `Redirecting to ${providerLabel}…`
        : `Pay ${formatMoney(total)} with ${providerLabel}`}
    </button>
    <p className="text-xs text-slate-400">
      You will be redirected to {providerLabel} to complete payment.
    </p>
  </div>
);
