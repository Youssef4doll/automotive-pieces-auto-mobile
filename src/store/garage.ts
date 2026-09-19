import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

/**
 * Storage that survives not having any.
 *
 * `@react-native-async-storage/async-storage` on web is `window.localStorage`
 * with a promise around it, and there are two places with no `window`: the
 * Node pass that pre-renders the web build, and a browser where site data is
 * blocked. The first one is not hypothetical — it crashed `expo start --web`
 * outright the first time this store existed, because zustand's persist
 * middleware reads storage the moment the store is created, at import time,
 * before any component has rendered and where there is no error boundary to
 * catch it. The app did not fail to show the garage; it failed to start.
 *
 * So storage is probed once and replaced with a no-op when it is not there.
 * A no-op means the garage works for the length of the session and is not
 * remembered — which is the correct behaviour for a pre-render (nothing is
 * being remembered for anybody) and an honest degradation in a browser with
 * storage switched off.
 */
const hasStorage = Platform.OS !== 'web' || typeof window !== 'undefined';

const storage: StateStorage = hasStorage
  ? AsyncStorage
  : {
      getItem: async () => null,
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };

/**
 * The customer's cars, on this phone.
 *
 * Deliberately the same shape and the same rules as the website's
 * `src/lib/vehicle-store.ts` — same field names, same six-vehicle ceiling,
 * same "the active vehicle is whichever one was chosen last". The two front
 * doors describe one feature to one customer, and the day the account starts
 * syncing a garage between them, a mismatch in the field names would be a
 * migration instead of an upload.
 *
 * Stored under `apa-vehicle`, which is also the website's localStorage key.
 * Nothing reads across — a phone and a browser have no shared storage — but
 * when the API gains `GET /account/garage` the payload on both sides is
 * already this object.
 *
 * What is NOT here: anything the customer did not choose. No "recently
 * viewed", no inferred vehicle from a search, no default car. A garage with a
 * car in it the customer never added is a garage they stop trusting.
 */
export type SavedVehicle = {
  makeId: string;
  makeName: string;
  makeSlug: string;
  modelId: string;
  modelName: string;
  modelSlug: string;
  engineId: string;
  engineName: string;
};

/**
 * Six, the same as the website.
 *
 * It is a household's cars plus a couple, not a fleet. The limit exists so
 * the list stays scannable on a phone; when it is reached the app says so and
 * asks which one to drop, rather than silently pushing the oldest out — a
 * customer who loses the car they added three months ago has no way to know
 * why, and the website's own store does exactly that. Worth diverging on.
 */
export const MAX_GARAGE_SIZE = 6;

type GarageState = {
  vehicles: SavedVehicle[];
  /** The car the rest of the app answers for. Null when the garage is empty. */
  active: SavedVehicle | null;
  /** True once the on-disk garage has been read back. */
  hydrated: boolean;

  /** Add a car and make it active. A car already saved is moved to the front. */
  add: (vehicle: SavedVehicle) => void;
  setActive: (engineId: string) => void;
  remove: (engineId: string) => void;
  /** Empty the garage. What signing out has to do on a shared phone. */
  forgetAll: () => void;
  isSaved: (engineId: string) => boolean;
  isFull: () => boolean;
};

export const useGarage = create<GarageState>()(
  persist(
    (set, get) => ({
      vehicles: [],
      active: null,
      hydrated: false,

      add: (vehicle) =>
        set((state) => {
          const rest = state.vehicles.filter((v) => v.engineId !== vehicle.engineId);
          // Re-adding a car already in the garage is a reorder, not a
          // rejection — it is how someone with two cars switches between them
          // from the picker.
          const vehicles = [vehicle, ...rest].slice(0, MAX_GARAGE_SIZE);
          return { vehicles, active: vehicle };
        }),

      setActive: (engineId) => {
        const found = get().vehicles.find((v) => v.engineId === engineId);
        if (found) set({ active: found });
      },

      remove: (engineId) =>
        set((state) => {
          const vehicles = state.vehicles.filter((v) => v.engineId !== engineId);
          // Removing the active car promotes the next one rather than leaving
          // the app with a garage and no vehicle selected, which reads as the
          // app having forgotten everything.
          const active =
            state.active?.engineId === engineId ? (vehicles[0] ?? null) : state.active;
          return { vehicles, active };
        }),

      forgetAll: () => set({ vehicles: [], active: null }),

      isSaved: (engineId) => get().vehicles.some((v) => v.engineId === engineId),
      isFull: () => get().vehicles.length >= MAX_GARAGE_SIZE,
    }),
    {
      name: 'apa-vehicle',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({ vehicles: state.vehicles, active: state.active }),
      // Until this runs, `vehicles` is the empty array the store was created
      // with — which looks exactly like an empty garage. Screens wait for
      // `hydrated` before saying "aucun véhicule enregistré", so a customer
      // with three cars never sees the empty state flash past on launch.
      onRehydrateStorage: () => (state, error) => {
        if (error) console.warn('garage: could not be read back', error);
        useGarage.setState({ hydrated: true });
      },
    },
  ),
);

/** "Renault Clio IV · 1.5 dCi" — the one-line name for a car. */
export function vehicleLabel(vehicle: SavedVehicle | null): string | null {
  if (!vehicle) return null;
  return `${vehicle.makeName} ${vehicle.modelName} · ${vehicle.engineName}`;
}
