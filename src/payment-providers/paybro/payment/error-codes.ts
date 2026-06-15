/**
 * Unified payment error codes. These strings are intentionally repeated verbatim in every
 * payment provider (no shared module) — each provider is a standalone party, and the codes
 * are a wire contract the merchant relies on, not shared internal code.
 */
export const PAYMENT_ERROR_CODES = {
  /** Provider could not initialize the payment session (the redirect-to leg). */
  PAYMENT_INIT_FAILED: 'PAYMENT_INIT_FAILED',
  /** Provider could not capture the payment after confirmation (the after-payment leg). */
  PAYMENT_CAPTURE_FAILED: 'PAYMENT_CAPTURE_FAILED',
} as const;

export type PaymentErrorCode = (typeof PAYMENT_ERROR_CODES)[keyof typeof PAYMENT_ERROR_CODES];
