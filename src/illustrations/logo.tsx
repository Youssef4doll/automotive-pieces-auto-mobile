import { Image } from 'expo-image';

/**
 * The shop's logo — their artwork, not a redrawing of it.
 *
 * An earlier pass rebuilt the mark as SVG paths so it could take any colour
 * and scale for free. That was the wrong trade: a reconstruction that is 98%
 * right is a different logo, and a shop's logo is the one thing in an app
 * that has to be exactly itself. `assets/images/logo-lockup.webp` is the
 * file the owner supplied and it is the only source of brand artwork here —
 * `scripts/make-icons.mjs` cuts the launcher icons, the splash mark and the
 * favicon out of the same pixels, so nothing can drift from it.
 *
 * **The supplied artwork has a white wordmark.** It is the version for dark
 * surfaces and it is correct on the navy hero, which is where the app uses
 * it. On a light surface the wordmark disappears — that is a property of the
 * file, not a bug to work around here, and a light-background version has to
 * come from the shop rather than be invented by tinting theirs.
 *
 * Two files rather than one, because a 5.6:1 lockup is unreadable at the
 * width of a list row or a tab bar:
 *
 *   `Logo`     the whole thing, sized by height. For the hero.
 *   `LogoMark` the hexagon alone, square. For anywhere narrow.
 */

/**
 * The lockup's own proportions, after `make-icons.mjs` trims the transparent
 * margin off the supplied file. Stated so a caller can size by height and
 * get the width it expects; re-run the script and check this if the logo
 * file is ever replaced.
 */
const LOCKUP_RATIO = 1910 / 342;

export function Logo({ size = 40 }: { /** Height, in points. */ size?: number }) {
  return (
    <Image
      source={require('@/assets/images/logo-lockup.png')}
      style={{ height: size, width: size * LOCKUP_RATIO }}
      contentFit="contain"
      // The logo is the shop's name. A screen reader should read it as that,
      // not as "image".
      accessibilityLabel="Automotive Pièces Auto"
      accessible
    />
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      source={require('@/assets/images/logo-mark.png')}
      style={{ height: size, width: size }}
      contentFit="contain"
      accessibilityLabel="Automotive Pièces Auto"
      accessible
    />
  );
}
