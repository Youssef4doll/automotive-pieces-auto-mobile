import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { accountApi, type Account } from '@/api/account';
import { ApiError } from '@/api/client';
import { setAnalyticsAccount, track } from '@/services/analytics';
import { useCheckout } from './checkout';
import { useOrders } from './orders';
import { deviceStorage, secrets } from './storage';

/**
 * The customer signed in on this phone — optional, never required to buy.
 *
 * Two halves, stored apart like the orders: the session token (which opens
 * the customer's orders, name, phone and address) in the Keychain /
 * Keystore via `secrets`; the account's name and e-mail, for drawing the
 * Compte tab before the shop has answered, in ordinary storage.
 *
 * `restore` asks the shop whether the saved token still works. A refusal
 * signs the phone out quietly; no connection keeps it signed in, because a
 * tunnel is not a reason to lose your account.
 *
 * Signing in does three things beyond storing the token: it brings the
 * orders this phone placed as a guest into the account (each proven by its
 * own order token — never by the e-mail), it lists the account's orders
 * from other devices here, and it fills an empty checkout with the account's
 * name, e-mail and phone. Signing out undoes the second, so a borrowed phone
 * does not keep somebody else's order list.
 */
const KEY = 'apa-account.session';

type AccountState = {
  status: 'unknown' | 'guest' | 'signedIn';
  account: Account | null;
  token: string | null;
  restore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  /** Password re-entered; throws the shop's refusal for the screen to show. */
  deleteAccount: (password: string) => Promise<void>;
  /** Pull the account's orders into "Mes commandes". */
  syncOrders: () => Promise<void>;
};

async function adopt(token: string, account: Account, set: (s: Partial<AccountState>) => void) {
  await secrets.set(KEY, token);
  set({ status: 'signedIn', token, account });
  setAnalyticsAccount(token);
  // A checkout with nothing typed yet gets the account's details; one the
  // customer has already filled in is theirs and is left alone.
  const checkout = useCheckout.getState();
  if (!checkout.details.customerName.trim() && !checkout.details.phone.trim()) {
    checkout.update({ customerName: account.name, email: account.email, phone: account.phone ?? '' });
  }
}

async function forgetLocally(set: (s: Partial<AccountState>) => void) {
  set({ status: 'guest', token: null, account: null });
  setAnalyticsAccount(undefined);
  await secrets.remove(KEY).catch(() => undefined);
  useOrders.getState().dropAccountOrders();
}

export const useAccount = create<AccountState>()(
  persist(
    (set, get) => ({
      status: 'unknown',
      account: null,
      token: null,

      restore: async () => {
        if (get().status !== 'unknown' && get().token) return;
        const token = await secrets.get(KEY).catch(() => null);
        if (!token) {
          set({ status: 'guest', account: null, token: null });
          return;
        }
        set({ status: 'signedIn', token });
        setAnalyticsAccount(token);
        try {
          const { account } = await accountApi.me(token);
          set({ account });
          void get().syncOrders();
        } catch (err) {
          if (err instanceof ApiError && err.failure.kind === 'unauthorized') await forgetLocally(set);
        }
      },

      signIn: async (email, password) => {
        const { token, account } = await accountApi.signIn(email, password);
        await adopt(token, account, set);
        track('login');
        await claimAndSync(token, get);
      },

      signUp: async (input) => {
        const { token, account } = await accountApi.signUp(input);
        await adopt(token, account, set);
        track('sign_up');
        await claimAndSync(token, get);
      },

      signOut: async () => {
        const token = get().token;
        track('logout');
        await forgetLocally(set);
        // Revoked on the shop too; signing out offline still signs this phone out.
        if (token) await accountApi.signOut(token).catch(() => undefined);
      },

      deleteAccount: async (password) => {
        const token = get().token;
        if (!token) throw new ApiError({ kind: 'unauthorized' }, 'not signed in');
        await accountApi.remove(token, password);
        track('account_deleted');
        await forgetLocally(set);
        useCheckout.getState().forget();
        const { useProfilePhoto } = await import('./profile-photo');
        useProfilePhoto.getState().clear();
      },

      syncOrders: async () => {
        const token = get().token;
        if (!token) return;
        try {
          useOrders.getState().mergeAccountOrders(await accountApi.orders(token));
        } catch (err) {
          if (err instanceof ApiError && err.failure.kind === 'unauthorized') await forgetLocally(set);
        }
      },
    }),
    {
      name: 'apa-account',
      storage: createJSONStorage(() => deviceStorage),
      // The token is never in here: this file is plain storage.
      partialize: (state) => ({ account: state.account }),
    },
  ),
);

async function claimAndSync(token: string, get: () => AccountState) {
  const orders = useOrders.getState();
  const held: { ref: string; token: string }[] = [];
  for (const o of orders.orders) {
    const key = await orders.ownToken(o.ref);
    if (key) held.push({ ref: o.ref, token: key });
  }
  if (held.length) await accountApi.claim(token, held.slice(0, 50)).catch(() => undefined);
  await get().syncOrders();
}

/** The session token, for a request that should carry it when there is one. */
export function accountToken(): string | undefined {
  return useAccount.getState().token ?? undefined;
}
