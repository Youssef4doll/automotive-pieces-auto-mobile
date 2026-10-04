import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { accountApi, type Account } from '@/api/account';
import { ApiError } from '@/api/client';
import { setAnalyticsAccount, track } from '@/services/analytics';
import { useCheckout } from './checkout';
import { useOrders } from './orders';
import { useQuestions } from './questions';
import { deviceStorage, secrets } from './storage';
import { useStaff } from './staff';
import { appLocale } from '@/i18n/data-locale';
import { pushAvailable, pushToken } from '@/services/notifications';

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
 * Ordering takes an account (October 2026, the owner's call, as Glovo
 * does): the cart sends a guest to sign in first. So a phone nobody is signed
 * in on holds no one's name, number or orders — and `restore` makes sure of
 * it: opening the app with no session clears whatever an earlier one, or the
 * guest checkout of older versions, left behind. Orders a guest placed before
 * then are kept out of sight, with their keys, and join the account at the
 * next sign-in.
 *
 * Signing in does three things beyond storing the token: it brings the
 * orders this phone placed as a guest into the account (each proven by its
 * own order token — never by the e-mail), it lists the account's orders
 * from other devices here, and it fills an empty checkout with the account's
 * name, e-mail and phone. Signing out undoes all three: every order the
 * account owns (claimed ones included) and the checkout details leave the
 * phone, so a borrowed phone keeps nothing of somebody else's.
 */
const KEY = 'apa-account.session';

type AccountState = {
  status: 'unknown' | 'guest' | 'signedIn';
  account: Account | null;
  token: string | null;
  restore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  /**
   * The SMS code, typed back. Signed in when the number has an account;
   * otherwise the ticket that opens one (`signUpWithTicket`).
   */
  signInWithCode: (phone: string, code: string) => Promise<{ ticket: string } | null>;
  signUpWithTicket: (ticket: string, name: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** The password re-entered, or the code for an account without one; throws the shop's refusal. */
  deleteAccount: (proof: { password: string } | { code: string }) => Promise<void>;
  /** The shop answered with the account as it is now (a number just linked). */
  setAccount: (account: Account) => void;
  /** Pull the account's orders into "Mes commandes". */
  syncOrders: () => Promise<void>;
  /**
   * The sign-in or sign-out that just happened on this phone, for the
   * moment drawn over the app (components/auth-moment). Never set by
   * `restore`: opening the app signed in is not a sign-in.
   */
  moment: { kind: 'in' | 'out'; name: string; at: number } | null;
  clearMoment: () => void;
};

async function adopt(token: string, account: Account, set: (s: Partial<AccountState>) => void) {
  await secrets.set(KEY, token);
  set({ status: 'signedIn', token, account });
  setAnalyticsAccount(token);
  // A checkout with nothing typed yet gets the account's details; one the
  // customer has already filled in is theirs and is left alone.
  const checkout = useCheckout.getState();
  if (!checkout.details.customerName.trim() && !checkout.details.phone.trim()) {
    checkout.update({ customerName: account.name, email: account.email ?? '', phone: account.phone ?? '' });
  }
  void registerAccountPush();
}

/**
 * This phone, signed in, hears about every order of the account (the shop
 * keeps the push token on the session). Only when notifications are
 * already allowed — permission is asked where it means something (an
 * order's "Me prévenir"), never at sign-in — and only where push can work.
 */
export async function registerAccountPush() {
  const token = useAccount.getState().token;
  if (!token || !pushAvailable) return;
  const push = await pushToken({ ask: false }).catch(() => null);
  if (!push) return;
  await accountApi.registerPush(token, push, appLocale()).catch(() => undefined);
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? '';
}

/** Resolves once a persisted store has read its saved state back — a reset before that would be undone by it. */
function hydrated(store: { persist: { hasHydrated: () => boolean; onFinishHydration: (fn: () => void) => () => void } }) {
  return new Promise<void>((resolve) => {
    if (store.persist.hasHydrated()) return resolve();
    const off = store.persist.onFinishHydration(() => {
      off();
      resolve();
    });
  });
}

/**
 * A phone with no session holds nobody's details: no checkout name, number
 * or address, no account's orders or questions. Guest orders from before
 * accounts were required stay stored, unseen, to be claimed at sign-in.
 */
async function clearGuestTraces() {
  await Promise.all([hydrated(useCheckout), hydrated(useOrders), hydrated(useQuestions)]);
  useCheckout.getState().forget();
  await useOrders.getState().dropAccountOrders();
  await useQuestions.getState().dropAccountQuestions();
}

async function forgetLocally(set: (s: Partial<AccountState>) => void) {
  set({ status: 'guest', token: null, account: null });
  // The shop's staff session came with the account's sign-in; it goes with it.
  const staff = useStaff.getState();
  if (staff.status === 'signedIn') await staff.signOut().catch(() => undefined);
  setAnalyticsAccount(undefined);
  await secrets.remove(KEY).catch(() => undefined);
  // The phone goes back to a guest's: the account's orders and the
  // account's name, e-mail, phone and address leave with it.
  await useOrders.getState().dropAccountOrders();
  await useQuestions.getState().dropAccountQuestions();
  useCheckout.getState().forget();
}

export const useAccount = create<AccountState>()(
  persist(
    (set, get) => ({
      status: 'unknown',
      account: null,
      token: null,
      moment: null,
      clearMoment: () => set({ moment: null }),

      restore: async () => {
        if (get().status !== 'unknown' && get().token) return;
        const token = await secrets.get(KEY).catch(() => null);
        if (!token) {
          set({ status: 'guest', account: null, token: null });
          await clearGuestTraces();
          return;
        }
        set({ status: 'signedIn', token });
        setAnalyticsAccount(token);
        try {
          const { account } = await accountApi.me(token);
          set({ account });
          void get().syncOrders();
          void registerAccountPush();
        } catch (err) {
          if (err instanceof ApiError && err.failure.kind === 'unauthorized') await forgetLocally(set);
        }
      },

      signIn: async (email, password) => {
        const { token, account, staff } = await accountApi.signIn(email, password);
        await adopt(token, account, set);
        // An admin's own sign-in opens the shop's space too: "Espace boutique"
        // simply appears on their account screen.
        if (staff) await useStaff.getState().adopt(staff.token, staff.admin.name);
        track('login');
        await claimAndSync(token, get);
        // Welcomed once the phone's orders are the account's, as the screen moves on.
        set({ moment: { kind: 'in', name: firstName(account.name), at: Date.now() } });
      },

      signUp: async (input) => {
        const { token, account } = await accountApi.signUp(input);
        await adopt(token, account, set);
        track('sign_up');
        await claimAndSync(token, get);
        // Welcomed once the phone's orders are the account's, as the screen moves on.
        set({ moment: { kind: 'in', name: firstName(account.name), at: Date.now() } });
      },

      signInWithCode: async (phone, code) => {
        const result = await accountApi.verifyCode(phone, code);
        if ('ticket' in result) return { ticket: result.ticket };
        await adopt(result.token, result.account, set);
        track('login', { method: 'phone' });
        await claimAndSync(result.token, get);
        set({ moment: { kind: 'in', name: firstName(result.account.name), at: Date.now() } });
        return null;
      },

      signUpWithTicket: async (ticket, name, email) => {
        const { token, account } = await accountApi.signUpWithTicket(ticket, name, email);
        await adopt(token, account, set);
        track('sign_up', { method: 'phone' });
        await claimAndSync(token, get);
        set({ moment: { kind: 'in', name: firstName(account.name), at: Date.now() } });
      },

      setAccount: (account) => set({ account }),

      signOut: async () => {
        const token = get().token;
        track('logout');
        await forgetLocally(set);
        set({ moment: { kind: 'out', name: '', at: Date.now() } });
        // Revoked on the shop too; signing out offline still signs this phone out.
        if (token) await accountApi.signOut(token).catch(() => undefined);
      },

      deleteAccount: async (proof) => {
        const token = get().token;
        if (!token) throw new ApiError({ kind: 'unauthorized' }, 'not signed in');
        await accountApi.remove(token, proof);
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
