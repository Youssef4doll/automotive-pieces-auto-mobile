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
};

const tokenKey = (ref: string) => `apa-order.${ref}`;

type OrdersState = {
  orders: PlacedOrder[];
  hydrated: boolean;
  remember: (order: PlacedOrder, token: string) => Promise<void>;
  tokenFor: (ref: string) => Promise<string | null>;
  forget: (ref: string) => Promise<void>;
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

      tokenFor: (ref) => secrets.get(tokenKey(ref)),

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
