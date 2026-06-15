import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type {
  CreatePaymentResponse,
  Order,
  PaymentProviderId,
  Product,
  ShippingAddress,
} from '@gift-store/commerce';
import { buildApp } from '../support/app';
import { loadConfig } from '../support/config';
import { ProviderPaymentError, type PaymentProviderStrategy } from '../payments/provider';
import type { ImpactMetrics } from '../support/impact-metrics';

/** A recording impact-metrics fake: a no-op for routing, plus a log of which counters fired. */
type MetricName = keyof ImpactMetrics;
const recordingImpactMetrics = (): { metrics: ImpactMetrics; calls: MetricName[] } => {
  const calls: MetricName[] = [];
  const record = (name: MetricName) => (): void => {
    calls.push(name);
  };
  return {
    calls,
    metrics: {
      recordCheckoutSuccess: record('recordCheckoutSuccess'),
      recordCheckoutError: record('recordCheckoutError'),
      recordProviderRedirectSuccess: record('recordProviderRedirectSuccess'),
      recordProviderRedirectError: record('recordProviderRedirectError'),
      recordProviderAfterPaymentSuccess: record('recordProviderAfterPaymentSuccess'),
      recordProviderAfterPaymentError: record('recordProviderAfterPaymentError'),
    },
  };
};

const shipping: ShippingAddress = {
  fullName: 'Ada Lovelace',
  line1: '1 Analytical Way',
  city: 'London',
  postalCode: 'EC1A 1BB',
  country: 'United Kingdom',
};

/**
 * A fake strategy that records the routing decision, mirrors the sandbox $0.00 rule, and
 * verifies a per-provider header — enough to exercise routing without a live provider.
 */
const fakeStrategy = (id: PaymentProviderId): PaymentProviderStrategy => ({
  id,
  createPayment: (_config, input) =>
    Promise.resolve({
      paymentId: `pay_${id}_1`,
      redirectUrl: `https://${id}.test/pay/pay_${id}_1?ref=${input.reference}`,
      status: 'created',
      amountRequestedCents: input.amountCents,
      amountChargedCents: input.environment === 'development' ? 0 : input.amountCents,
    }),
  verifyWebhook: (_config, headers) => headers[`x-${id}-signature`] === `${id}-dev-webhook-secret`,
});

/** A factory over both fakes, so the route can route to whichever the request picks. */
const fakeProviders = (id?: PaymentProviderId): PaymentProviderStrategy =>
  fakeStrategy(id ?? 'paybro');

describe('checkout happy path', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(loadConfig({ NODE_ENV: 'development', LOG_LEVEL: 'silent' }), {
      isPromoEnabled: () => true,
      isProductImagesEnabled: () => false,
      getPaymentProvider: fakeProviders,
      impactMetrics: recordingImpactMetrics().metrics,
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('given a basket with a valid promo, when paying, then it returns a redirect and a discounted pending order', async () => {
    const payRes = await app.inject({
      method: 'POST',
      url: '/checkout/pay',
      payload: {
        selection: { items: [{ productId: 'featureops-hoodie', quantity: 1 }] },
        shipping,
        promoCode: 'SAVE10',
      },
    });

    expect(payRes.statusCode).toBe(200);
    const payment = payRes.json<CreatePaymentResponse>();
    expect(payment.orderId).toBeTruthy();
    expect(payment.redirectUrl).toContain('/pay/');

    const orderRes = await app.inject({
      method: 'GET',
      url: `/checkout/orders/${payment.orderId}`,
    });
    expect(orderRes.statusCode).toBe(200);
    const order = orderRes.json<Order>();
    expect(order.state).toBe('pending');
    // The promo flag is ON in this test, so the discount must be applied.
    expect(order.breakdown.discount.amountCents).toBeGreaterThan(0);
    // The default config environment is development → a sandbox order charged $0.00,
    // while the requested total (breakdown.total) stays the real amount.
    expect(order.environment).toBe('development');
    expect(order.amountCharged.amountCents).toBe(0);
    expect(order.breakdown.total.amountCents).toBeGreaterThan(0);
    // No provider was requested → routed to (and recorded as) the default, PayBro.
    expect(order.provider).toBe('paybro');
  });

  it('given an explicit provider, when paying, then the order is routed to and records it', async () => {
    const payRes = await app.inject({
      method: 'POST',
      url: '/checkout/pay',
      payload: {
        selection: { items: [{ productId: 'featureops-hoodie', quantity: 1 }] },
        shipping,
        provider: 'dashed',
      },
    });
    expect(payRes.statusCode).toBe(200);
    const payment = payRes.json<CreatePaymentResponse>();
    expect(payment.redirectUrl).toContain('dashed.test');

    const order = (
      await app.inject({ method: 'GET', url: `/checkout/orders/${payment.orderId}` })
    ).json<Order>();
    expect(order.provider).toBe('dashed');
  });

  it('given a Dashed order, when its webhook arrives, then the Dashed signature validates it', async () => {
    const payment = (
      await app.inject({
        method: 'POST',
        url: '/checkout/pay',
        payload: {
          selection: { items: [{ productId: 'featureops-hoodie', quantity: 1 }] },
          shipping,
          provider: 'dashed',
        },
      })
    ).json<CreatePaymentResponse>();

    // A PayBro-signed callback must NOT validate a Dashed order.
    const wrong = await app.inject({
      method: 'POST',
      url: '/checkout/webhook',
      headers: { 'x-paybro-signature': 'paybro-dev-webhook-secret' },
      payload: { reference: payment.orderId, paymentId: 'pay_dashed_1', status: 'paid' },
    });
    expect(wrong.statusCode).toBe(401);

    const ok = await app.inject({
      method: 'POST',
      url: '/checkout/webhook',
      headers: { 'x-dashed-signature': 'dashed-dev-webhook-secret' },
      payload: { reference: payment.orderId, paymentId: 'pay_dashed_1', status: 'paid' },
    });
    expect(ok.statusCode).toBe(204);

    const order = (
      await app.inject({ method: 'GET', url: `/checkout/orders/${payment.orderId}` })
    ).json<Order>();
    expect(order.state).toBe('paid');
  });
});

describe('checkout error paths (impact metrics)', () => {
  /** A strategy whose session creation always fails, like Dashed's injected redirect failure. */
  const failingCreateStrategy: PaymentProviderStrategy = {
    id: 'dashed',
    createPayment: () =>
      Promise.reject(new ProviderPaymentError('dashed', 'PAYMENT_INIT_FAILED', 502)),
    verifyWebhook: (_config, headers) =>
      headers['x-dashed-signature'] === 'dashed-dev-webhook-secret',
  };

  it('given the provider fails to create a session, when paying, then it 502s, fails the order, and records error metrics', async () => {
    const recorder = recordingImpactMetrics();
    const app = await buildApp(loadConfig({ NODE_ENV: 'development', LOG_LEVEL: 'silent' }), {
      isPromoEnabled: () => true,
      isProductImagesEnabled: () => false,
      getPaymentProvider: () => failingCreateStrategy,
      impactMetrics: recorder.metrics,
    });
    try {
      const payRes = await app.inject({
        method: 'POST',
        url: '/checkout/pay',
        payload: {
          selection: { items: [{ productId: 'featureops-hoodie', quantity: 1 }] },
          shipping,
          provider: 'dashed',
        },
      });
      expect(payRes.statusCode).toBe(502);
      const body = payRes.json<{ error: string; errorCode: string; orderId: string }>();
      expect(body.errorCode).toBe('PAYMENT_INIT_FAILED');

      const order = (
        await app.inject({ method: 'GET', url: `/checkout/orders/${body.orderId}` })
      ).json<Order>();
      expect(order.state).toBe('failed');

      expect(recorder.calls).toContain('recordProviderRedirectError');
      expect(recorder.calls).toContain('recordCheckoutError');
      expect(recorder.calls).not.toContain('recordProviderRedirectSuccess');
    } finally {
      await app.close();
    }
  });

  it('given a failed webhook, when it arrives, then the order fails and after-payment + checkout errors are recorded', async () => {
    const recorder = recordingImpactMetrics();
    const app = await buildApp(loadConfig({ NODE_ENV: 'development', LOG_LEVEL: 'silent' }), {
      isPromoEnabled: () => true,
      isProductImagesEnabled: () => false,
      getPaymentProvider: fakeProviders,
      impactMetrics: recorder.metrics,
    });
    try {
      const payment = (
        await app.inject({
          method: 'POST',
          url: '/checkout/pay',
          payload: {
            selection: { items: [{ productId: 'featureops-hoodie', quantity: 1 }] },
            shipping,
            provider: 'dashed',
          },
        })
      ).json<CreatePaymentResponse>();

      const webhook = await app.inject({
        method: 'POST',
        url: '/checkout/webhook',
        headers: { 'x-dashed-signature': 'dashed-dev-webhook-secret' },
        payload: {
          reference: payment.orderId,
          paymentId: 'pay_dashed_1',
          status: 'failed',
          errorCode: 'PAYMENT_CAPTURE_FAILED',
        },
      });
      expect(webhook.statusCode).toBe(204);

      const order = (
        await app.inject({ method: 'GET', url: `/checkout/orders/${payment.orderId}` })
      ).json<Order>();
      expect(order.state).toBe('failed');

      expect(recorder.calls).toContain('recordProviderAfterPaymentError');
      expect(recorder.calls).toContain('recordCheckoutError');
    } finally {
      await app.close();
    }
  });
});

describe('catalog product images (back-end evaluated)', () => {
  const build = (productImagesOn: boolean): Promise<FastifyInstance> =>
    buildApp(loadConfig({ NODE_ENV: 'development', LOG_LEVEL: 'silent' }), {
      isPromoEnabled: () => true,
      isProductImagesEnabled: () => productImagesOn,
      getPaymentProvider: fakeProviders,
      impactMetrics: recordingImpactMetrics().metrics,
    });

  it('given the product-images flag is OFF, when fetching the catalog, then no image URLs are returned', async () => {
    const app = await build(false);
    try {
      const res = await app.inject({ method: 'GET', url: '/catalog' });
      expect(res.statusCode).toBe(200);
      const catalog = res.json<Product[]>();
      expect(catalog.length).toBeGreaterThan(0);
      expect(catalog.every((product) => product.imageUrl === undefined)).toBe(true);
    } finally {
      await app.close();
    }
  });

  it('given the product-images flag is ON, when fetching the catalog, then every product carries an image URL', async () => {
    const app = await build(true);
    try {
      const res = await app.inject({ method: 'GET', url: '/catalog' });
      expect(res.statusCode).toBe(200);
      const catalog = res.json<Product[]>();
      expect(catalog.length).toBeGreaterThan(0);
      expect(catalog.every((product) => typeof product.imageUrl === 'string')).toBe(true);
    } finally {
      await app.close();
    }
  });
});
