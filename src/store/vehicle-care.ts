import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { VehicleCare } from '@/lib/care';

import { deviceStorage } from './storage';

export type { VehicleCare } from '@/lib/care';

type CareState = {
  byEngine: Record<string, VehicleCare>;
  set: (engineId: string, patch: Partial<VehicleCare>) => void;
  forget: (engineId: string) => void;
  forgetAll: () => void;
};

export const useVehicleCare = create<CareState>()(
  persist(
    (set) => ({
      byEngine: {},
      set: (engineId, patch) =>
        set((s) => ({ byEngine: { ...s.byEngine, [engineId]: { ...s.byEngine[engineId], ...patch } } })),
      forget: (engineId) =>
        set((s) => {
          const next = { ...s.byEngine };
          delete next[engineId];
          return { byEngine: next };
        }),
      forgetAll: () => set({ byEngine: {} }),
    }),
    { name: 'apa-vehicle-care', storage: createJSONStorage(() => deviceStorage) },
  ),
);

