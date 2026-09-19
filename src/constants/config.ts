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
 * pointed at a staging shop without a code change. The fallback below is the
 * production site.
 */
const configured = (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl;

/**
 * Development points at a website running on the same machine.
 *
 * `localhost` means the phone itself on a device or an emulator, so it can
 * only ever work in a browser or on the iOS simulator. Android's emulator
 * reaches the host at 10.0.2.2. A real handset needs the developer's LAN
 * address, which is why this is overridable from app.json rather than being
 * a constant three people have to keep editing back.
 */
function devDefault() {
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export const API_BASE_URL = (
  configured ?? (__DEV__ ? devDefault() : 'https://automotive-pieces-auto.vercel.app')
).replace(/\/+$/, '');

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
