import type { Locale } from '@/i18n/locales';

/**
 * "89,00 DT" — money as Tunisia writes it, in all three languages.
 *
 * The comma is the decimal separator and "DT" is not translated: it is what
 * is on the shelf label and on the invoice whatever the phone's language.
 * `Price` sets the same figure typographically; this is the plain-text form,
 * for a total in a sentence or an accessibility label.
 *
 * Two decimals, not the millimes the dinar actually has: the shop prices to
 * the centime, and the website prints two.
 *
 * Wrapped in Unicode directional isolates (LRI … PDI). Inside an Arabic
 * sentence the bidi algorithm otherwise reorders "117,30 DT" into
 * "DT 117,30" — the Latin "DT" jumps to the far side of the number — and the
 * customer reads a figure laid out differently from the one on the invoice
 * and the shelf label. An isolate says "this run is left-to-right, keep it
 * whole" and changes nothing in French or English. Invisible characters, so
 * anything that compares amounts must compare numbers, never these strings.
 */
const LRI = '\u2066';
const PDI = '\u2069';

export function formatDT(value: number): string {
  return `${LRI}${value.toFixed(2).replace('.', ',')} DT${PDI}`;
}

/**
 * A date as the customer reads it, in their language.
 *
 * `Intl` where the runtime has it — Hermes ships it — with the Latin digits
 * Tunisia uses on paper even in Arabic (`-u-nu-latn`), so an order date in
 * the Arabic app matches the one on the printed receipt. Falls back to the
 * ISO day if a runtime has no Intl at all, which is ugly and still true.
 */
export function formatDate(iso: string, locale: Locale, withTime = false): string {
  const date = new Date(iso);
  const tag = locale === 'ar' ? 'ar-TN-u-nu-latn' : locale === 'en' ? 'en-GB' : 'fr-FR';
  try {
    return new Intl.DateTimeFormat(tag, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(date);
  } catch {
    return iso.slice(0, 10);
  }
}

/** Production years, only as the shop recorded them: "2004–2011", "depuis 2019", or nothing. */
export function yearSpan(
  from: number | null,
  to: number | null,
  t: (key: 'common.years' | 'common.yearsFrom', vars: Record<string, number>) => string,
): string | null {
  if (from && to) return t('common.years', { from, to });
  if (from) return t('common.yearsFrom', { from });
  return null;
}
