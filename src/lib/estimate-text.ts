import type { Locale } from '@/i18n/locales';
import type { DeliveryEstimate } from './delivery-estimate';

/**
 * A delivery estimate as words, in the customer's language: "mardi 13
 * octobre", "entre jeudi 8 et samedi 10 octobre", and the courier's hours
 * apart ("10 h–18 h"), so a screen can set the day large and the hours under
 * it. The date is a Tunisian calendar date ("2026-10-13"), formatted as such
 * whatever zone the phone is in.
 */
const TAG: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-TN-u-nu-latn' };

function day(iso: string, locale: Locale, withMonth = true): string {
  try {
    return new Intl.DateTimeFormat(TAG[locale], {
      weekday: 'long',
      day: 'numeric',
      ...(withMonth ? { month: 'long' as const } : {}),
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`));
  } catch {
    return iso;
  }
}

/** "10:00" → "10 h" in French (a no-break space: "10" never ends a line), "10:00" in English and Arabic. */
export function clockText(hhmm: string, locale: Locale): string {
  if (locale !== 'fr') return hhmm;
  const [h, m] = hhmm.split(':');
  return m && m !== '00' ? `${Number(h)}\u00a0h\u00a0${m}` : `${Number(h)}\u00a0h`;
}

/** The days alone: "mardi 13 octobre" or "entre jeudi 8 et samedi 10 octobre". */
export function estimateDays(e: DeliveryEstimate, locale: Locale): string {
  if (e.from === e.to) return day(e.from, locale);
  const sameMonth = e.from.slice(0, 7) === e.to.slice(0, 7);
  const from = day(e.from, locale, !sameMonth);
  const to = day(e.to, locale);
  return locale === 'fr' ? `entre ${from} et ${to}` : locale === 'en' ? `between ${from} and ${to}` : `بين ${from} و${to}`;
}

/** The courier's hours, "10 h–18 h", or null when the shop gave none. */
export function estimateHours(e: DeliveryEstimate, locale: Locale): string | null {
  return e.window ? `${clockText(e.window.start, locale)}–${clockText(e.window.end, locale)}` : null;
}

/** All of it on one line: "mardi 13 octobre, 10 h–18 h". */
export function estimateLine(e: DeliveryEstimate, locale: Locale): string {
  const hours = estimateHours(e, locale);
  return hours ? `${estimateDays(e, locale)}, ${hours}` : estimateDays(e, locale);
}
