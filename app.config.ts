import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Three environments, one codebase: development, preview, production.
 *
 * `app.json` holds everything that is the same in all three; this file adds
 * what differs, chosen by `APP_ENV` (set per EAS build profile in eas.json,
 * or on the command line). The rule the specification states and this file
 * enforces: **a development or preview build can never talk to the live
 * shop by accident.**
 *
 *   development — `expo start`. No base URL: config.ts finds the website on
 *                 the developer's machine. API_BASE_URL may point elsewhere,
 *                 but not at production.
 *   preview     — internal builds for testers, against a staging shop on its
 *                 own Neon branch. API_BASE_URL is required, and refused if
 *                 it is the production address.
 *   production  — the store builds. The live shop, always.
 *
 * Each environment has its own bundle identifier, so a tester can hold the
 * preview and the store app side by side and never confuse their data.
 *
 * The identifiers below are the proposal written into docs/PLAN.md; the
 * owner confirms them before the first store submission, because once an
 * app is published under an identifier it can never change.
 */

const PRODUCTION_API = 'https://automotive-pieces-auto.vercel.app';
const BASE_ID = 'tn.automotivepiecesauto.app';

type AppEnv = 'development' | 'preview' | 'production';

function appEnv(): AppEnv {
  const raw = process.env.APP_ENV ?? 'development';
  if (raw === 'development' || raw === 'preview' || raw === 'production') return raw;
  throw new Error(`APP_ENV must be development, preview or production — got "${raw}".`);
}

function apiBaseUrl(env: AppEnv): string | undefined {
  const given = process.env.API_BASE_URL?.trim().replace(/\/+$/, '');
  if (env === 'production') {
    if (given && given !== PRODUCTION_API) {
      throw new Error(`A production build talks to ${PRODUCTION_API}; API_BASE_URL=${given} is not allowed.`);
    }
    return PRODUCTION_API;
  }
  if (given === PRODUCTION_API) {
    throw new Error(`A ${env} build must not talk to the live shop. Point API_BASE_URL at a staging or local shop.`);
  }
  if (env === 'preview' && !given) {
    throw new Error('A preview build needs API_BASE_URL — the staging shop, on its own Neon branch.');
  }
  return given || undefined;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const env = appEnv();
  const suffix = env === 'production' ? '' : `.${env === 'development' ? 'dev' : 'preview'}`;
  const api = apiBaseUrl(env);

  return {
    ...config,
    name: env === 'production' ? config.name! : `${config.name} (${env === 'development' ? 'dev' : 'test'})`,
    slug: config.slug!,
    ios: {
      ...config.ios,
      bundleIdentifier: `${BASE_ID}${suffix}`,
      supportsTablet: true,
      // The app uses HTTPS only, which is exempt; saying so skips the
      // export-compliance question on every TestFlight upload.
      infoPlist: { ...config.ios?.infoPlist, ITSAppUsesNonExemptEncryption: false },
    },
    android: {
      ...config.android,
      package: `${BASE_ID}${suffix}`,
    },
    extra: {
      ...config.extra,
      appEnv: env,
      // Absent rather than null when unset — see config.ts on why that matters.
      ...(api ? { apiBaseUrl: api } : {}),
    },
  };
};
