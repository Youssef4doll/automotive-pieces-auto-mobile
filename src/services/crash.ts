import { Platform } from 'react-native';

import { track } from './analytics';

/**
 * Crash reports, into the shop's own analytics (POST /api/v1/events as
 * `app_crash`) — no third-party service, no key to manage. The error screens
 * already report what they catch (`app_error`); this catches what they never
 * see: an error thrown outside rendering, a promise nobody awaited, a fatal
 * error on start-up.
 *
 * What is sent: the error's name and message, the top of its stack, whether
 * it was fatal. Nothing the customer typed is added. Five distinct errors a
 * session at most, each once, so a loop that throws cannot flood the table.
 * They read on the website under Admin → Analytics → Erreurs de l'app.
 */
const MAX_PER_SESSION = 5;
const seen = new Set<string>();

export function reportCrash(error: unknown, fatal: boolean, source: 'global' | 'window' | 'promise') {
  const e = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Non-Error thrown');
  const message = `${e.name}: ${e.message}`.slice(0, 300);
  if (seen.has(message) || seen.size >= MAX_PER_SESSION) return;
  seen.add(message);
  track('app_crash', {
    message,
    stack: (e.stack ?? '').split('\n').slice(0, 8).join('\n').slice(0, 900),
    fatal,
    source,
  });
}

type Handler = (error: unknown, fatal?: boolean) => void;
let installed = false;

/** Once, at the root. Keeps whatever handler was there (the red box in development, the native crash otherwise). */
export function installCrashReporting() {
  if (installed) return;
  installed = true;
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    window.addEventListener('error', (ev) => reportCrash(ev.error ?? ev.message, false, 'window'));
    window.addEventListener('unhandledrejection', (ev) => reportCrash(ev.reason, false, 'promise'));
    return;
  }
  const utils = (globalThis as unknown as { ErrorUtils?: { getGlobalHandler(): Handler; setGlobalHandler(h: Handler): void } }).ErrorUtils;
  if (!utils) return;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, fatal) => {
    reportCrash(error, Boolean(fatal), 'global');
    previous(error, fatal);
  });
}
