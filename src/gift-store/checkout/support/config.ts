import { type Environment, parseEnvironment } from '@gift-store/commerce';

/** Runtime configuration, resolved from the environment with safe local defaults. */
export interface Config {
  readonly environment: Environment;
  readonly logLevel: string;
  readonly host: string;
  readonly port: number;
  readonly publicWebUrl: string;
  readonly publicApiUrl: string;
  readonly paybroUrl: string;
  readonly paybroWebhookSecret: string;
  readonly dashedUrl: string;
  readonly dashedWebhookSecret: string;
  readonly unleashUrl: string;
  readonly unleashApiToken: string;
  readonly appName: string;
}

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value ? parsed : fallback;
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => ({
  environment: parseEnvironment(env.NODE_ENV),
  logLevel: env.LOG_LEVEL ?? 'info',
  host: env.HOST ?? '0.0.0.0',
  port: toInt(env.PORT, 8081),
  publicWebUrl: env.PUBLIC_WEB_URL ?? 'http://localhost:8080',
  publicApiUrl: env.PUBLIC_API_URL ?? 'http://localhost:8081',
  paybroUrl: env.PAYBRO_URL ?? 'http://localhost:8400',
  paybroWebhookSecret: env.PAYBRO_WEBHOOK_SECRET ?? 'paybro-dev-webhook-secret',
  dashedUrl: env.DASHED_URL ?? 'http://localhost:8401',
  dashedWebhookSecret: env.DASHED_WEBHOOK_SECRET ?? 'dashed-dev-webhook-secret',
  unleashUrl: env.UNLEASH_URL ?? '',
  unleashApiToken: env.UNLEASH_API_TOKEN ?? '',
  appName: env.APP_NAME ?? 'gift-store-api',
});
