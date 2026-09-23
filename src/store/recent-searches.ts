import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deviceStorage } from './storage';

/**
 * What the customer searched for, on this phone, newest first.
 *
 * Only searches the customer ran — pressed search, or tapped a suggestion —
 * never the letters typed on the way. Eight, because the list sits above the
 * keyboard and anything longer pushes itself under it. Removable one by one
 * and all at once: a search history is the customer's, and a parts search
 * can say more about somebody's car than they would like left on a shared
 * phone.
 */
const MAX_RECENT = 8;

type RecentState = {
  queries: string[];
  add: (query: string) => void;
  remove: (query: string) => void;
  clear: () => void;
};

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const useRecentSearches = create<RecentState>()(
  persist(
    (set, get) => ({
      queries: [],
      add: (query) => {
        const q = query.trim();
        if (q.length < 2) return;
        set({ queries: [q, ...get().queries.filter((x) => !same(x, q))].slice(0, MAX_RECENT) });
      },
      remove: (query) => set({ queries: get().queries.filter((x) => !same(x, query)) }),
      clear: () => set({ queries: [] }),
    }),
    { name: 'apa-recent-searches', storage: createJSONStorage(() => deviceStorage) },
  ),
);
