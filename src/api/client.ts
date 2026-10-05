import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomBytes } from 'expo-crypto';

import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/constants/config';

import { retryAfterSeconds, retryDelay } from './retry';

/**
 * The one place the app talks to the shop.
 *
 * Every screen goes through `get`. That is not ceremony: it means the
 * timeout, the error taxonomy and the `{ data }` unwrapping are written once,
 * and a screen cannot accidentally ship a `fetch` with no timeout that spins
 * forever on a dead connection.
 *
 * Why not TanStack Query, which is the usual answer. The first version of
 * this comment said the library would earn its place "the moment the app
 * gains anything that writes". It now writes — a basket quote and an order —
 * and it still has not, and the reason is worth keeping: the only mutation
 * with consequences is placing an order, which happens once, is never
 * retried automatically (a retried POST is a second parcel), and invalidates
 * nothing — the next screen reads the order it was handed. The basket is
 * local state priced on demand. What a query library adds — background
 * refetch, optimistic updates, invalidation graphs — is machinery for
 * problems this app does not have yet. Reads get `get`, writes get `send`,
 * and neither caches what depends on who is asking.
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
  /** `retryAfter`: seconds, when the shop said. */
  | { kind: 'rateLimited'; retryAfter?: number }
  /** No token, or a token the shop refused. */
  | { kind: 'unauthorized' }
  /** Signed in correctly as somebody who may not do this — a customer at the staff door. */
  | { kind: 'forbidden' }
  /**
   * The shop's validation refused one field — the order form points at it.
   * `reason` and `room` come with a refused photo (`bad_file`, `too_many`…).
   */
  | { kind: 'invalid'; field: string; reason?: string; room?: number }
  /** A part the shop can no longer sell; the basket points at the line. */
  | { kind: 'unavailable'; productId: string }
  /**
   * The shop answered with a failure of its own. 503 is "busy, ask again"
   * (its database waking, a slow moment) and says when in `retryAfter`;
   * reads have already been retried by the time a screen sees it.
   */
  | { kind: 'server'; status: number; retryAfter?: number }
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

type RequestInit = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  /** JSON, or a FormData for a photo upload (sent as multipart, untouched). */
  body?: unknown;
  /** An order's access token, sent as `Authorization: Bearer`. */
  token?: string;
  signal?: AbortSignal;
  /**
   * Sent as `Idempotency-Key`. The shop answers a repeat of the same key with
   * the first answer instead of doing the thing twice — which is what lets
   * `send` retry a POST at all. See `newIdempotencyKey`.
   */
  idempotencyKey?: string;
};

/**
 * One request, with a deadline.
 *
 * `AbortController` rather than a `Promise.race` with a timer: racing leaves
 * the request running in the background, still holding a socket and still
 * costing the customer's data allowance, and on a slow connection a screen
 * that is opened and closed three times ends up with three live requests.
 * Aborting actually cancels it.
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { signal } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), REQUEST_TIMEOUT_MS);

  // A caller that is unmounting aborts too — both have to reach the request.
  const onCallerAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onCallerAbort);

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    const multipart = typeof FormData !== 'undefined' && init.body instanceof FormData;
    // FormData sets its own multipart boundary; naming the type here would drop it.
    if (init.body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
    if (init.token) headers.Authorization = `Bearer ${init.token}`;
    if (init.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey;

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method ?? 'GET',
      signal: controller.signal,
      headers,
      body: init.body === undefined ? undefined : multipart ? (init.body as FormData) : JSON.stringify(init.body),
      // How long an answer is good for is decided once, by `get` below. Left
      // to the HTTP cache, the shop's stale-while-revalidate header let a
      // browser (and some native stacks) answer a re-read with the old copy.
      cache: 'no-store',
    });

    const retryAfter = retryAfterSeconds(response.headers.get('retry-after'));
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      // A gateway's HTML page in front of a failing shop (502, 503, 504) is
      // the shop failing, and worth retrying. A 200 that is not JSON — a
      // captive portal's login screen, a truncated body — is "not the shop".
      if (response.status >= 500) {
        throw new ApiError({ kind: 'server', status: response.status, retryAfter }, `${path}: ${response.status}`);
      }
      throw new ApiError({ kind: 'malformed' }, `${path}: response was not JSON`);
    }

    if (!response.ok) {
      const detail = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
      if (response.status === 404) throw new ApiError({ kind: 'notFound' }, `${path}: 404`);
      if (response.status === 429) throw new ApiError({ kind: 'rateLimited', retryAfter }, `${path}: 429`);
      if (response.status === 401) throw new ApiError({ kind: 'unauthorized' }, `${path}: 401`);
      if (response.status === 403) throw new ApiError({ kind: 'forbidden' }, `${path}: 403`);
      if (detail.error === 'invalid_field' && typeof detail.field === 'string') {
        throw new ApiError(
          {
            kind: 'invalid',
            field: detail.field,
            ...(typeof detail.reason === 'string' ? { reason: detail.reason } : {}),
            ...(typeof detail.room === 'string' ? { room: Number(detail.room) } : {}),
          },
          `${path}: invalid ${detail.field}`,
        );
      }
      if (detail.error === 'unavailable' && typeof detail.productId === 'string') {
        throw new ApiError({ kind: 'unavailable', productId: detail.productId }, `${path}: unavailable`);
      }
      throw new ApiError({ kind: 'server', status: response.status, retryAfter }, `${path}: ${response.status}`);
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

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new DOMException('aborted', 'AbortError'));
    const timer = setTimeout(done, ms);
    function done() {
      signal?.removeEventListener('abort', stop);
      resolve();
    }
    function stop() {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException('aborted', 'AbortError'));
    }
    signal?.addEventListener('abort', stop, { once: true });
  });
}

/** `request`, sent again after a failure that `retryDelay` says is worth it. */
async function withRetries<T>(path: string, init: RequestInit): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await request<T>(path, init);
    } catch (err) {
      const delay = err instanceof ApiError ? retryDelay(err.failure, attempt) : null;
      if (delay === null) throw err;
      await wait(delay, init.signal);
    }
  }
}

/**
 * A fresh Idempotency-Key: 24 random bytes from the platform's CSPRNG,
 * base64url. One per thing the customer means to do once — the app keeps it
 * while what it sends is unchanged, and makes a new one when it changes.
 */
export function newIdempotencyKey() {
  const bytes = getRandomBytes(24);
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += abc[(n >> 18) & 63] + abc[(n >> 12) & 63] + abc[(n >> 6) & 63] + abc[n & 63];
  }
  return out;
}

/**
 * The catalogue, remembered for a short while.
 *
 * Walking back from the engine list to the model list to the make list
 * should not re-fetch all three, and on a workshop's connection that
 * difference is the whole feel of the screen. But the shop changes under
 * the app — a price, a promotion, a family's picture — so an answer is
 * trusted for MAX_AGE_MS and then asked again. The first version kept
 * answers until the app was closed, and a customer saw last week's
 * promotion until they force-quit.
 *
 * In memory only, and deliberately. A garage picker that works offline would
 * need the vehicle tables on disk, kept in step with a shop that can add a
 * make at any time — and the failure mode of getting that wrong is an app
 * confidently offering a car it can no longer sell parts for. Not in v1.
 */
const MAX_AGE_MS = 30_000;
const cache = new Map<string, { data: unknown; at: number; fromDisk?: boolean }>();
const inFlight = new Map<string, Promise<unknown>>();

/**
 * The shop's furniture — families, parts makers, its settings and its
 * promotions — changes a few times a month, and every cold screen asked for
 * it again. These are kept for a day and on disk: a screen gets the last
 * answer at once, and an answer older than MAX_AGE_MS is asked again in the
 * background, so a changed promotion still shows on the next visit.
 * Nothing about stock, prices of a part or fitment is in here.
 */
const STATIC = [/^\/api\/v1\/catalogue\/families$/, /^\/api\/v1\/catalogue\/brands$/, /^\/api\/v1\/settings\/public$/, /^\/api\/v1\/promotions$/];
const STATIC_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const STATIC_KEY = 'apa-static-cache-v1';
const isStatic = (path: string) => STATIC.some((r) => r.test(path));

const restored = AsyncStorage.getItem(STATIC_KEY)
  .then((raw) => {
    if (!raw) return;
    const saved = JSON.parse(raw) as Record<string, { data: unknown; at: number }>;
    for (const [path, entry] of Object.entries(saved)) {
      if (isStatic(path) && !cache.has(path) && Date.now() - entry.at < STATIC_MAX_AGE_MS) cache.set(path, { ...entry, fromDisk: true });
    }
  })
  .catch(() => undefined);

function persistStatic() {
  const saved: Record<string, { data: unknown; at: number }> = {};
  for (const [path, entry] of cache) if (isStatic(path)) saved[path] = { data: entry.data, at: entry.at };
  AsyncStorage.setItem(STATIC_KEY, JSON.stringify(saved)).catch(() => undefined);
}

/**
 * Rung when a background re-read of the shop's furniture brings something
 * different from what screens were shown (a new WhatsApp number, a new
 * banner): api/refresh then re-reads every mounted screen — from this
 * cache, so it costs no request — and the change shows at once instead of
 * on the next visit.
 */
let staticChanged: () => void = () => undefined;
export function onStaticChanged(listener: () => void) {
  staticChanged = listener;
}

function fetchInto<T>(path: string, signal?: AbortSignal): Promise<T> {
  const before = cache.get(path);
  const pending = withRetries<T>(path, { signal })
    .then((data) => {
      cache.set(path, { data, at: Date.now() });
      if (isStatic(path)) {
        persistStatic();
        if (before && JSON.stringify(before.data) !== JSON.stringify(data)) staticChanged();
      }
      return data;
    })
    .finally(() => {
      inFlight.delete(path);
    });
  inFlight.set(path, pending);
  return pending;
}

export async function get<T>(path: string, options?: { signal?: AbortSignal; fresh?: boolean }): Promise<T> {
  const fixed = isStatic(path);
  // A cold start waits for the disk once (a few ms) rather than asking the
  // network for something it already holds.
  if (fixed && !cache.has(path)) await restored;

  const hit = cache.get(path);
  if (!options?.fresh && hit) {
    const age = Date.now() - hit.at;
    // An answer from a previous launch is always re-read behind the screen,
    // however young: the shop may have changed it in between.
    if (age < MAX_AGE_MS && !hit.fromDisk) return hit.data as T;
    if (fixed && age < STATIC_MAX_AGE_MS) {
      // Stale but usable: answer now, refresh behind it. No signal — the
      // screen that asked may be gone by the time the answer lands.
      if (!inFlight.has(path)) void fetchInto<T>(path).catch(() => undefined);
      return hit.data as T;
    }
  }

  // Two screens asking for the same thing at once make one request. This
  // happens for real: a fast tap through the picker mounts the next screen
  // while the previous one is still settling.
  const existing = inFlight.get(path);
  if (existing && !options?.fresh) return existing as Promise<T>;

  return fetchInto<T>(path, options?.signal);
}

/**
 * A request that is never cached and never shared: a POST, or a read that
 * depends on who is asking (an order, behind its token).
 *
 * A read is retried like `get`'s. A write is sent once — a retried POST can
 * be a second parcel on a delivery van — unless it carries an idempotency
 * key: then the shop answers a repeat with the first result, and retrying is
 * exactly as safe as reading. Placing an order does (api/orders `place`).
 */
export function send<T>(path: string, init: RequestInit = {}): Promise<T> {
  const read = (init.method ?? 'GET') === 'GET';
  return read || init.idempotencyKey ? withRetries<T>(path, init) : request<T>(path, init);
}

/** Drop everything cached. For pull-to-refresh, "Réessayer", and signing out. */
export function clearCache() {
  cache.clear();
}
