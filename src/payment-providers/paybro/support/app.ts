import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config';
import { loggerOptions } from './logging';
import {
  createPayment,
  getPayment,
  setStatus,
  type NewPayment,
  type Payment,
} from '../payment/store';
import { renderPaymentPage } from '../payment/page';
import { PAYBRO_FAVICON_SVG, PAYBRO_LOGO_SVG } from '../payment/brand';
import { ENVIRONMENTS, isEnvironment } from './environment';

export interface PayBroDeps {
  /** Notify the merchant of the final outcome (the webhook). Injected for testability. */
  readonly notifyMerchant: (payment: Payment) => Promise<void>;
}

export const buildApp = (config: Config, deps: PayBroDeps): FastifyInstance => {
  const app = Fastify({ logger: loggerOptions(config) });

  // The hosted page's Pay/Cancel buttons are plain HTML <form> POSTs, which the
  // browser sends as application/x-www-form-urlencoded. The decision rides in the
  // query string, so we don't need the body parsed — just accept the media type
  // instead of letting Fastify reject it with a 415.
  app.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'string' },
    (_req, body, done) => {
      done(null, body);
    },
  );

  app.get('/health', () => ({ status: 'ok' }));

  app.get('/favicon.svg', (_req, reply) =>
    reply.header('content-type', 'image/svg+xml').send(PAYBRO_FAVICON_SVG),
  );

  // --- Provider API: the merchant backend calls this server-to-server ---
  app.post<{ Body: NewPayment }>('/api/payments', (req, reply) => {
    // The environment rides in from the merchant over HTTP and decides the sandbox $0.00 rule,
    // so narrow it at the boundary rather than trusting a raw string.
    if (!isEnvironment(req.body.environment)) {
      return reply
        .code(400)
        .send({ error: `Invalid environment: expected one of ${ENVIRONMENTS.join(', ')}.` });
    }
    const payment = createPayment(req.body);
    req.log.info(
      {
        paymentId: payment.paymentId,
        reference: payment.reference,
        environment: payment.environment,
        amountChargedCents: payment.amountChargedCents,
      },
      'Payment created',
    );
    return reply.code(201).send({
      paymentId: payment.paymentId,
      redirectUrl: `${config.publicUrl}/pay/${payment.paymentId}`,
      status: payment.status,
      // Echo both quotes so the merchant can record what was requested vs. charged.
      amountRequestedCents: payment.amountCents,
      amountChargedCents: payment.amountChargedCents,
    });
  });

  // --- Hosted page: the shopper's browser is redirected here ---
  app.get<{ Params: { id: string } }>('/pay/:id', (req, reply) => {
    const payment = getPayment(req.params.id);
    if (!payment) {
      return reply.code(404).type('text/html').send('<h1>Unknown PayBro payment</h1>');
    }
    return reply.type('text/html').send(renderPaymentPage(payment, PAYBRO_LOGO_SVG));
  });

  app.post<{ Params: { id: string }; Querystring: { decision?: string } }>(
    '/pay/:id/confirm',
    async (req, reply) => {
      const payment = getPayment(req.params.id);
      if (!payment) {
        return reply.code(404).send({ error: 'unknown payment' });
      }
      // PayBro is rock-solid: it never injects failures. A genuine decline is the only way to
      // fail, and it carries no error code — the same webhook shape Dashed uses.
      const status = req.query.decision === 'decline' ? 'failed' : 'paid';
      const errorCode: string | undefined = undefined;
      setStatus(payment.paymentId, status);

      try {
        await deps.notifyMerchant({ ...payment, status, errorCode });
      } catch (err) {
        req.log.error({ err }, 'Failed to notify merchant webhook');
      }

      const separator = payment.returnUrl.includes('?') ? '&' : '?';
      return reply.redirect(`${payment.returnUrl}${separator}status=${status}`, 303);
    },
  );

  return app;
};
