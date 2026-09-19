/**
 * The shop's tokens, lifted from the website's globals.css.
 *
 * These are the same literal values the storefront paints with, so a screen
 * here and a page there cannot drift into two slightly different navies. The
 * website is the reference: automotive-pieces-auto.vercel.app.
 *
 * Two facts that are load-bearing rather than decorative:
 *
 *   gold500 on white is 2.09:1 and fails WCAG AA for text. Gold is a button
 *   fill carrying navy text, never text on a white background. The website
 *   shipped a gold eyebrow once and had to take it back out.
 *
 *   The tap sizes are not padding suggestions. 44 is the accessibility floor
 *   for anything a finger touches; 48 is what a primary action gets.
 */

import '@/global.css';

import { Platform } from 'react-native';

/** The brand ramp, whole. Prefer a semantic colour below where one exists. */
export const Brand = {
  navy950: '#081633',
  navy900: '#0f2352',
  navy800: '#16305f',
  navy700: '#1c3a70',
  navy600: '#274a87',
  navy400: '#6b83ad',
  navy300: '#9aabc8',
  navy50: '#eff3fa',
  gold600: '#e0ac00',
  gold500: '#fbc000',
  gold400: '#ffd23d',
  red600: '#c50e26',
  red500: '#e1112c',
  white: '#ffffff',
} as const;

/**
 * The website has no dark mode — the shop is white with a navy header, in
 * daylight and at night. `userInterfaceStyle` is pinned to light in app.json
 * for the same reason. The dark entries exist only so a component that reads
 * the scheme cannot crash; they are not a designed dark theme, and inventing
 * one here would put the app and the site in two different skins.
 */
export const Colors = {
  light: {
    text: Brand.navy900,
    background: Brand.white,
    backgroundElement: Brand.navy50,
    backgroundSelected: Brand.navy300,
    textSecondary: '#4b5563',
  },
  dark: {
    text: Brand.white,
    background: Brand.navy950,
    backgroundElement: Brand.navy800,
    backgroundSelected: Brand.navy700,
    textSecondary: Brand.navy300,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Barlow for body, Barlow Semi Condensed for the uppercase labels and
 * buttons, Archivo for headings. Cairo for Arabic, because none of the other
 * three has Arabic glyphs — under RTL the whole stack swaps, headings
 * included. The families still have to be loaded with expo-font before these
 * names resolve; until then React Native silently falls back to the system
 * face, which is why this is a task and not a decoration.
 */
export const Fonts = {
  body: 'Barlow',
  display: 'BarlowSemiCondensed',
  heading: 'Archivo',
  arabic: 'Cairo',
} as const;

/** Minimum touch target sizes, in points. Not negotiable downwards. */
export const Tap = {
  primary: 48,
  min: 44,
  compact: 40,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
