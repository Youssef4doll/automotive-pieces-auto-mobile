import type { OrderStatus } from './orders';
import { send } from './client';

/** The signed-in customer, as the shop lets the app see them. */
export type Account = { name: string; email: string; phone: string | null; createdAt: string };

export type AccountOrder = { ref: string; status: OrderStatus; placedAt: string; total: number; itemCount: number };

/**
 * The customer's account on the shop — the same accounts as the website.
 * Every call after sign-in carries the session as a bearer token; the shop
 * derives who is asking from it and from nothing the app sends.
 */
export const accountApi = {
  signIn: (email: string, password: string) =>
    send<{ token: string; account: Account }>('/api/v1/auth/session', {
      method: 'POST',
      body: { email: email.trim(), password },
    }),

  signUp: (input: { name: string; email: string; phone: string; password: string }) =>
    send<{ token: string; account: Account }>('/api/v1/auth/signup', {
      method: 'POST',
      body: { name: input.name.trim(), email: input.email.trim(), phone: input.phone.trim(), password: input.password },
    }),

  signOut: (token: string) => send<{ ok: true }>('/api/v1/auth/session', { method: 'DELETE', token }),

  /** Sends the website's reset e-mail. The same answer whether or not the address has an account. */
  requestReset: (email: string) =>
    send<{ sent: true }>('/api/v1/auth/password-reset', { method: 'POST', body: { email: email.trim() } }),

  me: (token: string, signal?: AbortSignal) => send<{ account: Account }>('/api/v1/account', { token, signal }),

  remove: (token: string, password: string) =>
    send<{ deleted: true }>('/api/v1/account', { method: 'DELETE', token, body: { password } }),

  orders: (token: string, signal?: AbortSignal) => send<AccountOrder[]>('/api/v1/account/orders', { token, signal }),

  /** Bring this phone's guest orders into the account — each proven by its own token. */
  claim: (token: string, orders: { ref: string; token: string }[]) =>
    send<{ claimed: number }>('/api/v1/account/orders/claim', { method: 'POST', token, body: { orders } }),
};
