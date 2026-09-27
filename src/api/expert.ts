import { send } from './client';

/**
 * "Here is the part — which one is it?": photos, the car and a phone number
 * into the shop's inbox (/admin/messages on the website), photos attached.
 * The shop answers by calling or writing back; nothing here answers for it.
 */
export const expertApi = {
  send: (form: FormData, token?: string) =>
    send<{ id: string }>('/api/v1/expert-requests', { method: 'POST', body: form, token }),
};
