import type { PaymentProviderId, PaymentProviderOption } from '@gift-store/commerce';
import { providerIconUrl } from './paymentProviders';

export interface PaymentProviderChooserProps {
  /** Which providers to offer — render whatever it's given (driven by domain config). */
  options: readonly PaymentProviderOption[];
  value: PaymentProviderId;
  onChange: (id: PaymentProviderId) => void;
  disabled?: boolean;
}

/**
 * A payment-method switcher: a row of selectable cards, each with the provider's hosted
 * brand icon, label, and strap line. Reusable and prop-driven — it knows nothing about
 * flags or routing, so it drops into either assignment path (shopper-chooses, or a single
 * provider picked upstream). With one option it simply renders one card.
 */
export const PaymentProviderChooser = ({
  options,
  value,
  onChange,
  disabled = false,
}: PaymentProviderChooserProps) => (
  <div
    role="radiogroup"
    aria-label="Payment provider"
    className={`grid gap-2 ${options.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}
  >
    {options.map((option) => {
      const selected = option.id === value;
      return (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={selected}
          aria-label={option.label}
          disabled={disabled}
          onClick={() => {
            onChange(option.id);
          }}
          className={`flex items-center gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
            selected
              ? 'border-brand bg-brand/5 ring-1 ring-brand'
              : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <img
            src={providerIconUrl(option.id)}
            alt=""
            aria-hidden
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-md"
          />
          <span className="min-w-0">
            <span className="block font-semibold text-slate-800">{option.label}</span>
            <span className="block truncate text-xs text-slate-500">{option.tagline}</span>
          </span>
        </button>
      );
    })}
  </div>
);
