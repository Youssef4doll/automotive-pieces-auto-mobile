import type { ShopSettings } from '@/api/shop';
import type { DictKey } from '@/i18n/dictionaries';
import type { CheckoutDetails } from '@/store/checkout';

/**
 * A Tunisian number's 8 digits, first digit 2–9, with +216 / 00216 and any
 * separators taken off — or null. The website's rule (lib/validation), so the
 * app refuses a nine-digit number before the shop has to.
 */
export function tunisianDigits(raw: string): string | null {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00216')) d = d.slice(5);
  else if (d.length === 11 && d.startsWith('216')) d = d.slice(3);
  return /^[2-9]\d{7}$/.test(d) ? d : null;
}

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

  if (!tunisianDigits(d.phone)) out.phone = 'checkout.err.phone';

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

/**
 * The shop's two delays as one span, for a tile too small for both sentences:
 * "24h" and "48–72h" read "24–72h". Only when both are in hours; anything
 * else the shop wrote is joined as it was written.
 */
export function delaySpan(a: string | null, b: string | null): string | null {
  if (!a || !b) return a ?? b;
  const hours = (s: string) => (/^\s*[\d\s–-]+h\s*$/i.test(s) ? (s.match(/\d+/g) ?? []).map(Number) : null);
  const x = hours(a);
  const y = hours(b);
  if (!x || !y || !x.length || !y.length) return `${a} / ${b}`;
  const all = [...x, ...y];
  return `${Math.min(...all)}–${Math.max(...all)}h`;
}
