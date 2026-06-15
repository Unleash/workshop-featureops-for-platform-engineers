import Fastify, { type FastifyInstance } from 'fastify';
import type { Config } from './config';
import { loggerOptions } from './logging';
import {
  createPayment,
  getPayment,
  setStatus,
  type NewPayment,
  type Payment,
  type PaymentStatus,
} from '../payment/store';
import { renderPaymentPage } from '../payment/page';
import { DASHED_FAVICON_SVG, DASHED_FINGERPRINT_SVG, DASHED_LOGO_SVG } from '../payment/brand';
import { ENVIRONMENTS, isEnvironment } from './environment';
import { PAYMENT_ERROR_CODES } from '../payment/error-codes';

export interface DashedDeps {
  /** Notify the merchant of the final outcome (the webhook). Injected for testability. */
  readonly notifyMerchant: (payment: Payment) => Promise<void>;
  /** Mode B — fail session creation (the redirect leg). Omitted ⇒ never fails. */
  readonly shouldFailCreate?: () => boolean;
  /** Mode A — fail a would-be-successful capture (the after-payment leg). Omitted ⇒ never. */
  readonly shouldFailConfirm?: () => boolean;
}

export const buildApp = (config: Config, deps: DashedDeps): FastifyInstance => {
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
    reply.header('content-type', 'image/svg+xml').send(DASHED_FAVICON_SVG),
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
    // Mode B: Dashed occasionally fails to open a session (any environment). The merchant's
    // strategy sees the non-OK response, reads the unified code, and fails the checkout.
    if (deps.shouldFailCreate?.()) {
      req.log.warn({ reference: req.body.reference }, 'Payment session init failed');
      return reply.code(502).send({ errorCode: PAYMENT_ERROR_CODES.PAYMENT_INIT_FAILED });
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
      return reply.code(404).type('text/html').send('<h1>Unknown Dashed payment</h1>');
    }
    return reply
      .type('text/html')
      .send(renderPaymentPage(payment, DASHED_LOGO_SVG, DASHED_FINGERPRINT_SVG));
  });

  app.post<{ Params: { id: string }; Querystring: { decision?: string } }>(
    '/pay/:id/confirm',
    async (req, reply) => {
      const payment = getPayment(req.params.id);
      if (!payment) {
        return reply.code(404).send({ error: 'unknown payment' });
      }
      let status: PaymentStatus = req.query.decision === 'decline' ? 'failed' : 'paid';
      let errorCode: string | undefined;
      // Mode A: in production only, ~1/3 of would-be-successful captures fail. Sandbox is
      // unaffected, and a genuine decline keeps its own failed path (no injected code).
      if (status === 'paid' && payment.environment === 'production' && deps.shouldFailConfirm?.()) {
        status = 'failed';
        errorCode = PAYMENT_ERROR_CODES.PAYMENT_CAPTURE_FAILED;
        req.log.warn({ paymentId: payment.paymentId }, 'Payment capture failed');
      }
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
