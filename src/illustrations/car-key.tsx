import { SvgXml } from 'react-native-svg';

import cleVehicule from './drawn/cle-vehicule';

/** The artist's drawing is 160 × 127; it keeps that shape at any width. */
const RATIO = 127 / 160;

/**
 * A car key and its fob on a ring, no maker's badge on it — the sign for
 * "your car" wherever the app asks for one. Drawn by the shop's artist
 * (assets/illustrations/cle-vehicule.svg). `size` is the width.
 */
export function CarKey({ size = 120 }: { size?: number }) {
  return <SvgXml xml={cleVehicule} width={size} height={size * RATIO} />;
}
