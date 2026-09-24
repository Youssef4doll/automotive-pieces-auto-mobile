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

export type CartQuote = {
  lines: CartQuoteLine[];
  subtotal: number;
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
  shippingFee: number;
  stampDuty: number;
  total: number;
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
    input: { items: { productId: string; qty: number }[]; engineId?: string; deliveryMethod?: DeliveryMethod },
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

  /** Recover an order on this phone with its reference and the phone number on it. */
  lookup: (ref: string, phone: string) =>
    send<{ ref: string; token: string }>('/api/v1/orders/lookup', { method: 'POST', body: { ref, phone } }),
};
