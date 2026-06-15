/**
 * Shared checkout domain — the contract between the web app (`@gift-store/storefront`)
 * and the checkout backend (`@gift-store/checkout`). Money is always integer cents to avoid
 * float drift.
 *
 * The module is split by responsibility (money, catalog, basket, promo, pricing, order); this
 * barrel re-exports the full surface so consumers keep importing from `@gift-store/commerce`.
 *
 * NOTE: no payment provider is modelled here. Each is an external party with its own
 * contract (see the back end's `payments/` strategies); nothing from a provider
 * leaks into the merchant domain. What we *do* model is the merchant's choice of which
 * provider to route to — a stable id plus presentation metadata (`payment-providers`).
 */

export * from './environment';
export * from './money';
export * from './catalog';
export * from './basket';
export * from './promo';
export * from './pricing';
export * from './order';
export * from './payment-providers';
