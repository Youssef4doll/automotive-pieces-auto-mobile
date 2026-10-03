import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deviceStorage, secrets } from './storage';

/**
 * The questions asked to the shop from this phone ("Demander à la
 * boutique"), for "Mes questions" and for the watch that says "la boutique
 * vous a répondu" (services/order-watch).
 *
 * The list (what was asked, when, about which order) is ordinary data; the
 * token that reads the shop's answer lives in the Keychain / Keystore, like
 * an order's (storage.ts `secrets`). `answeredAt` is the last answer this
 * phone has seen, so a new one can be told apart from one already read.
 */
export type AskedQuestion = {
  id: string;
  /** The first words of the question, for the list. */
  excerpt: string;
  createdAt: string;
  orderRef: string | null;
  productSku: string | null;
  /** When the answer this phone last showed was written; null before any. */
  answeredAt: string | null;
  /** When the latest answer the watch found was written (services/order-watch). */
  latestReplyAt?: string | null;
  /** Asked while signed in: it leaves the phone with the account, like its orders. */
  fromAccount?: boolean;
};

const tokenKey = (id: string) => `apa-question.${id}`;

type QuestionsState = {
  questions: AskedQuestion[];
  remember: (q: AskedQuestion, token: string) => Promise<void>;
  tokenFor: (id: string) => Promise<string | null>;
  /** The answer has been shown: remember when it was written. */
  answered: (id: string, at: string) => void;
  /** The watch found an answer written at `at` — new until it is shown. */
  noteReply: (id: string, at: string) => void;
  dropAccountQuestions: () => Promise<void>;
};

export const useQuestions = create<QuestionsState>()(
  persist(
    (set, get) => ({
      questions: [],

      remember: async (q, token) => {
        // The key first: a listed question that cannot be read is worse than a key with no entry.
        await secrets.set(tokenKey(q.id), token);
        set({ questions: [q, ...get().questions.filter((o) => o.id !== q.id)].slice(0, 50) });
      },

      tokenFor: (id) => secrets.get(tokenKey(id)).catch(() => null),

      answered: (id, at) =>
        set({
          questions: get().questions.map((q) => (q.id === id && (q.answeredAt !== at || q.latestReplyAt !== at) ? { ...q, answeredAt: at, latestReplyAt: at } : q)),
        }),

      noteReply: (id, at) =>
        set({ questions: get().questions.map((q) => (q.id === id && q.latestReplyAt !== at ? { ...q, latestReplyAt: at } : q)) }),

      dropAccountQuestions: async () => {
        const all = get().questions;
        set({ questions: all.filter((q) => !q.fromAccount) });
        await Promise.all(all.filter((q) => q.fromAccount).map((q) => secrets.remove(tokenKey(q.id)).catch(() => undefined)));
      },
    }),
    { name: 'apa-questions', storage: createJSONStorage(() => deviceStorage), partialize: (s) => ({ questions: s.questions }) },
  ),
);

/** Answers found but not shown yet — the badge on "Mes questions". */
export function unreadAnswers(questions: AskedQuestion[]) {
  return questions.filter((q) => q.latestReplyAt && q.latestReplyAt !== q.answeredAt).length;
}
