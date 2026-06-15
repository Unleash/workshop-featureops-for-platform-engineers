/**
 * The business/deployment environment a checkout — and its provider charge — runs in.
 * Sourced from NODE_ENV (and the storefront's VITE_NODE_ENV); also names the Unleash SDK
 * environment. Modelled as a closed union so it can never be a stray/misspelt string in
 * business logic; raw values are narrowed at the edges with `parseEnvironment`.
 */
export type Environment = 'development' | 'production';

export const ENVIRONMENTS = ['development', 'production'] as const satisfies readonly Environment[];

export const isEnvironment = (value: unknown): value is Environment =>
  value === 'development' || value === 'production';

/** Narrow a raw value (NODE_ENV, an HTTP field, a Vite var) to an Environment, or throw. */
export const parseEnvironment = (value: unknown): Environment => {
  if (isEnvironment(value)) return value;
  throw new Error(
    `Invalid environment ${JSON.stringify(value)}: expected one of ${ENVIRONMENTS.join(', ')}.`,
  );
};
