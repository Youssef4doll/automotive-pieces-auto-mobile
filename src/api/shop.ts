import { get } from './client';

/**
 * What the shop has said in public about how it trades.
 *
 * Every value is the owner's, from the website's settings: delivery fee and
 * threshold, the delivery times as the shop wrote them, the stamp duty, and
 * the contact channels — each of which is null until the owner fills it in.
 * The app reads this rather than carrying any of it as a constant, because
 * the brief is explicit that tax and delivery are settings-driven.
 */
export type ShopSettings = {
  currency: 'TND';
  delivery: {
    fee: number;
    freeShippingThreshold: number;
    /** "24h", "48–72h" — the shop's own words. Null when unset. */
    grandTunis: string | null;
    regions: string | null;
  };
  tax: { vatRate: number; stampDuty: number };
  supplierLeadTime: string | null;
  warrantyMonths: number;
  returnDays: number;
  paymentMethods: readonly 'COD'[];
  /** Only when the shop has said where the shop is. */
  pickup: { address: string; hours: string | null } | null;
  contact: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    whatsapp: string | null;
    hours: string | null;
  };
  governorates: string[];
  grandTunis: string[];
};

export const shopApi = {
  settings: (signal?: AbortSignal) => get<ShopSettings>('/api/v1/settings/public', { signal }),
};

/** Is there any way to reach a person at the shop? */
export function hasContactChannel(s: ShopSettings) {
  return Boolean(s.contact.whatsapp || s.contact.phone || s.contact.email);
}
