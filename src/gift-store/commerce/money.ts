/**
 * Money primitives. Money is always integer cents to avoid float drift.
 *
 * Human formatting (currency symbols, locale, i18n) is a presentation concern and
 * lives in the UI layer that needs it (see `src/gift-store/storefront/support/format.ts`), NOT
 * in this shared domain package.
 */

export const CURRENCY = 'USD' as const;
export type Currency = typeof CURRENCY;

export interface Money {
  readonly amountCents: number;
  readonly currency: Currency;
}

export const money = (amountCents: number): Money => ({ amountCents, currency: CURRENCY });
