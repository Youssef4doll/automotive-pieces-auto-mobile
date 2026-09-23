import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Product } from '@/api/catalogue';
import { deviceStorage } from './storage';

/**
 * The basket, on this phone.
 *
 * What is kept: which parts and how many. What is NOT kept: what they cost.
 * A price stored here would be the price on the day the part was added, and
 * the brief's rule is that nothing on the phone is believed about money — so
 * every screen that shows a total asks the shop to price the basket
 * (`ordersApi.quote`) and shows the answer. The name, brand and family are
 * kept only so a line can be drawn while that answer is on its way, or when
 * there is no connection to ask.
 *
 * Fifty lines, the same ceiling the order endpoint enforces, so the basket
 * can never hold something checkout will refuse for its size. Ninety-nine of
 * one part, which is a garage's order rather than a household's and is
 * where the stepper stops.
 */
export const MAX_LINES = 50;
export const MAX_QTY = 99;

export type CartItem = {
  productId: string;
  qty: number;
  slug: string | null;
  name: string;
  sku: string;
  brand: string | null;
  familySlug: string | null;
  imageUrl: string | null;
};

type CartState = {
  items: CartItem[];
  hydrated: boolean;
  /** Add a part, or add to the quantity already there. Returns false when full. */
  add: (product: Pick<Product, 'id' | 'slug' | 'name' | 'sku' | 'brand' | 'familySlug' | 'imageUrl'>, qty?: number) => boolean;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,

      add: (product, qty = 1) => {
        const items = get().items;
        const existing = items.find((i) => i.productId === product.id);
        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === product.id ? { ...i, qty: Math.min(MAX_QTY, i.qty + qty) } : i,
            ),
          });
          return true;
        }
        if (items.length >= MAX_LINES) return false;
        set({
          items: [
            ...items,
            {
              productId: product.id,
              qty: Math.min(MAX_QTY, Math.max(1, qty)),
              slug: product.slug,
              name: product.name,
              sku: product.sku,
              brand: product.brand,
              familySlug: product.familySlug,
              imageUrl: product.imageUrl,
            },
          ],
        });
        return true;
      },

      setQty: (productId, qty) => {
        if (qty <= 0) return get().remove(productId);
        set({
          items: get().items.map((i) => (i.productId === productId ? { ...i, qty: Math.min(MAX_QTY, qty) } : i)),
        });
      },

      remove: (productId) => set({ items: get().items.filter((i) => i.productId !== productId) }),

      clear: () => set({ items: [] }),
    }),
    {
      name: 'apa-cart',
      storage: createJSONStorage(() => deviceStorage),
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('cart: could not be read back', error);
        useCart.setState({ hydrated: true });
      },
    },
  ),
);

/** How many parts, counting quantities — the number on the tab. */
export function useCartCount() {
  return useCart((s) => s.items.reduce((n, i) => n + i.qty, 0));
}
