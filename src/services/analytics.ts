import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

import { send } from '@/api/client';
import { deviceStorage } from '@/store/storage';

/**
 * The app's one analytics door.
 *
 * Every screen and store calls `track(name, props)` and nothing else, so the
 * event list is reviewable in one grep and no screen ships its own SDK call.
 * Events land in the website's `AnalyticsEvent` table through
 * `POST /api/v1/events`, beside the website's own, tagged `app: true` with
 * the platform — one funnel, read on the shop's existing dashboard.
 *
 * What is never sent: names, phone numbers, e-mails, addresses, order
 * tokens. The props are ids, slugs, counts, prices and verdicts. The
 * account, when there is one, is attached by the server from the session —
 * this file never sends a user id, and could not make the server believe one.
 *
 * Fire-and-forget. `track` never throws and never waits; a batch that fails
 * is retried once with the next one and then dropped. A lost event is an
 * acceptable price; a checkout that stalls on an analytics call is not.
 */

export type EventName =
  | 'app_open'
  | 'vehicle_selected'
  | 'vehicle_added'
  | 'vin_started'
  | 'vin_completed'
  | 'search_query'
  | 'search_result_clicked'
  | 'category_viewed'
  | 'product_viewed'
  | 'compatibility_checked'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'purchase_failed'
  | 'order_viewed'
  | 'favorite_added'
  | 'sign_up'
  | 'login'
  | 'logout'
  | 'account_deleted'
  | 'onboarding_started'
  | 'onboarding_completed';

type Props = Record<string, string | number | boolean | null | undefined>;
type Queued = { name: EventName; at: string; props?: Props };

/**
 * The funnel's decisive steps go at once rather than with the next batch:
 * losing a `purchase` because the app was swiped away four seconds later
 * would make the one number that matters the least reliable one.
 */
const IMMEDIATE: ReadonlySet<EventName> = new Set(['purchase', 'purchase_failed', 'sign_up', 'login', 'logout', 'account_deleted']);

const ID_KEY = 'apa-analytics.id';
const FLUSH_MS = 5_000;
const BATCH = 25;
const MAX_QUEUE = 200;

let queue: Queued[] = [];
let sessionId: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let retried = false;
/** The signed-in customer's bearer, if any — set by the account store. */
let bearer: string | undefined;

/** Not a person and not a secret: a random label for "this installation". */
function randomId() {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-${hex()}-${hex()}${hex()}${hex()}`;
}

async function installId() {
  if (sessionId) return sessionId;
  try {
    const saved = await deviceStorage.getItem(ID_KEY);
    if (typeof saved === 'string' && saved) return (sessionId = saved);
  } catch {
    // no storage — a per-launch id is still a useful grouping
  }
  sessionId = randomId();
  try {
    await deviceStorage.setItem(ID_KEY, sessionId);
  } catch {}
  return sessionId;
}

/** Record that something happened. Never throws. */
export function track(name: EventName, props?: Props) {
  try {
    const clean: Props | undefined = props
      ? Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined))
      : undefined;
    queue.push({ name, at: new Date().toISOString(), props: clean });
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
    if (queue.length >= BATCH || IMMEDIATE.has(name)) void flush();
    else if (!timer) timer = setTimeout(() => void flush(), FLUSH_MS);
  } catch {}
}

/** Called by the account store on sign-in and sign-out. */
export function setAnalyticsAccount(token: string | undefined) {
  bearer = token;
}

export async function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue.slice(0, BATCH);
  try {
    await send('/api/v1/events', {
      method: 'POST',
      token: bearer,
      body: {
        sessionId: await installId(),
        platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web',
        appVersion: Constants.expoConfig?.version,
        events: batch,
      },
    });
    queue = queue.slice(batch.length);
    retried = false;
  } catch {
    // Once more with the next batch, then let it go.
    if (retried) {
      queue = queue.slice(batch.length);
      retried = false;
    } else retried = true;
  } finally {
    flushing = false;
    if (queue.length && !timer) timer = setTimeout(() => void flush(), FLUSH_MS);
  }
}

// Whatever is queued goes before the app is suspended.
try {
  AppState.addEventListener('change', (state) => {
    if (state === 'background' || state === 'inactive') void flush();
  });
} catch {}
