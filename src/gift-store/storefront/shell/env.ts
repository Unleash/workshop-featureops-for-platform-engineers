/**
 * The active Unleash environment and its colour coding — shared by the corner ribbon and
 * the dev-panel headline so the two never drift. Amber for the development sandbox, emerald
 * for live production. Driven by VITE_NODE_ENV, the same value the SDK/Toolbar use.
 *
 * Neutral app config — NOT dev tooling. The checkout must never import dev-panel code, but it
 * may read the environment from here if it ever needs to.
 */
import { type Environment, parseEnvironment } from '@gift-store/commerce';

interface EnvStyle {
  /** Solid background utility (ribbon). */
  bg: string;
  /** Text colour utility (inline headline accent). */
  text: string;
  /** Human label. */
  label: string;
}

const ENV_STYLES: Record<Environment, EnvStyle> = {
  development: { bg: 'bg-amber-500', text: 'text-amber-400', label: 'Development' },
  production: { bg: 'bg-emerald-600', text: 'text-emerald-400', label: 'Production' },
};

export interface ActiveEnv extends EnvStyle {
  /** The active environment (e.g. "development"). */
  name: Environment;
}

export const activeEnvironment = (): ActiveEnv => {
  const name = parseEnvironment(import.meta.env.VITE_NODE_ENV);
  return { name, ...ENV_STYLES[name] };
};
