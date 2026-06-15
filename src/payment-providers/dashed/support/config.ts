import { type Environment, parseEnvironment } from './environment';

/** Dashed runs as a standalone party — it shares no config or code with the merchant. */
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
  const port = toInt(env.DASHED_PORT, 8401);
  return {
    environment: parseEnvironment(env.NODE_ENV),
    logLevel: env.LOG_LEVEL ?? 'info',
    host: env.HOST ?? '0.0.0.0',
    port,
    publicUrl: env.DASHED_PUBLIC_URL ?? `http://localhost:${port.toString()}`,
    webhookSecret: env.DASHED_WEBHOOK_SECRET ?? 'dashed-dev-webhook-secret',
    appName: env.DASHED_APP_NAME ?? 'dashed',
  };
};
