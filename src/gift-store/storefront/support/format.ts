import type { Money } from '@gift-store/commerce';

/** Presentation-only money formatting (locale/i18n lives in the UI, not the domain). */
export const formatMoney = (value: Money): string =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: value.currency }).format(
    value.amountCents / 100,
  );
