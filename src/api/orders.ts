import type { Product } from './catalogue';
import { send } from './client';

export type CartQuoteLine = {
  productId: string;
  qty: number;
  /** Null when the part was withdrawn or deleted since it was added. */
  product: Product | null;
  lineTotal: number;
  buyable: boolean;
  /** More than is on the shelf: the shop orders the difference in. */
  backorder: boolean;
};

export type DeliveryMethod = 'DELIVERY' | 'PICKUP';

/** Why a promo code did not apply — worded by the app, per language. */
export type PromoProblem = 'unknown' | 'inactive' | 'not_started' | 'expired' | 'used_up' | 'min_subtotal' | 'too_many';

export type CartQuote = {
  lines: CartQuoteLine[];
  /** The parts, before any code. */
  subtotal: number;
  /** Off the parts by the promo code, worked out by the shop; 0 without one. */
  discount: number;
  promo: { code: string; kind: 'PERCENT' | 'AMOUNT'; value: number } | null;
  promoError: { reason: PromoProblem; minSubtotal?: number } | null;
  /** One in-stock part that reaches free delivery — linked by the shop or confirmed for the car. */
  suggestion: Product | null;
  deliveryMethod: DeliveryMethod;
  deliveryFee: number;
  stampDuty: number;
  total: number;
  freeShippingThreshold: number;
  remainingForFree: number;
  /** A line has to come out before checkout. */
  blocked: boolean;
};

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type Order = {
  ref: string;
  status: OrderStatus;
  createdAt: string;
  history: { status: OrderStatus; at: string }[];
  customerName: string;
  phone: string;
  email: string | null;
  governorate: string;
  address: string | null;
  deliveryMethod: DeliveryMethod;
  paymentMethod: 'COD' | 'CARD';
  vehicleLabel: string | null;
  items: {
    productId: string | null;
    /** Null when the part is no longer on sale — it cannot be reopened. */
    slug: string | null;
    familySlug: string | null;
    name: string;
    sku: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    backorder: boolean;
    fit: 'VERIFIED' | 'DERIVED' | 'UNLISTED' | null;
  }[];
  subtotal: number;
  /** 0 without a code; absent from an order view served before codes existed. */
  discount?: number;
  promoCode?: string | null;
  shippingFee: number;
  stampDuty: number;
  total: number;
  /** The customer's rating, once given — DELIVERED orders only. */
  review?: { stars: number; comment: string | null } | null;
};

export type OrderInput = {
  customerName: string;
  phone: string;
  email?: string;
  governorate: string;
  address?: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: 'COD';
  notes?: string;
  vehicleEngineId?: string;
  /** Only a code the last quote accepted; the shop judges it again. */
  promoCode?: string;
  items: { productId: string; qty: number }[];
};

/**
 * The order the shop just returned, held for the screen that follows.
 *
 * The confirmation screen should not have to ask the shop again for the
 * order it was handed a second ago — on a slow connection that is a second
 * spinner at the moment the customer most wants to see a reference number.
 * It asks only when it was opened any other way (a deep link, a restart).
 */
export const justPlaced = new Map<string, Order>();

export const ordersApi = {
  /** Price a basket the way checkout will. Ids and quantities only — never a price. */
  quote: (
    input: { items: { productId: string; qty: number }[]; engineId?: string; deliveryMethod?: DeliveryMethod; promoCode?: string },
    signal?: AbortSignal,
  ) => send<CartQuote>('/api/v1/cart/quote', { method: 'POST', body: input, signal }),

  /**
   * Place the order. Returns the token — the proof this phone will hold.
   * `session` is the signed-in account's, when there is one: the order then
   * joins the account too.
   */
  place: (input: OrderInput, session?: string) =>
    send<{ ref: string; token: string; order: Order }>('/api/v1/orders', { method: 'POST', body: input, token: session }),

  get: (ref: string, token: string, signal?: AbortSignal) =>
    send<Order>(`/api/v1/orders/${encodeURIComponent(ref)}`, { token, signal }),

  /** Cancel while still PENDING; `unavailable` (reason not_pending) after that. */
  cancel: (ref: string, token: string) =>
    send<Order>(`/api/v1/orders/${encodeURIComponent(ref)}/cancel`, { method: 'POST', token }),

  /** Tell this phone (its Expo push token) when the order moves. */
  subscribe: (ref: string, token: string, pushToken: string, locale: string) =>
    send<{ subscribed: boolean }>(`/api/v1/orders/${encodeURIComponent(ref)}/push`, { method: 'POST', token, body: { token: pushToken, locale } }),
  unsubscribe: (ref: string, token: string, pushToken: string) =>
    send<{ subscribed: boolean }>(`/api/v1/orders/${encodeURIComponent(ref)}/push`, { method: 'DELETE', token, body: { token: pushToken } }),

  /** Rate a delivered order; `unavailable` (not_delivered) before that. Answers the order. */
  review: (ref: string, token: string, input: { stars: number; comment?: string }) =>
    send<Order>(`/api/v1/orders/${encodeURIComponent(ref)}/review`, { method: 'POST', token, body: input }),

  /** Recover an order on this phone with its reference and the phone number on it. */
  lookup: (ref: string, phone: string) =>
    send<{ ref: string; token: string }>('/api/v1/orders/lookup', { method: 'POST', body: { ref, phone } }),
};
