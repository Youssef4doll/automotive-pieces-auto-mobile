/**
 * The logo's geometry, on its own.
 *
 * Split out of `logo.tsx` so that the React component and the script that
 * bakes the launcher icons (`scripts/make-icons.mjs`) draw from one source.
 * They were two copies for about an hour and that is exactly how an app ends
 * up shipping with a slightly different logo on its home screen than inside
 * itself.
 *
 * Both paths are drawn on a 48×48 grid.
 */

/** The hexagon: flat top and bottom, points left and right, corners rounded. */
export const HEX_PATH =
  // The left and right vertices are rounded far more tightly than the four
  // flat corners. Rounding all six equally, which the first draft did, turned
  // the points into blunt ends and the shape stopped reading as a hexagon at
  // icon sizes.
  'M14.6 4.8 L33.4 4.8 Q35.6 4.8 36.7 6.7 L45.6 22.0 Q46.4 23.2 45.6 24.4 ' +
  'L36.7 39.7 Q35.6 41.6 33.4 41.6 L14.6 41.6 Q12.4 41.6 11.3 39.7 ' +
  'L2.4 24.4 Q1.6 23.2 2.4 22.0 L11.3 6.7 Q12.4 4.8 14.6 4.8 Z';

/**
 * The A, with its counter as a second subpath.
 *
 * Needs `fill-rule: evenodd`. Cutting the counter this way rather than
 * laying a hexagon-coloured triangle over the letter means the A stays
 * correct on any background the mark is placed on.
 */
export const LETTER_PATH =
  'M13.4 37.4 L21.3 11.2 L26.7 11.2 L34.6 37.4 L28.1 37.4 L26.7 32.2 ' +
  'L21.3 32.2 L19.9 37.4 Z M22.4 26.9 L25.6 26.9 L24 20.6 Z';

export const LOGO_VIEWBOX = '0 0 48 48';
