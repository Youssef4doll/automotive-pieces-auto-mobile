import type { DeliveryMethod, OrderStatus } from '@/api/orders';
import type { DictKey } from '@/i18n/dictionaries';

/**
 * An order's state in the customer's words, which depend on how it reaches
 * them. Delivered, the shop's own flow reads as it is (Confirmée, Préparée,
 * Expédiée, Livrée). Collected in store, "Expédiée" means nothing: the parts
 * are being got ready, then they are ready at the counter, then collected.
 * The shop's statuses are the same; only what they are called changes.
 */
const PICKUP_WORD: Partial<Record<OrderStatus, DictKey>> = {
  CONFIRMED: 'pickup.status.CONFIRMED',
  PREPARED: 'pickup.status.READY',
  SHIPPED: 'pickup.status.READY',
  DELIVERED: 'pickup.status.DELIVERED',
};
const PICKUP_NEXT: Partial<Record<OrderStatus, DictKey>> = {
  CONFIRMED: 'pickup.next.CONFIRMED',
  PREPARED: 'pickup.next.READY',
  SHIPPED: 'pickup.next.READY',
  DELIVERED: 'pickup.next.DELIVERED',
};

export function statusWord(status: OrderStatus, method?: DeliveryMethod | null): DictKey {
  return (method === 'PICKUP' && PICKUP_WORD[status]) || (`status.${status}` as DictKey);
}

export function statusNext(status: OrderStatus, method?: DeliveryMethod | null): DictKey {
  return (method === 'PICKUP' && PICKUP_NEXT[status]) || (`next.${status}` as DictKey);
}

/** Waiting at the counter: prepared (or marked shipped by habit) and not yet collected. */
export function readyToCollect(status: OrderStatus, method?: DeliveryMethod | null) {
  return method === 'PICKUP' && (status === 'PREPARED' || status === 'SHIPPED');
}

/** The steps shown on the order's page: no "Expédiée" for an order collected in store. */
export const DELIVERY_FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARED', 'SHIPPED', 'DELIVERED'];
export const PICKUP_FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARED', 'DELIVERED'];
