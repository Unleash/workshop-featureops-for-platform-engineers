import { type Environment, parseEnvironment } from './environment';

/** PayBro runs as a standalone party — it shares no config or code with the merchant. */
export interface Config {
  readonly environment: Environment;
  readonly logLevel: string;
  readonly host: string;
  readonly port: number;
  readonly publicUrl: string;
  readonly webhookSecret: string;
  readonly appName: string;
}

const toInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value ? parsed : fallback;
};

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => {
  const port = toInt(env.PAYBRO_PORT, 8400);
  return {
    environment: parseEnvironment(env.NODE_ENV),
    logLevel: env.LOG_LEVEL ?? 'info',
    host: env.HOST ?? '0.0.0.0',
    port,
    publicUrl: env.PAYBRO_PUBLIC_URL ?? `http://localhost:${port.toString()}`,
    webhookSecret: env.PAYBRO_WEBHOOK_SECRET ?? 'paybro-dev-webhook-secret',
    appName: env.PAYBRO_APP_NAME ?? 'paybro',
  };
};
