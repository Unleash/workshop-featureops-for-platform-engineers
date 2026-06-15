import client from 'prom-client';
import type { FastifyServerOptions } from 'fastify';
import type { Config } from './config';
import { metricPrefix } from './feature-flags';

/**
 * Prometheus registry with default process metrics + our business metrics. Every metric name is
 * prefixed with this project's `pNNN_` (see `metricPrefix`) so scrapes across attendee projects
 * never collide — the same convention used for flag names and context fields.
 */
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry, prefix: metricPrefix });

export const metrics = {
  paymentsCreated: new client.Counter({
    name: `${metricPrefix}payments_created_total`,
    help: 'Number of payment sessions created with the provider.',
    registers: [registry],
  }),
  checkoutCompleted: new client.Counter({
    name: `${metricPrefix}checkout_completed_total`,
    help: 'Number of checkouts resolved via a provider webhook.',
    labelNames: ['status'] as const,
    registers: [registry],
  }),
};

/** Structured logging: JSON to stdout in prod, pretty-printed otherwise, silenced when LOG_LEVEL=silent. */
export const loggerOptions = (config: Config): FastifyServerOptions['logger'] => {
  if (config.logLevel === 'silent') return false;
  if (config.environment === 'production') return { level: config.logLevel };
  return {
    level: config.logLevel,
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    },
  };
};
