import { send } from './client';

/**
 * "Demander à la boutique": a question, a photo or both, into the shop's
 * inbox — and the shop's written answer back. Every question returns its own
 * token; with it (and only with it) the phone reads the answer.
 */

/** One question as its asker sees it. */
export type Question = {
  id: string;
  subject: string;
  body: string;
  orderRef: string | null;
  productSku: string | null;
  photoCount: number;
  createdAt: string;
  /** The shop's written answer; null until it writes one. */
  reply: string | null;
  repliedAt: string | null;
  /** The shop dealt with it — a call back counts — even with no written answer. */
  handled: boolean;
};

export const questionsApi = {
  /**
   * Multipart (see the website's api/v1/questions): name, phone, body
   * and/or photos, and the context. `session` files it under the account.
   */
  ask: (form: FormData, session?: string) =>
    send<{ id: string; token: string; order: string | null }>('/api/v1/questions', { method: 'POST', body: form, token: session }),

  get: (id: string, token: string, signal?: AbortSignal) =>
    send<Question>(`/api/v1/questions/${encodeURIComponent(id)}`, { token, signal }),
};
