# Expected cleanup PR — reviewer checklist

When the promo-code flag is completed (kept, fully rolled out) and Copilot acts on the issue, the PR it opens should touch the files below and no others. Use this as a review aid — if the diff strays from this surface, push back on it.

The flag is `pNNN_rl_checkout-page_payment-section_promo-code` (a `release` flag, tagged `BackEnd+FrontEnd`). The goal: **delete the flag check, keep the enabled path** (promo codes always accepted).

> ⚠️ Merging this PR removes the repository's flagship promo-code demo. Review and close it, or run the whole flow on a throwaway branch. This example commits the _wiring_, never the removal.

## Provisioner (infrastructure)

- `support/infrastructure/unleash-provisioner/src/flags/flags.ts` — drop the `FlagDef` whose
  `suffix` is `rl_checkout-page_payment-section_promo-code`.
- `support/infrastructure/unleash-provisioner/src/flags/tags.ts` — drop its `FLAG_LAYER` entry.

## Backend — checkout API (the load-bearing change; flags are enforced server-side)

- `src/gift-store/checkout/support/feature-flags.ts` — remove `FLAGS.promoCode`.
- `src/gift-store/checkout/index.ts` — drop the `isPromoEnabled` dependency wiring.
- `src/gift-store/checkout/support/app.ts` — remove `isPromoEnabled` from the deps interface.
- `src/gift-store/checkout/ordering/routes.ts` — remove the `promoEnabled` gate and the "flag OFF"
  warning; always `resolvePromo(...)` and apply the discount.
- `src/gift-store/checkout/support/impact-metrics.ts` — touch up the comment referencing the dep.

## Frontend — storefront (UX; follows the backend)

- `src/gift-store/storefront/support/feature-flags.ts` — remove `FLAGS.promoCode` and the
  `usePromoCodeFlag` hook.
- `src/gift-store/storefront/checkout/Checkout.tsx` — drop `usePromoCodeFlag`/`promoEnabled`; pass
  the promo through unconditionally.
- `src/gift-store/storefront/payments/Payment.tsx` — remove the `promoEnabled` prop; always render
  `<PromoField>`.
- `src/gift-store/storefront/payments/PromoField.tsx` — stays (the field itself; no flag logic).

## Keep — flag-independent promo logic (reword stale comments only)

- `src/gift-store/commerce/promo.ts`, `pricing.ts`, `order.ts` — the rolled-out behavior; keep.
  Reword any "only when the flag confirmed" comments.

## Tests

- `src/gift-store/checkout/test/checkout.test.ts` — drop the `isPromoEnabled` setup and any
  flag-OFF case; keep "valid promo applies discount".
- `src/gift-store/storefront/test/payment.test.tsx` — drop the flag-OFF "field hidden" case and the
  `promoEnabled` prop; assert the field always renders.
- `src/gift-store/commerce/test/pricing.test.ts` — unchanged (flag-independent).
