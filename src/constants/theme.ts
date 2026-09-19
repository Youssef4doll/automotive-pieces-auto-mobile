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
    /** Anything secondary: hints, counts, the line under a row. */
    textMuted: '#4b5563',
    /** On a navy surface. */
    textInverse: Brand.white,
    background: Brand.white,
    /** Cards, list rows, the inside of a search field. */
    surface: Brand.navy50,
    /** The navy header and anything else painted with the brand. */
    surfaceBrand: Brand.navy900,
    /** A surface being pressed. Darker than `surface`, never an opacity fade. */
    surfacePressed: '#e2e9f5',
    border: '#dbe3f0',
    /** Dimmed to the edge of legibility: a step not reached, a disabled row. */
    textFaint: '#9aa3b2',
    /** The one accent. Fill only — never text on white; see above. */
    accent: Brand.gold500,
    /** Text and icons that sit ON the accent. */
    onAccent: Brand.navy900,
    danger: Brand.red600,

    /**
     * On the navy hero.
     *
     * Separate entries rather than reusing `textInverse` everywhere, because
     * the hero needs a second, quieter tone for the line under the headline
     * and plain white at 60% opacity is not it — a translucent white over
     * navy goes grey-blue and muddy. navy300 is the shop's own answer, and it
     * measures 6.9:1 on navy950.
     */
    heroText: Brand.white,
    heroTextMuted: Brand.navy300,
    /** A control sitting on the hero — a chip, a button. */
    heroSurface: Brand.navy800,
    /** A divider drawn ON navy — the light border disappears there. */
    navy700: Brand.navy700,
  },
} as const;

/**
 * There is one theme, and it is the shop's.
 *
 * The website has no dark mode — white with a navy header, in daylight and at
 * night — and `userInterfaceStyle` is pinned to light in app.json for the same
 * reason. The scaffold shipped a `Colors.dark` next to this whose values were
 * invented here rather than taken from the site; keeping it would have meant
 * the app quietly rendering a skin the shop has never approved on any phone
 * whose owner has dark mode switched on. It is gone. If the shop ever wants a
 * dark mode, it is designed on the website first and copied here, like every
 * other token in this file.
 */
export const C = Colors.light;

export type ThemeColor = keyof typeof Colors.light;

/**
 * The four families, with the weights the screens actually use.
 *
 * Barlow for body, Barlow Semi Condensed for the uppercase labels and
 * buttons, Archivo for headings. Cairo for Arabic, because none of the other
 * three has Arabic glyphs — under RTL the whole stack swaps, headings
 * included, which is what `familyFor` below is for.
 *
 * React Native does not synthesise a bold: setting `fontWeight: '700'` on a
 * face that was loaded as Regular gives a fake, badly spaced bold on Android
 * and is silently ignored on iOS. So a weight here is a separate loaded face
 * with its own name, and nothing in this app sets `fontWeight` — it picks a
 * family. The names match the keys in `useAppFonts`; a typo in one of them
 * falls back to the system face with no error anywhere, so they are written
 * once, here.
 */
export const Fonts = {
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodySemi: 'Barlow_600SemiBold',
  display: 'BarlowSemiCondensed_600SemiBold',
  heading: 'Archivo_700Bold',
  headingStrong: 'Archivo_800ExtraBold',
  arabic: 'Cairo_400Regular',
  arabicSemi: 'Cairo_700Bold',
  arabicHeading: 'Cairo_800ExtraBold',
} as const;

export type FontRole = 'body' | 'bodyMedium' | 'bodySemi' | 'display' | 'heading' | 'headingStrong';

/**
 * The family for a role, in the language being rendered.
 *
 * Arabic gets Cairo for every role rather than only for body text. The first
 * draft swapped the body face and left the headings on Archivo, which has no
 * Arabic glyphs: every screen title rendered as boxes. Three weights of Cairo
 * do not map one-to-one onto six roles of three Latin families, and pretending
 * otherwise would be worse than this — the roles collapse onto the nearest
 * Cairo weight and the hierarchy survives.
 */
export function familyFor(role: FontRole, isArabic: boolean): string {
  if (!isArabic) return Fonts[role];
  switch (role) {
    case 'heading':
    case 'headingStrong':
      return Fonts.arabicHeading;
    case 'display':
    case 'bodySemi':
      return Fonts.arabicSemi;
    default:
      return Fonts.arabic;
  }
}

/**
 * Type sizes, in points.
 *
 * `lineHeight` is stated for every one of them. React Native's default
 * leading depends on the font's own metrics, and Cairo's are taller than
 * Barlow's — left to themselves, the same screen in Arabic came out about a
 * line and a half longer than in French and the last row fell under the tab
 * bar. Fixing the leading here makes the three languages lay out the same.
 */
export const Type = {
  /**
   * The one oversized size, for a headline on the navy hero.
   *
   * Tight leading (40 on 38) because it is set in two or three short lines —
   * a make on one, a model on the next — and default leading pulls those
   * apart until they stop reading as one object.
   */
  hero: { fontSize: 38, lineHeight: 40, letterSpacing: -0.8 },
  screenTitle: { fontSize: 28, lineHeight: 34 },
  sectionTitle: { fontSize: 20, lineHeight: 26 },
  rowTitle: { fontSize: 17, lineHeight: 22 },
  body: { fontSize: 15, lineHeight: 21 },
  label: { fontSize: 13, lineHeight: 17, letterSpacing: 0.6 },
  hint: { fontSize: 13, lineHeight: 18 },
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

/**
 * Corner radii.
 *
 * Bigger than the first pass, and deliberately so: a 12pt radius on a phone
 * card reads as a 2018 list, and the shop's own storefront is softer than
 * that. The scale steps rather than drifting — a `sheet` beside a `card`
 * beside a `tile` should look like three sizes of the same idea, not three
 * separate decisions.
 *
 * `sheet` is the big one: a light panel that overlaps a navy hero. `hero` is
 * the bottom corners of the hero itself, slightly larger so the two nest
 * without the inner corner looking pinched.
 */
export const Radius = {
  chip: 999,
  tile: 18,
  card: 20,
  sheet: 28,
  hero: 32,
  pill: 999,
} as const;

/**
 * Depth, in two steps and no more.
 *
 * The references this was drawn from get most of their modernity from
 * layering — a light sheet sitting over a darker surface, with a soft shadow
 * selling the gap. What they do not have is six elevation levels: every
 * shadow in a well-behaved phone UI is either "this floats a little" or
 * "this floats over everything".
 *
 * Tuned dark and wide rather than black and tight. `#081633` at low opacity
 * spread over 24pt reads as depth; `#000` at high opacity over 4pt reads as a
 * border someone got wrong. Android takes `elevation` and ignores the rest,
 * which is why both are set.
 */
export const Elevation = {
  /** Cards and tiles resting on the background. */
  resting: {
    shadowColor: Brand.navy950,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  /** A sheet overlapping a hero, or anything the eye should read as on top. */
  lifted: {
    shadowColor: Brand.navy950,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 8,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

/**
 * A phone's worth of width, centred, on anything wider.
 *
 * The app runs on tablets and in a browser during development, and a list of
 * makes stretched to 1400px is unreadable — the tap target for "Renault" ends
 * up a metre from the name. 800 is the website's own content width.
 */
export const MaxContentWidth = 800;
