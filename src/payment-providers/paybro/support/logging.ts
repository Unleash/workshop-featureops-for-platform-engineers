import type { FastifyServerOptions } from 'fastify';
import type { Config } from './config';

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
