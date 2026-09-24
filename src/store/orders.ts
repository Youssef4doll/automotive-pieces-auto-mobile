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
   * Listed because the signed-in account owns it, not because this phone
   * holds its token. Opened with the account session; removed on sign-out.
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
  dropAccountOrders: () => void;
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
        const local = get().orders;
        const known = new Set(local.map((o) => o.ref));
        const added = list
          .filter((o) => !known.has(o.ref))
          .map((o) => ({ ref: o.ref, placedAt: o.placedAt, total: o.total, itemCount: o.itemCount, fromAccount: true }));
        if (!added.length) return;
        set({ orders: [...local, ...added].sort((a, b) => b.placedAt.localeCompare(a.placedAt)) });
      },

      dropAccountOrders: () => set({ orders: get().orders.filter((o) => !o.fromAccount) }),

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
