import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/constants/config';

/**
 * The one place the app talks to the shop.
 *
 * Every screen goes through `get`. That is not ceremony: it means the
 * timeout, the error taxonomy and the `{ data }` unwrapping are written once,
 * and a screen cannot accidentally ship a `fetch` with no timeout that spins
 * forever on a dead connection.
 *
 * Why not TanStack Query, which is the usual answer. v1 reads three endpoints,
 * all of them small, all of them the same for every customer, none of them
 * mutated from the app. What that needs is a timeout, one retry, and a cache
 * that survives going back a screen — about a hundred lines, visible here,
 * with no version to keep in step with Expo's. The moment the app gains
 * anything that writes — the cart, an order, the account — this stops being
 * enough and the library earns its place. Written down so the next person
 * does not have to guess whether it was considered.
 */

/**
 * What went wrong, as something a screen can switch on.
 *
 * The distinction that matters to a customer is between "your connection" and
 * "our shop": one of those they can do something about. `offline` covers a
 * request that never got an answer; `server` covers one that did and it was a
 * failure. They get different words on screen.
 */
export type ApiFailure =
  | { kind: 'offline' }
  | { kind: 'timeout' }
  | { kind: 'notFound' }
  | { kind: 'rateLimited' }
  | { kind: 'server'; status: number }
  /** The shop answered with something that is not the shape we asked for. */
  | { kind: 'malformed' };

export class ApiError extends Error {
  readonly failure: ApiFailure;

  constructor(failure: ApiFailure, message: string) {
    super(message);
    this.name = 'ApiError';
    this.failure = failure;
  }
}

type Envelope<T> = { data: T } | { error: string };

function isEnvelope<T>(body: unknown): body is Envelope<T> {
  return typeof body === 'object' && body !== null && ('data' in body || 'error' in body);
}

/**
 * One GET, with a deadline.
 *
 * `AbortController` rather than a `Promise.race` with a timer: racing leaves
 * the request running in the background, still holding a socket and still
 * costing the customer's data allowance, and on a slow connection a screen
 * that is opened and closed three times ends up with three live requests.
 * Aborting actually cancels it.
 */
async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), REQUEST_TIMEOUT_MS);

  // A caller that is unmounting aborts too — both have to reach the request.
  const onCallerAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onCallerAbort);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // An HTML error page, a captive portal's login screen, a truncated
      // body. All of them are "not the shop" rather than a 500.
      throw new ApiError({ kind: 'malformed' }, `${path}: response was not JSON`);
    }

    if (!response.ok) {
      if (response.status === 404) throw new ApiError({ kind: 'notFound' }, `${path}: 404`);
      if (response.status === 429) throw new ApiError({ kind: 'rateLimited' }, `${path}: 429`);
      throw new ApiError({ kind: 'server', status: response.status }, `${path}: ${response.status}`);
    }

    if (!isEnvelope<T>(body) || !('data' in body)) {
      throw new ApiError({ kind: 'malformed' }, `${path}: no data in envelope`);
    }

    return body.data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new ApiError({ kind: 'timeout' }, `${path}: timed out`);
    }
    if (err instanceof Error && err.name === 'AbortError') throw err; // the caller went away
    // fetch rejects with a TypeError for DNS, refused connections and a
    // handset with no signal. There is nothing more specific to be had.
    throw new ApiError({ kind: 'offline' }, `${path}: ${String(err)}`);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onCallerAbort);
  }
}

/**
 * The catalogue, cached for as long as the app is open.
 *
 * The vehicle tables change when the shop learns about a new car, which is
 * weeks apart. Walking back from the engine list to the model list to the
 * make list should not re-fetch all three, and on a workshop's connection
 * that difference is the whole feel of the screen.
 *
 * In memory only, and deliberately. A garage picker that works offline would
 * need the vehicle tables on disk, kept in step with a shop that can add a
 * make at any time — and the failure mode of getting that wrong is an app
 * confidently offering a car it can no longer sell parts for. Not in v1.
 */
const cache = new Map<string, unknown>();
const inFlight = new Map<string, Promise<unknown>>();

export async function get<T>(path: string, options?: { signal?: AbortSignal; fresh?: boolean }): Promise<T> {
  if (!options?.fresh && cache.has(path)) return cache.get(path) as T;

  // Two screens asking for the same thing at once make one request. This
  // happens for real: a fast tap through the picker mounts the next screen
  // while the previous one is still settling.
  const existing = inFlight.get(path);
  if (existing && !options?.fresh) return existing as Promise<T>;

  const pending = request<T>(path, options?.signal)
    .then((data) => {
      cache.set(path, data);
      return data;
    })
    .finally(() => {
      inFlight.delete(path);
    });

  inFlight.set(path, pending);
  return pending;
}

/** Drop everything cached. For "Réessayer", and for signing out later. */
export function clearCache() {
  cache.clear();
}
