import type { Locale } from './locales';

/**
 * Plurals, per language, without leaning on Intl (not every JS engine the
 * app runs on ships PluralRules).
 *
 * French and English strings write "(s)": "3 pièce(s)" becomes "3 pièces",
 * "1 pièce". French treats 0 and 1 as singular, English only 1.
 *
 * Arabic has six forms and "(s)" cannot express them — "8 قطعة" is wrong
 * (8 takes the plural قطع) and "2 قطعة" is wrong (2 is the dual قطعتان). An
 * Arabic string spells its forms out: `{n:one=قطعة واحدة;two=قطعتان;few=# قطع;other=# قطعة}`,
 * `#` standing for the number. Missing forms fall back to `other`.
 */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export function pluralCategory(locale: Locale, n: number): PluralCategory {
  if (locale === 'ar') {
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    const mod = n % 100;
    if (mod >= 3 && mod <= 10) return 'few';
    if (mod >= 11 && mod <= 99) return 'many';
    return 'other';
  }
  if (locale === 'fr') return n === 0 || n === 1 ? 'one' : 'other';
  return n === 1 ? 'one' : 'other';
}

const FORMS = /\{(\w+):([^{}]+)\}/g;

/** Fill a string's plural forms and "(s)" markers for the counts in `vars`. */
export function pluralize(raw: string, locale: Locale, vars: Record<string, string | number>): string {
  let out = raw.replace(FORMS, (whole, name: string, spec: string) => {
    if (!(name in vars)) return whole;
    const n = Number(vars[name]);
    const forms: Partial<Record<string, string>> = {};
    for (const part of spec.split(';')) {
      const i = part.indexOf('=');
      if (i > 0) forms[part.slice(0, i).trim()] = part.slice(i + 1);
    }
    const cat = pluralCategory(locale, n);
    const form = forms[cat] ?? (cat === 'zero' ? forms.other : undefined) ?? forms.other ?? whole;
    return form.replace(/#/g, String(vars[name]));
  });
  const count = 'n' in vars ? vars.n : 'days' in vars ? vars.days : undefined;
  if (count !== undefined && out.includes('(s)') && locale !== 'ar') {
    out = out.replace(/\(s\)/g, pluralCategory(locale, Number(count)) === 'one' ? '' : 's');
  }
  return out;
}
