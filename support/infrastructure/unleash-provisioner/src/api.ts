import { BASE_URL, TOKEN } from './config';

export interface ApiResponse<T> {
  status: number;
  data: T;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Statuses worth retrying: rate limiting + transient gateway/availability errors.
const RETRYABLE = new Set([429, 502, 503, 504]);
// A 400-project run fires thousands of sequential calls; sustained throttling needs a wider budget
// than a single project did. 8 attempts spans well over a minute of backoff before giving up.
const MAX_ATTEMPTS = 8;
const MAX_BACKOFF_MS = 30_000; // cap exponential growth so a late attempt doesn't stall for minutes

/**
 * Backoff for attempt N (1-based). Honors a numeric Retry-After (seconds) when present; otherwise
 * exponential (0.5s, 1s, 2s, …) capped at MAX_BACKOFF_MS, with ±25% jitter so concurrent runs
 * against the same instance don't resynchronize their retries into a fresh burst.
 */
const backoffMs = (attempt: number, retryAfter: string | null): number => {
  const seconds = Number(retryAfter);
  if (retryAfter !== null && Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }
  const base = Math.min(500 * 2 ** (attempt - 1), MAX_BACKOFF_MS);
  const jitter = base * 0.25 * (Math.random() * 2 - 1); // ±25%
  return Math.round(base + jitter);
};

/**
 * Thin Unleash Admin API client. Returns the parsed JSON body (or the raw text when a
 * response is empty / not JSON, e.g. a 204) alongside the status, so callers can stay
 * idempotent (treat 409 as "already exists", 404 as "already gone").
 *
 * A multi-project run fires many sequential calls, so retryable statuses (429 + transient
 * 5xx) are retried with backoff, honoring Retry-After — the cloud rate limiter never aborts
 * provisioning.
 */
export const unleashApi = async <T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> => {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${BASE_URL}/api/admin${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: TOKEN },
    });

    if (RETRYABLE.has(response.status) && attempt < MAX_ATTEMPTS) {
      const wait = backoffMs(attempt, response.headers.get('retry-after'));
      console.warn(
        `[api] ${options.method ?? 'GET'} ${path} → HTTP ${response.status.toString()}; retry ${attempt.toString()}/${(MAX_ATTEMPTS - 1).toString()} in ${wait.toString()}ms.`,
      );
      await sleep(wait);
      continue;
    }

    const text = await response.text();
    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = text as unknown as T;
    }
    return { status: response.status, data };
  }
};
