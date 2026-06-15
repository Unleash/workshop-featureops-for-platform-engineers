/** Shared Motion helpers for the web app. */

/** True when the user (or the test env) asks for reduced motion. */
export const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
};
