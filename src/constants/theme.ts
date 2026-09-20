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

import { Platform, StyleSheet } from 'react-native';

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
  /**
   * The pressed state of a red button, which the shop's own palette has no
   * entry for.
   *
   * `globals.css` defines red-600 and red-500 and nothing darker, and the
   * website's destructive buttons are `bg-red-600 hover:bg-red-700` — so the
   * hover they actually render is Tailwind's stock red-700 rather than a shop
   * colour. This is that value, written down rather than invented, so the two
   * front doors darken a delete button to the same red. If the shop ever adds
   * a real red-700 to globals.css, this is the line that changes.
   */
  red700: '#b91c1c',
  white: '#ffffff',

  /**
   * Green, which is not in the brief's palette and is in the shop.
   *
   * `BRIEF.md` §4 lists navy, gold and red, and the website nonetheless
   * paints "En stock" and "Compatible" green in about a hundred places —
   * `AVAILABILITY_TONE` in its `lib/availability.ts` is the canonical one.
   * These are the Tailwind greens those classes resolve to, read off the
   * storefront rather than chosen here, because a success state the app
   * invented its own colour for would put the two front doors in different
   * skins on the one signal a parts shop cannot afford to get wrong.
   */
  green700: '#15803d',
  green600: '#16a34a',
  green200: '#bbf7d0',
  green50: '#f0fdf4',
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
    /** A red button being pressed. See `Brand.red700`. */
    dangerPressed: Brand.red700,
    dangerSurface: '#fdf2f3',

    /** Yes: in stock, fits your car. Always with an icon — never colour alone. */
    success: Brand.green700,
    successSurface: Brand.green50,
    successBorder: Brand.green200,
    /** Careful: we do not know whether this fits. Gold, the shop's attention. */
    caution: Brand.gold600,
    cautionSurface: '#fffbeb',
    cautionBorder: '#fde68a',

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
   * The headline on the navy hero.
   *
   * 26, not the 38 it started at. At 38 the home screen's two-line headline
   * wrapped to three and the hero took 45% of a 390pt phone before the
   * customer reached a single control — the desktop hero habit that a mobile
   * redesign exists to remove. A home screen's job is to get somebody moving,
   * and confidence here comes from the weight and the navy behind it rather
   * than from the point size.
   *
   * Leading is tight (31 on 26) because it is set in short stacked lines and
   * default leading pulls them apart until they stop reading as one object.
   */
  hero: { fontSize: 26, lineHeight: 31, letterSpacing: -0.4 },
  screenTitle: { fontSize: 28, lineHeight: 34 },
  sectionTitle: { fontSize: 20, lineHeight: 26 },
  rowTitle: { fontSize: 17, lineHeight: 22 },
  body: { fontSize: 15, lineHeight: 21 },
  label: { fontSize: 13, lineHeight: 17, letterSpacing: 0.6 },
  hint: { fontSize: 13, lineHeight: 18 },
} as const;

/**
 * Touch target sizes, in points. Not negotiable downwards.
 *
 * `compact` is 40 and the brief allows it for "inline secondary controls",
 * but nothing in this app uses it as the height of something a finger hits
 * any more — a sweep across seven viewports found filter chips, "Voir tout"
 * and the garage's row actions all sitting at 40, which is under the 44
 * accessibility floor whatever the control is called. It survives for insets
 * and for sizing things that are not targets.
 *
 * Anything pressable gets `min` at least, and a screen's one primary action
 * gets `primary`.
 */
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

/**
 * How tall the tab bar is, before the home-indicator inset.
 *
 * One number, read by the navigator that draws the bar AND by every screen
 * that has to keep its last row out from under it. They were separate once
 * and the home screen's part-family rail spent a release half-hidden behind
 * the bar, because the bar knew its height and the scroll view did not.
 *
 * `useTabBarSpace` in hooks/ adds the safe-area inset and the breathing room;
 * screens should use that rather than this constant directly.
 */
export const TabBarHeight = 76;

/**
 * A phone's worth of width, centred, on anything wider.
 *
 * The app runs on tablets and in a browser during development, and a list of
 * makes stretched to 1400px is unreadable — the tap target for "Renault" ends
 * up a metre from the name. 800 is the website's own content width.
 */
export const MaxContentWidth = 800;

/**
 * Stroke weights.
 *
 * Three, because a border is either a hairline separating things that belong
 * together, a visible edge around a control, or a selection mark. `hairline`
 * is the platform's thinnest real line — 1 physical pixel, which is 0.33pt on
 * a 3x screen — and hard-coding 1 instead makes it three times too heavy on
 * exactly the devices the shop's customers carry.
 */
export const Border = {
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  selected: 1.5,
} as const;

/** Icon sizes, matched to the type they sit beside rather than picked freely. */
export const IconSize = {
  /** Inline with `hint` and `label`. */
  small: 14,
  /** Inline with `body` and `rowTitle`; the default. */
  medium: 18,
  /** A chevron at the end of a row, a tab bar glyph. */
  large: 20,
  /** Inside a soft square on a card. */
  feature: 22,
} as const;

/**
 * Motion.
 *
 * Fast, and fewer options than a design system usually ships, because motion
 * here is information rather than decoration: it says where a thing came from
 * and whether a tap registered. Anything above `slow` on a phone reads as the
 * app hesitating.
 *
 * `press` is deliberately near-instant. The one thing a tap must never do is
 * look dead, and a 200ms fade-in on a pressed state is long enough to feel
 * like lag on a mid-range Android.
 */
export const Motion = {
  press: 80,
  fast: 140,
  normal: 220,
  slow: 320,
  /** A sheet or a screen arriving. Slightly overshooting, never bouncy. */
  spring: { damping: 22, stiffness: 240, mass: 0.9 },
} as const;

/**
 * Stacking order, named so two overlays cannot quietly disagree.
 *
 * The gaps are 10 so something can be slipped between two layers later
 * without renumbering everything below it.
 */
export const ZIndex = {
  base: 0,
  sticky: 10,
  header: 20,
  sheet: 30,
  toast: 40,
} as const;

/**
 * The widths this app is actually used at.
 *
 * Not invented: these are the viewport widths of the handsets the shop's
 * customers carry, plus a tablet. `small` is the one that catches layout
 * bugs — a 320pt screen is where a two-column grid of tiles stops fitting and
 * a price runs into a badge.
 *
 * Used for judgement in a layout, never for a fixed width. Nothing in this
 * app should be sized in pixels when it could flex.
 */
export const Breakpoint = {
  /** iPhone SE 1st gen and similar. The floor. */
  small: 320,
  /** The common Android width. */
  standard: 360,
  /** iPhone 12–16 and most of the modern range. */
  large: 390,
  /** iPhone Pro Max. */
  xlarge: 430,
  /** Tablet, and the browser during development. */
  tablet: 768,
} as const;

/**
 * The geometry of the home screen's discovery arc.
 *
 * These live here rather than inside the component because they are the one
 * place the arc can be made gimmicky, and a number buried in a transform is a
 * number nobody reviews. Every one of them is deliberately small.
 *
 * `lift` is the whole trick. A card one step off centre sits 16pt lower than
 * the active one and 30pt lower two steps out, which traces a shallow dome
 * across the row — enough that the eye reads a path rather than a shelf, not
 * enough to look like a carousel from a 2013 jQuery plugin. It was 40 in the
 * first pass and the row looked like it was falling off the screen.
 *
 * `slideRatio` is what makes the next card peek. At 0.62 of the viewport a
 * 390pt phone shows the active card and about 75pt of each neighbour, which
 * is the whole scroll affordance — no dots, no scrollbar, no arrows. Below
 * about 0.55 three cards compete for attention and none of them wins; above
 * about 0.7 the peek disappears and the row looks like it ends.
 */
export const Arc = {
  slideRatio: 0.62,
  /** A slide never grows past this on a tablet, or the arc spans a metre. */
  slideMax: 260,
  /** …and never shrinks below this, or the title wraps to four lines. */
  slideMin: 196,
  /** How far a neighbour drops, one step out and two steps out. */
  lift: 16,
  liftFar: 30,
  /** Scale of a card one step off centre, and two steps off. */
  scaleIdle: 0.94,
  scaleFar: 0.9,
  /** Opacity of the same. Never below ~0.6: the text must stay readable. */
  opacityIdle: 0.78,
  opacityFar: 0.62,
} as const;
