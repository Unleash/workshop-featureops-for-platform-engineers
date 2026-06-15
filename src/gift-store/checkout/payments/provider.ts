/**
 * The payment-provider Strategy seam. Each provider is an external party with the same
 * shape of interaction — create a hosted payment, then verify the webhook it calls back
 * with — but its own URL, wire format quirks, and signature scheme. A strategy captures
 * exactly that, so the checkout route stays provider-agnostic and routing is a map lookup
 * (see `router.ts`), never a `switch`.
 *
 * The merchant never imports a provider's internals; a strategy is the only seam.
 */
import type { IncomingHttpHeaders } from 'node:http';
import type { Environment, PaymentProviderId } from '@gift-store/commerce';
import type { Config } from '../support/config';

export interface ProviderPaymentInput {
  /** Our order id, echoed back on the webhook so we can reconcile. */
  readonly reference: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly description: string;
  readonly returnUrl: string;
  readonly webhookUrl: string;
  /** Our originating environment — providers charge $0.00 in a sandbox (development). */
  readonly environment: Environment;
}

export interface ProviderPayment {
  readonly paymentId: string;
  /** Provider-hosted page the browser is redirected to. */
  readonly redirectUrl: string;
  readonly status: 'created' | 'paid' | 'failed';
  /** What we asked the provider to charge. */
  readonly amountRequestedCents: number;
  /** What the provider will actually charge ($0.00 in a sandbox environment). */
  readonly amountChargedCents: number;
}

export interface PaymentProviderStrategy {
  readonly id: PaymentProviderId;
  /** Open a hosted payment session with the provider. */
  createPayment(config: Config, input: ProviderPaymentInput): Promise<ProviderPayment>;
  /** Verify an inbound webhook genuinely came from this provider. */
  verifyWebhook(config: Config, headers: IncomingHttpHeaders): boolean;
}

/**
 * Thrown when a provider rejects a `createPayment` call (the redirect leg). Carries the
 * provider's unified `errorCode` so the checkout can log it and surface it to the storefront.
 */
export class ProviderPaymentError extends Error {
  constructor(
    readonly provider: PaymentProviderId,
    readonly errorCode: string,
    readonly httpStatus: number,
  ) {
    super(`${provider} failed to create a payment (${httpStatus.toString()}): ${errorCode}`);
    this.name = 'ProviderPaymentError';
  }
}
