/**
 * Which payment provider the merchant routes a checkout to.
 *
 * This is the merchant's *selection* contract — a stable id plus presentation
 * metadata — shared by the web app (to render a chooser) and the backend (to pick a
 * routing strategy). It deliberately models nothing about how any provider works:
 * each provider stays an external party with its own contract (see the back end's
 * `payment-providers/` strategies). Adding a provider here is a descriptor + an id;
 * wiring it to route is a separate, one-line step on each side.
 */

export type PaymentProviderId = 'paybro' | 'dashed';

export interface PaymentProviderOption {
  readonly id: PaymentProviderId;
  /** Shown on the chooser, e.g. "PayBro". */
  readonly label: string;
  /** One-line strap line under the label. */
  readonly tagline: string;
}

// Descriptors for every provider the system *can* route to. They exist up front so
// enabling one is a single edit (add it to PAYMENT_PROVIDERS / register its strategy).
export const PAYBRO_OPTION: PaymentProviderOption = {
  id: 'paybro',
  label: 'PayBro',
  tagline: 'Our retro payment partner',
};

export const DASHED_OPTION: PaymentProviderOption = {
  id: 'dashed',
  label: 'Dashed',
  tagline: 'The modern, dashing alternative',
};

/**
 * The providers the storefront offers *today*. PayBro only for now — adding
 * `DASHED_OPTION` here (and registering its strategy in the back end) turns the
 * chooser into a real switcher. Left as an exercise for the workshop.
 */
export const PAYMENT_PROVIDERS: readonly PaymentProviderOption[] = [PAYBRO_OPTION];

/** Used when a request omits a provider — keeps the contract backward compatible. */
export const DEFAULT_PAYMENT_PROVIDER: PaymentProviderId = 'paybro';

export const isPaymentProviderId = (value: unknown): value is PaymentProviderId =>
  value === 'paybro' || value === 'dashed';
