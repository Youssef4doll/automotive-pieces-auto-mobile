import { create } from 'zustand';

/**
 * One message at a time, at the bottom, above the tab bar.
 *
 * "Ajouté au panier" with a way to get there, and nothing that needs an
 * answer — a toast that asks a question is a dialog in disguise and it
 * disappears before a slow reader has finished it. A new toast replaces the
 * old one rather than queueing, because three stacked confirmations of three
 * taps say nothing the last one does not.
 */
export type Toast = {
  id: number;
  message: string;
  tone?: 'success' | 'neutral';
  action?: { label: string; onPress: () => void };
};

type ToastState = {
  toast: Toast | null;
  show: (toast: Omit<Toast, 'id'>) => void;
  hide: (id?: number) => void;
};

let next = 1;

export const useToast = create<ToastState>()((set, get) => ({
  toast: null,
  show: (toast) => set({ toast: { ...toast, id: next++ } }),
  // Only the toast that asked to be hidden: a timer from an old toast must
  // not dismiss the one that replaced it.
  hide: (id) => {
    if (id === undefined || get().toast?.id === id) set({ toast: null });
  },
}));
