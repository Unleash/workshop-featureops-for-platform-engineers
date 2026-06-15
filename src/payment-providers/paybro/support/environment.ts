/**
 * The merchant's originating environment, as it arrives over HTTP on each payment. PayBro is a
 * standalone party (it shares no code with the merchant), so it keeps its own closed union and
 * narrows the raw request field at the boundary — development is a sandbox ($0.00 charge).
 */
export type Environment = 'development' | 'production';

export const ENVIRONMENTS = ['development', 'production'] as const satisfies readonly Environment[];

export const isEnvironment = (value: unknown): value is Environment =>
  value === 'development' || value === 'production';

/** Narrow a raw value (NODE_ENV, an HTTP field) to an Environment, or throw. */
export const parseEnvironment = (value: unknown): Environment => {
  if (isEnvironment(value)) return value;
  throw new Error(
    `Invalid environment ${JSON.stringify(value)}: expected one of ${ENVIRONMENTS.join(', ')}.`,
  );
};
