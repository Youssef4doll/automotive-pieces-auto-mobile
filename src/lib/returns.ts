import type { Order, ReturnCover, ReturnReason, ReturnRequest } from '@/api/orders';

/**
 * The customer's side of returns, as plain functions of the order the shop
 * sent. The rules themselves (deadlines, who pays, the photo) are worked out
 * by the shop for this order and arrive in `returnOptions`; nothing here
 * decides them again, it only reads them.
 */

export const MAX_RETURN_PHOTOS = 4;

/** Whether a return can be started now: a reason still open, and a part still free to return. */
export function canStartReturn(order: Pick<Order, 'returnOptions'>): boolean {
  const o = order.returnOptions;
  return Boolean(o && o.reasons.some((r) => r.open) && o.items.some((i) => i.returnable > 0));
}

/** The steps a request goes through, and how far this one is — -1 once refused or withdrawn. */
export const RETURN_STEPS = ['REQUESTED', 'APPROVED', 'RECEIVED', 'RESOLVED'] as const;
export function returnStep(r: Pick<ReturnRequest, 'status'>): number {
  return (RETURN_STEPS as readonly string[]).indexOf(r.status);
}

/**
 * Which policy sentence to show, and with what: the shop's-error line names
 * the car when that is what makes it the shop's error; the warranty and the
 * 14-day lines need the shop's own figures, and are left out without them
 * rather than printed with a number the app made up.
 */
export function coverCopy(
  cover: ReturnCover,
  reason: ReturnReason,
  vehicleLabel: string | null,
  figures: { warrantyMonths: number; returnDays: number } | null,
): { key: 'returns.cover.shop' | 'returns.cover.shopVehicle' | 'returns.cover.warranty' | 'returns.cover.standard'; vars: Record<string, string | number> } | null {
  if (cover === 'shop') {
    return reason === 'DOES_NOT_FIT' && vehicleLabel
      ? { key: 'returns.cover.shopVehicle', vars: { vehicle: vehicleLabel } }
      : { key: 'returns.cover.shop', vars: {} };
  }
  if (!figures) return null;
  return cover === 'warranty'
    ? { key: 'returns.cover.warranty', vars: { n: figures.warrantyMonths } }
    : { key: 'returns.cover.standard', vars: { n: figures.returnDays } };
}

/** The error sentence for a refusal the shop sent back (`invalid` with a reason). */
export function returnErrorKey(reason: string | undefined) {
  switch (reason) {
    case 'closed':
      return 'returns.err.closed' as const;
    case 'qty':
    case 'no_items':
      return 'returns.err.qty' as const;
    case 'photo_required':
      return 'returns.err.photo' as const;
    case 'unmounted_required':
      return 'returns.err.unmounted' as const;
    default:
      return 'returns.err.failed' as const;
  }
}
