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

/** A category's name in the customer's language, or the shop's own when there is no translation. */
export function categoryName(slug: string | null | undefined, name: string): string {
  if (current === 'fr' || !slug) return name;
  return CATEGORY_NAMES[slug]?.[current] ?? name;
}
