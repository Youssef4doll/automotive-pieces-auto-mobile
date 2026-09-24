import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deviceStorage } from './storage';

/**
 * The face on the Compte tab — the customer's own photo, chosen by them,
 * kept on this phone and never sent anywhere. Cleared with the phone's
 * details and with the account.
 */
type ProfilePhotoState = {
  photo: string | null;
  set: (photo: string) => void;
  clear: () => void;
};

export const useProfilePhoto = create<ProfilePhotoState>()(
  persist(
    (set) => ({
      photo: null,
      set: (photo) => set({ photo }),
      clear: () => set({ photo: null }),
    }),
    { name: 'apa-profile-photo', storage: createJSONStorage(() => deviceStorage) },
  ),
);
