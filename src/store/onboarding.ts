import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deviceStorage } from './storage';

/**
 * Whether this phone has seen the welcome. Once, then never again — and
 * never in the way of a link: only the home screen sends a first-timer to
 * it, so a shared product link opens the product.
 */
type OnboardingState = {
  done: boolean;
  hydrated: boolean;
  finish: () => void;
};

export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      done: false,
      hydrated: false,
      finish: () => set({ done: true }),
    }),
    {
      name: 'apa-onboarding',
      storage: createJSONStorage(() => deviceStorage),
      partialize: (state) => ({ done: state.done }),
      onRehydrateStorage: () => () => {
        useOnboarding.setState({ hydrated: true });
      },
    },
  ),
);
