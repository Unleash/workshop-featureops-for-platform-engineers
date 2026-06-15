import { buildApp } from './support/app';
import { loadConfig } from './support/config';
import { getPaymentProvider } from './payments/router';
import {
  FLAGS,
  getUnleash,
  isFlagEnabled,
  startFeatureFlags,
  stopFeatureFlags,
} from './support/feature-flags';
import { impactMetrics, startImpactMetrics, stopImpactMetrics } from './support/impact-metrics';

const main = async (): Promise<void> => {
  const config = loadConfig();

  const app = await buildApp(config, {
    isPromoEnabled: (context) => isFlagEnabled(FLAGS.promoCode, context),
    isProductImagesEnabled: (context) => isFlagEnabled(FLAGS.productImages, context),
    getPaymentProvider,
    impactMetrics,
  });

  await startFeatureFlags(config, app.log);
  // The client exists once `startFeatureFlags` returns (or stays undefined when the token is
  // empty — then impact metrics no-op, just like flag reads).
  startImpactMetrics(getUnleash(), app.log);

  const shutdown = (signal: string): void => {
    app.log.info({ signal }, 'Shutting down');
    void app
      .close()
      .then(() => {
        stopImpactMetrics();
        stopFeatureFlags();
        process.exit(0);
      })
      .catch((err: unknown) => {
        app.log.error({ err }, 'Error during shutdown');
        process.exit(1);
      });
  };
  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });

  await app.listen({ host: config.host, port: config.port });
};

void main();
