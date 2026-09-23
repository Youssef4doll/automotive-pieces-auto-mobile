import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { DeliveryMethod } from '@/api/orders';
import { deviceStorage } from './storage';

/**
 * The delivery details, carried between the two checkout steps and
 * remembered for the next order.
 *
 * The website pre-fills a signed-in customer's checkout from their last
 * order, on the principle that nobody should retype an address the shop
 * already has. The app has no account yet, so the phone remembers instead —
 * the customer's own details on the customer's own device, filled in by
 * them. "Effacer mes coordonnées" in Compte removes them.
 */
export type CheckoutDetails = {
  customerName: string;
  phone: string;
  email: string;
  governorate: string;
  address: string;
  notes: string;
  deliveryMethod: DeliveryMethod;
};

const EMPTY: CheckoutDetails = {
  customerName: '',
  phone: '',
  email: '',
  governorate: '',
  address: '',
  notes: '',
  deliveryMethod: 'DELIVERY',
};

type CheckoutState = {
  details: CheckoutDetails;
  update: (patch: Partial<CheckoutDetails>) => void;
  /** After an order: keep who and where, drop the one-off note. */
  settle: () => void;
  forget: () => void;
};

export const useCheckout = create<CheckoutState>()(
  persist(
    (set, get) => ({
      details: EMPTY,
      update: (patch) => set({ details: { ...get().details, ...patch } }),
      settle: () => set({ details: { ...get().details, notes: '' } }),
      forget: () => set({ details: EMPTY }),
    }),
    { name: 'apa-checkout', storage: createJSONStorage(() => deviceStorage) },
  ),
);
