import type { FastifyRequest } from 'fastify';
import type { Context } from 'unleash-client';
import type { Config } from './config';
import { contextKey } from './feature-flags';

/** Coerce a possibly-repeated header into a single string. */
export const headerStr = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/**
 * Assemble the Unleash evaluation context for one request:
 * - userId       — the (guest) shopper id: `customer.id` on checkout, the `x-user-id` header
 *                  on the bodyless catalog GET
 * - sessionId / region / email — cross-cutting targeting headers
 * - remoteAddress — derived server-side from the connection (authoritative)
 * - appName      — this tier's identity; environment is governed by the SDK token
 */
export const requestContext = (
  req: FastifyRequest,
  config: Config,
  customerId?: string,
): Context => ({
  userId: customerId,
  sessionId: headerStr(req.headers['x-session-id']),
  remoteAddress: req.ip,
  appName: config.appName,
  properties: {
    [contextKey('region')]: headerStr(req.headers['x-region']) ?? 'US',
    [contextKey('email')]: headerStr(req.headers['x-email']) ?? '',
  },
});
