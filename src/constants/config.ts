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

/** The port `next dev` serves the website on. */
const DEV_PORT = 3000;

/**
 * The machine running Metro, as an IPv4 address — or null.
 *
 * Expo Go tells the app where it loaded its bundle from, and that is by
 * definition the developer's machine on the LAN. So the website is almost
 * certainly on that same address, and the app can work it out instead of
 * asking somebody to find their IP and type it into app.json.
 *
 * Only a bare IPv4 is accepted. `expo start --tunnel` puts an ngrok domain
 * here, and there is no website on port 3000 of an ngrok domain — falling
 * through to the platform default is wrong there too, but it is wrong in a
 * way that says "pas de connexion" instead of silently talking to a stranger.
 */
function devServerHost(): string | null {
  const constants = Constants as unknown as {
    expoGoConfig?: { debuggerHost?: string };
    linkingUri?: string;
  };

  const candidates = [
    Constants.expoConfig?.hostUri,
    constants.expoGoConfig?.debuggerHost,
    constants.linkingUri,
  ];

  for (const candidate of candidates) {
    const host = hostOf(candidate);
    if (host && /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host;
  }
  return null;
}

/** The host out of `192.168.1.20:8081`, `http://192.168.1.20:8081`, or similar. */
export function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const withoutScheme = value.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const host = withoutScheme.split('/')[0].split('?')[0].split(':')[0];
  return host || null;
}

/**
 * Development points at a website running on the same machine.
 *
 * Three cases, in the order they are worth trying:
 *
 *   On a real handset in Expo Go, the bundle came from the developer's LAN
 *   address, so the website is on that address too. This is the case that
 *   used to need a hand-written `expo.extra.apiBaseUrl` and now does not.
 *
 *   On the Android emulator, `localhost` is the emulator itself; the host
 *   machine is 10.0.2.2.
 *
 *   In a browser or the iOS simulator, `localhost` is the host machine and
 *   is correct as it stands.
 *
 * `expo.extra.apiBaseUrl` still wins over all of it, for a staging shop or a
 * website on a different port.
 */
function devDefault() {
  const host = devServerHost();
  if (host) return `http://${host}:${DEV_PORT}`;
  if (Platform.OS === 'android') return `http://10.0.2.2:${DEV_PORT}`;
  return `http://localhost:${DEV_PORT}`;
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

/**
 * Which build this is — set by app.config.ts from `APP_ENV`. A build that
 * does not say (an old app.json-only build) is treated as production only
 * when it is also a release build, which is what it always was.
 */
export const APP_ENV: 'development' | 'preview' | 'production' = (() => {
  const raw = (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.appEnv;
  if (raw === 'development' || raw === 'preview' || raw === 'production') return raw;
  return __DEV__ ? 'development' : 'production';
})();

/**
 * Only a production build may fall back to the live shop. A development or
 * preview build with no address configured looks for a local website rather
 * than quietly placing test orders in the real one — app.config.ts refuses
 * to build a preview without its staging address in the first place.
 */
export const API_BASE_URL = withoutTrailingSlash(
  readConfiguredBaseUrl() ?? (APP_ENV === 'production' ? PRODUCTION : devDefault()),
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
