import { create } from 'zustand';

import { ApiError, clearCache, send } from '@/api/client';
import { secrets } from './storage';

/**
 * The shop's staff, signed in on this phone.
 *
 * The token opens every order's name, phone number and address and can
 * change prices, so it lives where the order tokens live: the Keychain on
 * iOS, the Keystore on Android (see storage.ts `secrets`). It is never put
 * in a persisted zustand store, which is a plain file.
 *
 * `restore` asks the shop whether the saved token still works before the
 * screens trust it: a session revoked from another device, an account
 * demoted on the website, or thirty days passing all end it on the server,
 * and the app should find out at the door rather than on the first save.
 */
const KEY = 'apa-staff.session';

type StaffState = {
  status: 'unknown' | 'signedOut' | 'signedIn';
  token: string | null;
  name: string | null;
  restore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** The shop refused the token: forget it without asking the shop again. */
  expire: () => void;
};

export const useStaff = create<StaffState>()((set, get) => ({
  status: 'unknown',
  token: null,
  name: null,

  restore: async () => {
    if (get().status !== 'unknown') return;
    const token = await secrets.get(KEY).catch(() => null);
    if (!token) return set({ status: 'signedOut' });
    try {
      const { admin } = await send<{ admin: { name: string } }>('/api/v1/admin/session', { token });
      set({ status: 'signedIn', token, name: admin.name });
    } catch (err) {
      if (err instanceof ApiError && err.failure.kind === 'unauthorized') {
        await secrets.remove(KEY).catch(() => undefined);
        set({ status: 'signedOut', token: null, name: null });
      } else {
        // Offline at the door: keep the token and let the screens show the
        // connection problem, rather than signing somebody out for a tunnel.
        set({ status: 'signedIn', token, name: null });
      }
    }
  },

  signIn: async (email, password) => {
    const { token, admin } = await send<{ token: string; admin: { name: string } }>('/api/v1/admin/session', {
      method: 'POST',
      body: { email: email.trim(), password },
    });
    await secrets.set(KEY, token);
    set({ status: 'signedIn', token, name: admin.name });
  },

  signOut: async () => {
    const token = get().token;
    set({ status: 'signedOut', token: null, name: null });
    await secrets.remove(KEY).catch(() => undefined);
    clearCache();
    // Revoked on the shop too, so the token is dead even if it was copied.
    // Best effort: signing out offline still signs this phone out.
    if (token) await send('/api/v1/admin/session', { method: 'DELETE', token }).catch(() => undefined);
  },

  expire: () => {
    secrets.remove(KEY).catch(() => undefined);
    set({ status: 'signedOut', token: null, name: null });
  },
}));
