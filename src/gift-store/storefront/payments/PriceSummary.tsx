import type { ReactNode } from 'react';
import type { PriceBreakdown } from '@gift-store/commerce';
import { formatMoney } from '../support/format';

const Row = ({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
}) => (
  <div
    className={
      strong
        ? 'flex justify-between border-t border-slate-200 pt-2 text-base font-bold'
        : 'flex justify-between text-slate-600'
    }
  >
    <dt>{label}</dt>
    <dd className="tabular-nums">{value}</dd>
  </div>
);

/**
 * Shipping value styled by state: pulsing green when free (earned), rose when a fee is due.
 * (Rose, not orange/amber — that would clash with the development environment ribbon.)
 */
const ShippingValue = ({ breakdown }: { breakdown: PriceBreakdown }) => {
  if (breakdown.shipping.amountCents > 0) {
    return <span className="font-semibold text-rose-600">{formatMoney(breakdown.shipping)}</span>;
  }
  if (breakdown.subtotal.amountCents === 0) {
    return <span className="text-slate-500">Free</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-bold text-green-700 motion-safe:animate-pulse">
      ✨ Free
    </span>
  );
};

export interface PriceSummaryProps {
  breakdown: PriceBreakdown;
}

/** The itemised pricing breakdown: subtotal, optional discount, shipping, and total. */
export const PriceSummary = ({ breakdown }: PriceSummaryProps) => (
  <dl className="space-y-1 text-sm">
    <Row label="Subtotal" value={formatMoney(breakdown.subtotal)} />
    {breakdown.discount.amountCents > 0 && (
      <Row label="Discount" value={`− ${formatMoney(breakdown.discount)}`} />
    )}
    <Row label="Shipping" value={<ShippingValue breakdown={breakdown} />} />
    <Row label="Total" value={formatMoney(breakdown.total)} strong />
  </dl>
);
