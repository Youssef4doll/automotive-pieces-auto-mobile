import type { Locale } from '@/i18n/locales';

/**
 * A moment in the past as a message list says it: today and yesterday by
 * name with the time ("Aujourd’hui à 16:00"), an older day by its date
 * ("8 oct."), the year only when it is not this one. The words for today
 * and yesterday are the screen's (`when.today`, `when.yesterday`); this
 * picks which and formats the parts, in the phone's own time zone.
 */
const TAG: Record<Locale, string> = { fr: 'fr-FR', en: 'en-GB', ar: 'ar-TN-u-nu-latn' };

export type When = { day: 'today' | 'yesterday' | null; time: string; date: string };

function dayStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function when(iso: string, locale: Locale, now = new Date()): When {
  const at = new Date(iso);
  const days = Math.round((dayStart(now) - dayStart(at)) / 86_400_000);
  try {
    const time = new Intl.DateTimeFormat(TAG[locale], { hour: '2-digit', minute: '2-digit' }).format(at);
    const date = new Intl.DateTimeFormat(TAG[locale], {
      day: 'numeric',
      month: 'short',
      ...(at.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
    }).format(at);
    return { day: days === 0 ? 'today' : days === 1 ? 'yesterday' : null, time, date };
  } catch {
    return { day: null, time: iso.slice(11, 16), date: iso.slice(0, 10) };
  }
}
