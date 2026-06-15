import type { FastifyInstance } from 'fastify';
import type { Context } from 'unleash-client';
import {
  buildBasket,
  computeBreakdown,
  DEFAULT_PAYMENT_PROVIDER,
  isPaymentProviderId,
  money,
  resolvePromo,
  type CreatePaymentRequest,
  type PaymentProviderId,
} from '@gift-store/commerce';
import type { Config } from '../support/config';
import { metrics } from '../support/observability';
import type { ImpactMetrics } from '../support/impact-metrics';
import { requestContext } from '../support/request-context';
import { attachPayment, createOrder, getOrder, setOrderCharge, setOrderState } from './order-store';
import { toPublicOrder } from './order-view';
import {
  ProviderPaymentError,
  type PaymentProviderStrategy,
  type ProviderPayment,
} from '../payments/provider';

/** Injected so the route is trivially testable without Unleash or a live provider. */
export interface OrderingDeps {
  readonly isPromoEnabled: (context: Context) => boolean;
  /** Resolve the routing strategy for a chosen provider (the factory). */
  readonly getPaymentProvider: (id?: PaymentProviderId) => PaymentProviderStrategy;
  /** Push Unleash Impact Metrics for the provider-request + checkout outcomes. */
  readonly impactMetrics: ImpactMetrics;
}

export const registerOrderingRoutes = (
  app: FastifyInstance,
  config: Config,
  deps: OrderingDeps,
): void => {
  app.post<{ Body: CreatePaymentRequest }>('/checkout/pay', async (req, reply) => {
    const { selection, shipping, promoCode, customer, provider } = req.body;
    const basket = buildBasket(selection);
    if (basket.items.length === 0) {
      return reply.code(400).send({ error: 'Basket is empty' });
    }

    // The flag is enforced server-side: a client-side toolbar override cannot apply a promo.
    const promoEnabled = deps.isPromoEnabled(requestContext(req, config, customer?.id));
    if (promoCode && !promoEnabled) {
      req.log.warn({ promoCode }, 'Promo code ignored: the promo-code flag is OFF');
    }
    const promo = promoEnabled ? resolvePromo(promoCode) : null;
    const breakdown = computeBreakdown(basket, { promo });

    // Resolve the routing strategy. An unknown/unregistered selection falls back to the
    // default inside the factory; `strategy.id` is the provider we actually routed to.
    const requested = isPaymentProviderId(provider) ? provider : DEFAULT_PAYMENT_PROVIDER;
    const strategy = deps.getPaymentProvider(requested);

    const order = createOrder({
      breakdown,
      shipping,
      provider: strategy.id,
      environment: config.environment,
    });
    let payment: ProviderPayment;
    try {
      payment = await strategy.createPayment(config, {
        reference: order.id,
        amountCents: breakdown.total.amountCents,
        currency: breakdown.total.currency,
        description: `FeatureOps Gift order ${order.id}`,
        returnUrl: `${config.publicWebUrl}/?order=${order.id}`,
        webhookUrl: `${config.publicApiUrl}/checkout/webhook`,
        environment: config.environment,
      });
    } catch (err) {
      // The provider failed to open a session (the redirect leg). This is both an erroneous
      // payment and an unsuccessful checkout: fail the order and record both impact metrics.
      const errorCode = err instanceof ProviderPaymentError ? err.errorCode : 'unknown_provider_error';
      setOrderState(order.id, 'failed');
      deps.impactMetrics.recordProviderRedirectError();
      deps.impactMetrics.recordCheckoutError();
      req.log.warn({ orderId: order.id, provider: strategy.id, errorCode }, 'Payment session creation failed');
      return reply.code(502).send({ error: 'payment_provider_unavailable', errorCode, orderId: order.id });
    }

    attachPayment(order.id, payment.paymentId);
    // Record what the provider will actually charge ($0.00 in a sandbox environment).
    setOrderCharge(order.id, money(payment.amountChargedCents));
    metrics.paymentsCreated.inc();
    // The redirect leg succeeded; whether the checkout itself succeeds is only known at the webhook.
    deps.impactMetrics.recordProviderRedirectSuccess();
    req.log.info(
      {
        orderId: order.id,
        provider: strategy.id,
        paymentId: payment.paymentId,
        environment: config.environment,
        totalCents: breakdown.total.amountCents,
        chargedCents: payment.amountChargedCents,
      },
      'Payment session created',
    );

    return { orderId: order.id, redirectUrl: payment.redirectUrl };
  });

  app.get<{ Params: { id: string } }>('/checkout/orders/:id', (req, reply) => {
    const order = getOrder(req.params.id);
    if (!order) {
      return reply.code(404).send({ error: 'Order not found' });
    }
    return toPublicOrder(order);
  });
};
