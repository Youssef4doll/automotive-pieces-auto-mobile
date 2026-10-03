import { CATEGORY_NAMES } from './categories';
import type { Locale } from './locales';

/**
 * The language the shop's own data is shown in, for code that has no React
 * context: the API modules, which translate category names on the way in.
 * Set by I18nProvider; French means "as the shop wrote it".
 */
let current: Locale = 'fr';

export function setDataLocale(locale: Locale) {
  current = locale;
}

/** The app's language, for code with no React context (sign-in codes, push wording). */
export function appLocale(): Locale {
  return current;
}

/** A category's name in the customer's language, or the shop's own when there is no translation. */
export function categoryName(slug: string | null | undefined, name: string): string {
  if (current === 'fr' || !slug) return name;
  return CATEGORY_NAMES[slug]?.[current] ?? name;
}

/** French day names as shops write them, short and long, in their English and Arabic forms. */
const DAYS: [RegExp, string, string][] = [
  [/\blundi\b|\blun\.?(?=\W|$)/gi, 'Mon', 'الإثنين'],
  [/\bmardi\b|\bmar\.?(?=\W|$)/gi, 'Tue', 'الثلاثاء'],
  [/\bmercredi\b|\bmer\.?(?=\W|$)/gi, 'Wed', 'الأربعاء'],
  [/\bjeudi\b|\bjeu\.?(?=\W|$)/gi, 'Thu', 'الخميس'],
  [/\bvendredi\b|\bven\.?(?=\W|$)/gi, 'Fri', 'الجمعة'],
  [/\bsamedi\b|\bsam\.?(?=\W|$)/gi, 'Sat', 'السبت'],
  [/\bdimanche\b|\bdim\.?(?=\W|$)/gi, 'Sun', 'الأحد'],
];

/**
 * The shop's opening hours, which it types in French ("Lun–Sam · 8h30–18h30"),
 * in the customer's language: day names translated, "8h30" as "8:30". Words
 * this does not know are left as the shop wrote them.
 */
export function openingHours(text: string | null): string | null {
  return text ? hoursIn(text, current) : text;
}

export function hoursIn(text: string, locale: Locale): string {
  if (locale === 'fr') return text;
  let out = text.replace(/\b(\d{1,2})h(\d{2})?\b/g, (_, h: string, m?: string) => `${h}:${m ?? '00'}`);
  for (const [re, en, ar] of DAYS) out = out.replace(re, locale === 'ar' ? ar : en);
  if (locale === 'ar') out = out.replace(/\bferm[ée]e?(?![\p{L}])/giu, 'مغلق');
  else out = out.replace(/\bferm[ée]e?(?![\p{L}])/giu, 'closed');
  return out;
}

const FUELS: Record<string, { en: string; ar: string }> = {
  essence: { en: 'Petrol', ar: 'بنزين' },
  diesel: { en: 'Diesel', ar: 'ديزل' },
  hybride: { en: 'Hybrid', ar: 'هجين' },
  'hybride essence': { en: 'Petrol hybrid', ar: 'هجين بنزين' },
  gpl: { en: 'LPG', ar: 'غاز البترول المسال' },
  électrique: { en: 'Electric', ar: 'كهربائي' },
};

/** An engine's fuel, which the shop records in French, in the customer's language. */
export function fuelName(fuel: string | null): string | null {
  if (!fuel || current === 'fr') return fuel;
  return FUELS[fuel.trim().toLowerCase()]?.[current] ?? fuel;
}
