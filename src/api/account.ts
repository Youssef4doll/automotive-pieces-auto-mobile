import type { OrderStatus } from './orders';
import { send } from './client';
import { deviceName } from '@/lib/device-name';

/** A phone signed in to the account, as `GET /account/sessions` lists it. */
export type SignedInDevice = {
  id: string;
  /** What the phone called itself at sign-in; null for one signed in before the app said. */
  device: string | null;
  signedInAt: string;
  lastUsedAt: string;
  /** This phone. */
  current: boolean;
};

/**
 * The signed-in customer, as the shop lets the app see them. The last three
 * are newer than some servers: absent means a password account, a number
 * never proved by code, and not staff.
 */
export type Account = {
  name: string;
  /** Null for an account opened with a phone code. */
  email: string | null;
  phone: string | null;
  /** The number this account signs in with by code ("+21698765432"). */
  verifiedPhone?: string | null;
  /** False for an account that only ever signed in with a code. */
  hasPassword?: boolean;
  /** An ADMIN: "Espace boutique" belongs on its account screen. */
  staff?: boolean;
  createdAt: string;
};

/** The staff session an admin's password sign-in brings with it. */
export type StaffGrant = { token: string; admin: { name: string; email: string | null } };

/** A right code: signed in, or — for a number with no account — a ticket to open one. */
export type CodeResult = { token: string; account: Account } | { ticket: string; needsAccount: true };

type Locale = 'fr' | 'en' | 'ar';

export type AccountOrder = { ref: string; status: OrderStatus; placedAt: string; total: number; itemCount: number };

/**
 * The customer's account on the shop — the same accounts as the website.
 * Every call after sign-in carries the session as a bearer token; the shop
 * derives who is asking from it and from nothing the app sends.
 */
export const accountApi = {
  signIn: (email: string, password: string) =>
    send<{ token: string; account: Account; staff?: StaffGrant }>('/api/v1/auth/session', {
      method: 'POST',
      body: { email: email.trim(), password, device: deviceName() },
    }),

  signUp: (input: { name: string; email: string; phone: string; password: string }) =>
    send<{ token: string; account: Account }>('/api/v1/auth/signup', {
      method: 'POST',
      body: { name: input.name.trim(), email: input.email.trim(), phone: input.phone.trim(), password: input.password, device: deviceName() },
    }),

  signOut: (token: string) => send<{ ok: true }>('/api/v1/auth/session', { method: 'DELETE', token }),

  /** Text a sign-in code to this number. The same answer whether or not it has an account. */
  sendCode: (phone: string, locale: Locale) =>
    send<{ sent: true; expiresIn: number }>('/api/v1/auth/phone/code', { method: 'POST', body: { phone, locale } }),

  /** The code, typed back. */
  verifyCode: (phone: string, code: string) =>
    send<CodeResult>('/api/v1/auth/phone/verify', { method: 'POST', body: { phone, code: code.trim(), device: deviceName() } }),

  /** Open an account on a number just proved — a name, and an e-mail only if they want one. */
  signUpWithTicket: (ticket: string, name: string, email: string) =>
    send<{ token: string; account: Account }>('/api/v1/auth/phone/signup', {
      method: 'POST',
      body: { ticket, name: name.trim(), email: email.trim(), device: deviceName() },
    }),

  /** Signed in: text a code to a number to sign in with from now on. */
  sendLinkCode: (token: string, phone: string, locale: Locale) =>
    send<{ sent: true }>('/api/v1/account/phone/code', { method: 'POST', token, body: { phone, locale } }),

  /** …and the code, which links the number. */
  linkPhone: (token: string, phone: string, code: string) =>
    send<{ account: Account }>('/api/v1/account/phone', { method: 'POST', token, body: { phone, code: code.trim() } }),

  /** No password to re-enter: a code to the account's number, to confirm deleting it. */
  sendConfirmCode: (token: string, locale: Locale) =>
    send<{ sent: true; to: string }>('/api/v1/account/confirm-code', { method: 'POST', token, body: { locale } }),

  /** Every order of the account reaches this phone as it moves, while it stays signed in. */
  registerPush: (token: string, pushToken: string, locale: Locale) =>
    send<{ ok: true }>('/api/v1/account/push', { method: 'POST', token, body: { token: pushToken, locale } }),

  /** Sends the website's reset e-mail. The same answer whether or not the address has an account. */
  requestReset: (email: string) =>
    send<{ sent: true }>('/api/v1/auth/password-reset', { method: 'POST', body: { email: email.trim() } }),

  me: (token: string, signal?: AbortSignal) => send<{ account: Account }>('/api/v1/account', { token, signal }),

  /**
   * A new name and/or e-mail ("Mon compte"). A new e-mail is proved with the
   * password — or, for an account without one, the code from
   * `sendConfirmCode`; the shop checks both, and that the address is free.
   */
  updateProfile: (token: string, change: { name?: string; email?: string; password?: string; code?: string }) =>
    send<{ account: Account }>('/api/v1/account', { method: 'PATCH', token, body: change }),

  /** The phones signed in to this account, this one marked `current`. */
  devices: (token: string, signal?: AbortSignal) =>
    send<{ sessions: SignedInDevice[] }>('/api/v1/account/sessions', { token, signal }).then((r) => r.sessions),

  /** Sign out one other phone, or — without an id — every phone but this one. */
  signOutDevice: (token: string, id?: string) =>
    send<{ revoked: number }>(id ? `/api/v1/account/sessions/${encodeURIComponent(id)}` : '/api/v1/account/sessions', {
      method: 'DELETE',
      token,
    }),

  /**
   * A new password, with the current one. The shop signs out every other
   * phone, staff session and website sign-in; this phone stays signed in.
   * `signedOut` is how many other phones that was.
   */
  changePassword: (token: string, current: string, next: string) =>
    send<{ signedOut: number }>('/api/v1/account/password', { method: 'POST', token, body: { current, next } }),

  /** The password — or, for an account without one, the code from `sendConfirmCode`. */
  remove: (token: string, proof: { password: string } | { code: string }) =>
    send<{ deleted: true }>('/api/v1/account', { method: 'DELETE', token, body: proof }),

  orders: (token: string, signal?: AbortSignal) => send<AccountOrder[]>('/api/v1/account/orders', { token, signal }),

  /** Bring this phone's guest orders into the account — each proven by its own token. */
  claim: (token: string, orders: { ref: string; token: string }[]) =>
    send<{ claimed: number }>('/api/v1/account/orders/claim', { method: 'POST', token, body: { orders } }),
};
