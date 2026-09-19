/**
 * The locale list and its metadata, kept apart from the translations.
 *
 * Same split as the website's `src/i18n/locales.ts`, and the same three
 * languages in the same order: French is the shop's default, Arabic is the
 * country's, English is for everyone else. A module that only needs to know
 * which locales exist — the switcher, the RTL logic, the font picker — should
 * import from here and not from `dictionaries`, which is every string in all
 * three languages.
 */
export type Locale = 'fr' | 'ar' | 'en';

export const locales: Locale[] = ['fr', 'ar', 'en'];

export const DEFAULT_LOCALE: Locale = 'fr';

export const localeMeta: Record<Locale, { label: string; dir: 'ltr' | 'rtl' }> = {
  fr: { label: 'Français', dir: 'ltr' },
  ar: { label: 'العربية', dir: 'rtl' },
  en: { label: 'English', dir: 'ltr' },
};

export function isRTL(locale: Locale) {
  return localeMeta[locale].dir === 'rtl';
}

/**
 * The best of our three languages for a device that asked for something else.
 *
 * `expo-localization` reports tags like `ar-TN`, `fr-FR`, `en-GB`, and a
 * Tunisian phone very often lists several. Matched on the language subtag
 * only: `ar-TN` and `ar-EG` are both Arabic as far as this shop's copy is
 * concerned, and a shopper whose phone is set to Italian gets French rather
 * than English, because French is what the shop itself speaks.
 */
export function pickLocale(deviceTags: readonly (string | null | undefined)[]): Locale {
  for (const tag of deviceTags) {
    const language = tag?.split('-')[0]?.toLowerCase();
    const match = locales.find((l) => l === language);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}
