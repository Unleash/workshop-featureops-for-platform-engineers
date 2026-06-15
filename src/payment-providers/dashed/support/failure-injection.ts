/**
 * Dashed is the workshop's "flaky" provider: unlike PayBro it occasionally fails, giving the
 * release-template safeguard a live error signal to react to. The randomness lives ONLY here —
 * handlers receive injected gates (`shouldFail*`) and never call `Math.random` themselves, so
 * tests can drive failures deterministically.
 */

/** Mode B — fraction of session-creation requests that fail (all environments). */
export const SESSION_INIT_FAILURE_RATE = 1 / 15;

/** Mode A — fraction of would-be-successful captures that fail (production only). */
export const CAPTURE_FAILURE_RATE = 1 / 3;

/** True with the given probability. The single `Math.random()` call site in Dashed. */
export const occursWithProbability = (rate: number): boolean => Math.random() < rate;
