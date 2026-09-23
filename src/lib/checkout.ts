import type { ShopSettings } from '@/api/shop';
import type { DictKey } from '@/i18n/dictionaries';
import type { CheckoutDetails } from '@/store/checkout';

export type CheckoutField = 'customerName' | 'phone' | 'email' | 'governorate' | 'address';

/**
 * What is wrong with the delivery form, before it is sent.
 *
 * The shop is the authority: `POST /api/v1/orders` validates with the
 * website's own `lib/validation.ts` and names the field it refused, and the
 * payment step shows that. These checks exist so the customer hears about an
 * empty phone number on the screen where they typed it, not one screen later
 * — and they use the website's thresholds and its sentences, so the two can
 * only disagree if the website tightens a rule, in which case the server's
 * answer still reaches the customer.
 */
export function checkoutProblems(d: CheckoutDetails): Partial<Record<CheckoutField, DictKey>> {
  const out: Partial<Record<CheckoutField, DictKey>> = {};

  const name = d.customerName.trim();
  const letters = (name.match(/\p{L}/gu) ?? []).length;
  if (name.includes('@')) out.customerName = 'checkout.err.customerNameEmail';
  else if (name.length < 2 || letters < 2) out.customerName = 'checkout.err.customerName';

  if (d.phone.replace(/\D/g, '').length < 8) out.phone = 'checkout.err.phone';

  const email = d.email.trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) out.email = 'checkout.err.email';

  if (!d.governorate) out.governorate = 'checkout.err.governorate';

  if (d.deliveryMethod === 'DELIVERY' && d.address.trim().length < 5) out.address = 'checkout.err.address';

  return out;
}

/**
 * The delay the shop publishes for a governorate, in the shop's own words —
 * "24h" for Grand Tunis, "48–72h" elsewhere — or null when it has published
 * none. Never a date: a delay the shop committed to is information, a date
 * computed from it is a promise nobody made.
 */
export function deliveryDelay(settings: ShopSettings, governorate: string): string | null {
  if (!governorate) return settings.delivery.grandTunis && settings.delivery.regions
    ? `${settings.delivery.grandTunis} · ${settings.delivery.regions}`
    : settings.delivery.grandTunis ?? settings.delivery.regions;
  return settings.grandTunis.includes(governorate) ? settings.delivery.grandTunis : settings.delivery.regions;
}
