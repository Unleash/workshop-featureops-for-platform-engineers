import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../support/app';
import { loadConfig } from '../support/config';
import type { Payment } from '../payment/store';

describe('PayBro hosted payment', () => {
  let app: FastifyInstance;
  const notified: Payment[] = [];

  beforeAll(async () => {
    app = buildApp(loadConfig({ NODE_ENV: 'development', LOG_LEVEL: 'silent' }), {
      notifyMerchant: (payment) => {
        notified.push(payment);
        return Promise.resolve();
      },
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('given a created payment, when the shopper pays, then it is marked paid and the merchant is notified', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/payments',
      payload: {
        reference: 'order-1',
        amountCents: 5400,
        currency: 'USD',
        description: 'FeatureOps Gift order order-1',
        returnUrl: 'http://localhost:8080/?order=order-1',
        webhookUrl: 'http://localhost:8081/checkout/webhook',
        environment: 'production',
      },
    });
    expect(created.statusCode).toBe(201);
    const session = created.json<{
      paymentId: string;
      redirectUrl: string;
      amountRequestedCents: number;
      amountChargedCents: number;
    }>();
    expect(session.redirectUrl).toContain('/pay/');
    // Production charges in full: requested == charged.
    expect(session.amountRequestedCents).toBe(5400);
    expect(session.amountChargedCents).toBe(5400);

    const page = await app.inject({ method: 'GET', url: `/pay/${session.paymentId}` });
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('PayBro');
    expect(page.body).toContain('$54.00 USD');
    // No sandbox note rendered in production (the CSS class is always present; the copy is not).
    expect(page.body).not.toContain('Sandbox / test environment');

    const confirm = await app.inject({
      method: 'POST',
      url: `/pay/${session.paymentId}/confirm?decision=pay`,
    });
    expect(confirm.statusCode).toBe(303);
    expect(confirm.headers.location).toContain('status=paid');
    expect(notified).toHaveLength(1);
    expect(notified[0]?.status).toBe('paid');
    expect(notified[0]?.amountChargedCents).toBe(5400);
  });

  it('given a development payment, when creating it, then it is a $0.00 sandbox charge with the requested amount struck through', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/payments',
      payload: {
        reference: 'order-dev',
        amountCents: 5400,
        currency: 'USD',
        description: 'FeatureOps Gift order order-dev',
        returnUrl: 'http://localhost:8080/?order=order-dev',
        webhookUrl: 'http://localhost:8081/checkout/webhook',
        environment: 'development',
      },
    });
    expect(created.statusCode).toBe(201);
    const session = created.json<{ paymentId: string; amountChargedCents: number }>();
    // Sandbox: nothing is charged, but the requested amount is still reported.
    expect(session.amountChargedCents).toBe(0);

    const page = await app.inject({ method: 'GET', url: `/pay/${session.paymentId}` });
    expect(page.statusCode).toBe(200);
    // Headline shows the $0.00 charge; the requested amount is struck through with a note.
    expect(page.body).toContain('$0.00 USD');
    expect(page.body).toContain('Sandbox / test environment');
    expect(page.body).toContain('$54.00 USD');
  });

  it('given an unrecognised environment, when creating a payment, then it is rejected with a 400', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/payments',
      payload: {
        reference: 'order-bad',
        amountCents: 5400,
        currency: 'USD',
        description: 'FeatureOps Gift order order-bad',
        returnUrl: 'http://localhost:8080/?order=order-bad',
        webhookUrl: 'http://localhost:8081/checkout/webhook',
        environment: 'staging',
      },
    });
    expect(created.statusCode).toBe(400);
    expect(created.json<{ error: string }>().error).toContain('Invalid environment');
  });
});
