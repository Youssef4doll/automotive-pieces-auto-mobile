import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager, Platform } from 'react-native';

import { dictionary, type DictKey } from './dictionaries';
import { DEFAULT_LOCALE, isRTL, pickLocale, type Locale } from './locales';

const STORAGE_KEY = 'apa-locale';

type I18n = {
  locale: Locale;
  /** True for Arabic. Read it for layout direction and for the font stack. */
  rtl: boolean;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
  /**
   * The chosen locale is Arabic but the native layout is still left-to-right
   * (or the other way round). Only ever true on a device that has not been
   * restarted since the switch — see below.
   */
  needsRestartForRTL: boolean;
};

const Ctx = createContext<I18n | null>(null);

/**
 * Language, and the one genuinely awkward thing about it.
 *
 * Translating text is the easy half. Arabic also flips the layout: the back
 * chevron points the other way, a list row's chevron moves to the left, and
 * every `marginLeft` in the app has to become a `marginRight`. React Native
 * does that for you through `I18nManager` — but only at startup, because the
 * native view system reads the direction once when it is created. Calling
 * `forceRTL` mid-session changes the flag and not the screen, and the app is
 * then in the state where half the layout has flipped and half has not, which
 * looks like a bug in every screen at once.
 *
 * So this does two things rather than pretend:
 *
 *   it writes `writingDirection` and `flexDirection` from the `rtl` flag in
 *   the components themselves, which works immediately and covers text and
 *   the rows this app is made of;
 *
 *   and where the native flag genuinely disagrees, it says so — `lang.rtlRestart`
 *   asks the customer to restart, once, in the language they just picked.
 *
 * The alternative, reloading the app out from under someone who has just
 * tapped a menu item, is what several apps do and it loses whatever they were
 * in the middle of.
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Start on the device's language rather than on French. A Tunisian phone
  // set to Arabic should not have to find the setting to read Arabic.
  const [locale, setLocaleState] = useState<Locale>(() =>
    pickLocale(Localization.getLocales().map((l) => l.languageTag)),
  );
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (cancelled) return;
        if (saved === 'fr' || saved === 'ar' || saved === 'en') setLocaleState(saved);
      })
      // A phone whose storage refuses to read is not a reason to show nothing.
      // The device language is a good enough answer and the customer can
      // change it again.
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setRestored(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
    // Ask the native side for the direction it should have on next launch.
    // `allowRTL` has to be on or `forceRTL` is ignored outright.
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(isRTL(next));
  }, []);

  const value = useMemo<I18n>(() => {
    const strings = dictionary(locale);
    const rtl = isRTL(locale);
    return {
      locale,
      rtl,
      setLocale,
      needsRestartForRTL: needsRestart(rtl),
      t: (key, vars) => {
        const raw = strings[key];
        if (!vars) return raw;
        // `{n}` and friends. A variable with no value is left as it was
        // written rather than rendered as "undefined" — a visible `{n}` is a
        // bug report, and "undefined pièces" is a lie about the catalogue.
        return raw.replace(/\{(\w+)\}/g, (whole, name: string) =>
          name in vars ? String(vars[name]) : whole,
        );
      },
    };
  }, [locale, setLocale]);

  // Until storage has answered, render nothing. The gap is one frame or two,
  // and the alternative is the first screen appearing in French and visibly
  // re-rendering into Arabic, which reads as the app forgetting the setting.
  if (!restored) return null;

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Does the native layout direction disagree with the language on screen?
 *
 * Two traps here, and the first one shipped before it was caught.
 *
 * `I18nManager.isRTL` does not exist on react-native-web — the web shim
 * exposes only `getConstants()`. Reading the property gave `undefined`, and
 * `false !== undefined` is true, so every web session displayed "l'arabe se
 * lit de droite à gauche, redémarrez l'app" underneath a screen that was in
 * English. `getConstants().isRTL` is defined on all three platforms.
 *
 * And on the web there is nothing to restart. The browser re-lays-out the
 * moment `direction` changes, so the prompt is never right there whatever the
 * flag says. It is a native-only question.
 */
function needsRestart(rtl: boolean): boolean {
  if (Platform.OS === 'web') return false;
  return rtl !== I18nManager.getConstants().isRTL;
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n was called outside I18nProvider');
  return ctx;
}

export { DEFAULT_LOCALE };
export type { Locale, DictKey };
