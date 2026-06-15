import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { Context } from 'unleash-client';
import type { PaymentProviderId } from '@gift-store/commerce';
import type { Config } from './config';
import { loggerOptions, registry } from './observability';
import type { ImpactMetrics } from './impact-metrics';
import { registerCatalogRoutes } from '../catalog/routes';
import { registerOrderingRoutes } from '../ordering/routes';
import { registerPaymentRoutes } from '../payments/routes';
import type { PaymentProviderStrategy } from '../payments/provider';

/** Everything the capability routes need injected — flag reads plus the provider factory. */
export interface AppDeps {
  readonly isPromoEnabled: (context: Context) => boolean;
  /** When ON, the catalog endpoint attaches image URLs — evaluated server-side per request. */
  readonly isProductImagesEnabled: (context: Context) => boolean;
  /** Resolve the routing strategy for a chosen provider (the factory). */
  readonly getPaymentProvider: (id?: PaymentProviderId) => PaymentProviderStrategy;
  /** Push Unleash Impact Metrics for checkout + provider-request outcomes. */
  readonly impactMetrics: ImpactMetrics;
}

/** Builds the configured Fastify app. Pure factory — no network, no listening. */
export const buildApp = async (config: Config, deps: AppDeps): Promise<FastifyInstance> => {
  const app = Fastify({ logger: loggerOptions(config) });

  await app.register(cors, {
    origin: config.publicWebUrl,
    // Allow the cross-cutting targeting headers the browser sends on checkout and the
    // catalog fetch (x-user-id + x-email power the back-end product-images evaluation).
    allowedHeaders: ['content-type', 'x-user-id', 'x-session-id', 'x-region', 'x-email'],
  });

  app.get('/health', () => ({ status: 'ok' }));

  app.get('/metrics', async (_req, reply) => {
    const body = await registry.metrics();
    return reply.header('content-type', registry.contentType).send(body);
  });

  registerCatalogRoutes(app, config, deps);
  registerOrderingRoutes(app, config, deps);
  registerPaymentRoutes(app, config, deps);
  return app;
};
