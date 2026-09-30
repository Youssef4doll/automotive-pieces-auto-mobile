import type { ApiFailure } from './client';

/** `Retry-After` as seconds; the HTTP-date form is read too. */
export function retryAfterSeconds(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds);
  const at = Date.parse(header);
  return Number.isFinite(at) ? Math.max(0, (at - Date.now()) / 1000) : undefined;
}

/**
 * When a request that failed is worth sending again, and after how long.
 *
 * Only failures that say nothing about the request itself: no signal, no
 * answer in time, a gateway or a busy shop (502/503/504), or a flood window
 * that reopens within seconds. A 4xx is the shop's considered answer and
 * asking again changes nothing. Returns the delay in ms, or null for "don't".
 *
 * Two retries at most, and a timeout gets only one: each attempt may take
 * the full twelve seconds, and a customer should not wait forty.
 */
const RETRY_BACKOFF_MS = [700, 2000];
const MAX_RETRY_AFTER_MS = 5000;

export function retryDelay(failure: ApiFailure, attempt: number): number | null {
  if (attempt >= RETRY_BACKOFF_MS.length) return null;
  const jitter = Math.floor(Math.random() * 300);
  switch (failure.kind) {
    case 'offline':
      return RETRY_BACKOFF_MS[attempt] + jitter;
    case 'timeout':
      return attempt === 0 ? 400 + jitter : null;
    case 'server':
      if (![502, 503, 504].includes(failure.status)) return null;
      return Math.min(MAX_RETRY_AFTER_MS, failure.retryAfter !== undefined ? failure.retryAfter * 1000 : RETRY_BACKOFF_MS[attempt]) + jitter;
    case 'rateLimited':
      return failure.retryAfter !== undefined && failure.retryAfter * 1000 <= MAX_RETRY_AFTER_MS ? failure.retryAfter * 1000 + jitter : null;
    default:
      return null;
  }
}
