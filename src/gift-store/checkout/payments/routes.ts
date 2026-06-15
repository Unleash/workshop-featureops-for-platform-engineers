import type { FastifyInstance } from 'fastify';
import type { PaymentProviderId } from '@gift-store/commerce';
import type { Config } from '../support/config';
import { metrics } from '../support/observability';
import type { ImpactMetrics } from '../support/impact-metrics';
import { getOrder, setOrderState } from '../ordering/order-store';
import type { PaymentProviderStrategy } from './provider';

interface WebhookBody {
  reference: string;
  paymentId: string;
  status: 'paid' | 'failed';
  /** Unified provider error code on a failed capture (the after-payment leg). */
  errorCode?: string;
}

/** Injected so the webhook is testable with a fake provider factory. */
export interface PaymentDeps {
  /** Resolve the routing strategy for the order's provider (verifies the callback). */
  readonly getPaymentProvider: (id?: PaymentProviderId) => PaymentProviderStrategy;
  /** Push Unleash Impact Metrics for the provider-request + checkout outcomes. */
  readonly impactMetrics: ImpactMetrics;
}

export const registerPaymentRoutes = (
  app: FastifyInstance,
  config: Config,
  deps: PaymentDeps,
): void => {
  app.post<{ Body: WebhookBody }>('/checkout/webhook', (req, reply) => {
    const { reference, status, errorCode } = req.body;
    // Resolve the order first so we can verify the callback with *its* provider's scheme
    // (PayBro and Dashed sign with different headers/secrets).
    const order = getOrder(reference);
    if (!order) {
      return reply.code(404).send({ error: 'unknown order' });
    }
    const strategy = deps.getPaymentProvider(order.provider);
    if (!strategy.verifyWebhook(config, req.headers)) {
      return reply.code(401).send({ error: 'invalid signature' });
    }
    setOrderState(reference, status === 'paid' ? 'paid' : 'failed');
    metrics.checkoutCompleted.inc({ status });
    // The provider's confirmation is the after-payment leg: a failed capture is both an
    // erroneous payment and an unsuccessful checkout.
    if (status === 'paid') {
      deps.impactMetrics.recordProviderAfterPaymentSuccess();
      deps.impactMetrics.recordCheckoutSuccess();
    } else {
      deps.impactMetrics.recordProviderAfterPaymentError();
      deps.impactMetrics.recordCheckoutError();
    }
    req.log.info({ reference, provider: strategy.id, status, errorCode }, 'Provider webhook processed');
    return reply.code(204).send();
  });
};
