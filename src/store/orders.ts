import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deviceStorage, secrets } from './storage';

/**
 * The orders placed on — or recovered to — this phone.
 *
 * Two halves, stored in two places on purpose. The list (reference, date,
 * total) is ordinary data and lives with the rest of the app's state; it is
 * what "Mes commandes" draws before it has asked the shop anything. The
 * token for each order is a key to the customer's name, phone and address,
 * and lives in the Keychain / Keystore via `secrets` — see storage.ts.
 *
 * A reference without its token is still listed: it is the customer's
 * order, and the screen can offer to recover it with the phone number
 * rather than pretending it never happened.
 */
export type PlacedOrder = {
  ref: string;
  placedAt: string;
  total: number;
  itemCount: number;
  /**
   * What was bought, for the list to lead with before the shop has been
   * asked: the first part's name and the families of up to three parts.
   * Missing on orders recorded before it existed; the list reads it live.
   */
  lead?: { name: string; families: (string | null)[] };
  /**
   * The signed-in account owns it: placed while signed in, claimed into the
   * account at sign-in, or listed from the account's other devices. Signing
   * out takes it off this phone, token and all — it is the account's, and
   * signing back in brings it back. Only orders placed as a guest and never
   * claimed stay on a signed-out phone.
   */
  fromAccount?: boolean;
};

const tokenKey = (ref: string) => `apa-order.${ref}`;

type OrdersState = {
  orders: PlacedOrder[];
  hydrated: boolean;
  remember: (order: PlacedOrder, token: string) => Promise<void>;
  /**
   * The key that opens this order: the phone's own order token, or — for an
   * order the signed-in account owns — the account session.
   */
  tokenFor: (ref: string) => Promise<string | null>;
  /** This phone's own order token only. */
  ownToken: (ref: string) => Promise<string | null>;
  forget: (ref: string) => Promise<void>;
  mergeAccountOrders: (list: { ref: string; placedAt: string; total: number; itemCount: number }[]) => void;
  dropAccountOrders: () => Promise<void>;
};

export const useOrders = create<OrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      hydrated: false,

      remember: async (order, token) => {
        // The token first: an order listed with no key to open it is a worse
        // state to be interrupted in than a key with no list entry.
        await secrets.set(tokenKey(order.ref), token);
        const rest = get().orders.filter((o) => o.ref !== order.ref);
        set({ orders: [order, ...rest] });
      },

      tokenFor: async (ref) => {
        const own = await secrets.get(tokenKey(ref)).catch(() => null);
        if (own) return own;
        // Lazy, to keep the two stores from importing each other at load.
        const { accountToken } = await import('./account');
        return accountToken() ?? null;
      },

      ownToken: (ref) => secrets.get(tokenKey(ref)).catch(() => null),

      mergeAccountOrders: (list) => {
        const owned = new Set(list.map((o) => o.ref));
        // An order this phone already lists becomes the account's too once
        // the account holds it (a guest order claimed at sign-in).
        const local = get().orders.map((o) => (owned.has(o.ref) && !o.fromAccount ? { ...o, fromAccount: true } : o));
        const known = new Set(local.map((o) => o.ref));
        const added = list
          .filter((o) => !known.has(o.ref))
          .map((o) => ({ ref: o.ref, placedAt: o.placedAt, total: o.total, itemCount: o.itemCount, fromAccount: true }));
        set({ orders: [...local, ...added].sort((a, b) => b.placedAt.localeCompare(a.placedAt)) });
      },

      dropAccountOrders: async () => {
        const all = get().orders;
        set({ orders: all.filter((o) => !o.fromAccount) });
        await Promise.all(all.filter((o) => o.fromAccount).map((o) => secrets.remove(tokenKey(o.ref)).catch(() => undefined)));
      },

      forget: async (ref) => {
        await secrets.remove(tokenKey(ref));
        set({ orders: get().orders.filter((o) => o.ref !== ref) });
      },
    }),
    {
      name: 'apa-orders',
      storage: createJSONStorage(() => deviceStorage),
      partialize: (state) => ({ orders: state.orders }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('orders: could not be read back', error);
        useOrders.setState({ hydrated: true });
      },
    },
  ),
);
