import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deviceStorage } from './storage';

/**
 * What this phone asked to be told about: orders (by reference) and parts
 * back in stock (by slug). The shop holds the real subscription; this is only
 * so a screen can say "vous serez prévenu" without asking the network, and so
 * a customer who turned order notifications on once is not asked again for
 * the next order.
 */
type NotifyState = {
  orders: string[];
  stock: string[];
  setOrder: (ref: string, on: boolean) => void;
  setStock: (slug: string, on: boolean) => void;
};

const toggle = (list: string[], key: string, on: boolean) => (on ? [key, ...list.filter((k) => k !== key)].slice(0, 50) : list.filter((k) => k !== key));

export const useNotify = create<NotifyState>()(
  persist(
    (set, get) => ({
      orders: [],
      stock: [],
      setOrder: (ref, on) => set({ orders: toggle(get().orders, ref, on) }),
      setStock: (slug, on) => set({ stock: toggle(get().stock, slug, on) }),
    }),
    { name: 'apa-notify', storage: createJSONStorage(() => deviceStorage) },
  ),
);
