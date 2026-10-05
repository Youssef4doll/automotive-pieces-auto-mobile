import { SvgXml } from 'react-native-svg';

import carteGriseVin from './drawn/carte-grise-vin';

/** The artist's drawing is 250 × 176; it keeps that shape at any width. */
const RATIO = 176 / 250;

/**
 * A registration card, tilted on the page, its serial-number line picked out
 * in gold under a "VIN" tag — "it is on the grey card, on this line".
 * Drawn by the shop's artist (assets/illustrations/carte-grise-vin.svg).
 *
 * The values printed on it are the artist's sample, there to look like a
 * filled-in card; nothing on it is read as anyone's data.
 */
export function CarteGrise({ width = 280 }: { width?: number }) {
  return <SvgXml xml={carteGriseVin} width={width} height={width * RATIO} />;
}
