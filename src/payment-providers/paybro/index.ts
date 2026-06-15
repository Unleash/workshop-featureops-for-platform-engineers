import { buildApp } from './support/app';
import { loadConfig } from './support/config';
import type { Payment } from './payment/store';

const main = async (): Promise<void> => {
  const config = loadConfig();

  const notifyMerchant = async (payment: Payment): Promise<void> => {
    const response = await fetch(payment.webhookUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-paybro-signature': config.webhookSecret,
      },
      body: JSON.stringify({
        reference: payment.reference,
        paymentId: payment.paymentId,
        status: payment.status,
        errorCode: payment.errorCode,
      }),
    });
    if (!response.ok) {
      throw new Error(`merchant webhook returned ${response.status.toString()}`);
    }
  };

  const app = buildApp(config, { notifyMerchant });

  const shutdown = (signal: string): void => {
    app.log.info({ signal }, 'Shutting down');
    void app
      .close()
      .then(() => {
        process.exit(0);
      })
      .catch(() => {
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
