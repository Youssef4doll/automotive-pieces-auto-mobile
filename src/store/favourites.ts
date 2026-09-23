import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deviceStorage } from './storage';

/**
 * The parts the customer hearted, on this phone, newest first.
 *
 * What is kept is what identifies the part — its address, name, maker and
 * picture — and never its price or stock: those change, and a list that
 * remembered "58,00 DT" would be showing a figure the shop may no longer
 * charge. Opening a favourite reads the part fresh.
 */
export type Favourite = { slug: string; name: string; brand: string | null; familySlug: string; imageUrl: string | null };

const MAX = 60;

type FavState = {
  items: Favourite[];
  has: (slug: string) => boolean;
  toggle: (item: Favourite) => boolean;
  remove: (slug: string) => void;
};

export const useFavourites = create<FavState>()(
  persist(
    (set, get) => ({
      items: [],
      has: (slug) => get().items.some((f) => f.slug === slug),
      toggle: (item) => {
        const on = get().has(item.slug);
        set({ items: on ? get().items.filter((f) => f.slug !== item.slug) : [item, ...get().items].slice(0, MAX) });
        return !on;
      },
      remove: (slug) => set({ items: get().items.filter((f) => f.slug !== slug) }),
    }),
    { name: 'apa-favourites', storage: createJSONStorage(() => deviceStorage) },
  ),
);
