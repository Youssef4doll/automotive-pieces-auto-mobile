import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Where the shop is.
 *
 * The app has no database. Every number on every screen comes from the
 * website's `/api/v1`, which is the same Postgres the storefront and the
 * admin read — that is the whole point of the arrangement, and it is why
 * there is no seed file, no fixture and no offline copy of the catalogue in
 * this repository. A part is in stock here when it is in stock there.
 *
 * The value comes from `expo.extra.apiBaseUrl` in app.json, so a build can be
 * pointed at a staging shop, or at a developer's LAN address, without a code
 * change. It must be a plain string holding a full URL, and when it is not
 * wanted the key must be ABSENT — see below for why `null` is not the same
 * thing.
 */

/** The shop, in production. */
const PRODUCTION = 'https://automotive-pieces-auto.vercel.app';

/**
 * Development points at a website running on the same machine.
 *
 * `localhost` means the phone itself on a device or an emulator, so it can
 * only ever work in a browser or on the iOS simulator. Android's emulator
 * reaches the host at 10.0.2.2. A real handset needs the developer's LAN
 * address, which is what `expo.extra.apiBaseUrl` is for.
 */
function devDefault() {
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

/**
 * Read the configured base URL, and refuse to bring the app down over it.
 *
 * This is the one value in the app that comes from a hand-edited JSON file,
 * and it is read at module scope — before any screen renders and outside any
 * error boundary. The first version did `configured.replace(/\/+$/, '')`
 * straight off `extra.apiBaseUrl`, which meant that anything other than a
 * string there ("apiBaseUrl": { "dev": "..." } is the obvious slip when
 * somebody is adding their LAN address) threw
 * `.replace is not a function` and took the entire app with it, including
 * every screen that had nothing to do with the network. The stack pointed at
 * a regex, which tells the person reading it nothing about the file they
 * actually need to fix.
 *
 * So: a usable value is used, anything else is ignored with a message that
 * names the file, the key and the offending value, and the app starts either
 * way. A shop that cannot be reached shows "pas de connexion" on one screen,
 * which is a problem the customer can understand; a white screen is not.
 *
 * The bug that prompted all of this was mine, and it is worth naming because
 * it is not obvious: app.json carried `"apiBaseUrl": null` to mean "unset",
 * and **Expo resolves that key to an empty object `{}`**, not to null. `{}`
 * is truthy, so `??` kept it and the app died on `.replace`. An unset key has
 * to be genuinely absent from app.json. It survived review here because a
 * long-running dev server was serving a bundle from before the key existed;
 * it failed the moment anybody started cold.
 */
function readConfiguredBaseUrl(): string | null {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const raw = extra?.apiBaseUrl;

  // Not set at all — the normal case, and not worth a word.
  if (raw === undefined || raw === null) return null;

  if (typeof raw !== 'string') {
    // The value is printed, not just its type: "got object" sent somebody
    // hunting through app.json for a key that was fine, because `typeof
    // null` is also "object". Seeing the value ends that in one glance.
    warn(`expected a string, got ${describe(raw)}`);
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    warn('it is empty');
    return null;
  }

  // Caught here rather than at the first fetch, where it surfaces as an
  // unexplained network failure on every screen at once.
  if (!/^https?:\/\/.+/i.test(trimmed)) {
    warn(`"${trimmed}" is not an http(s) URL`);
    return null;
  }

  return trimmed;
}

/** A short, safe rendering of whatever was found, for the warning. */
function describe(value: unknown) {
  const type = Array.isArray(value) ? 'an array' : typeof value;
  let printed: string;
  try {
    printed = JSON.stringify(value) ?? String(value);
  } catch {
    printed = String(value);
  }
  return `${type}: ${printed.slice(0, 80)}`;
}

function warn(problem: string) {
  console.warn(
    `app.json: expo.extra.apiBaseUrl was ignored — ${problem}. ` +
      'It must be a full URL, e.g. "http://192.168.1.20:3000". ' +
      'Falling back to the default for this build.',
  );
}

/** Trailing slashes would turn every path into a double slash. */
function withoutTrailingSlash(url: string) {
  return url.replace(/\/+$/, '');
}

export const API_BASE_URL = withoutTrailingSlash(
  readConfiguredBaseUrl() ?? (__DEV__ ? devDefault() : PRODUCTION),
);

/**
 * How long a request may take before the app stops waiting.
 *
 * Twelve seconds, not the platform default of sixty-odd. This shop's
 * customers are on Tunisian mobile data, often in a workshop with one bar,
 * and a spinner that runs for a minute before admitting failure is worse than
 * one that fails at twelve and offers "Réessayer": the customer has already
 * decided the app is broken and closed it by then. Long enough that a slow
 * 3G response still lands, short enough to stay answerable.
 */
export const REQUEST_TIMEOUT_MS = 12_000;
