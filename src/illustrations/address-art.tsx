import Svg, { Circle, Ellipse, Path, SvgXml } from 'react-native-svg';

import adresseGps from './drawn/adresse-gps';

/**
 * The shop artist's map with its pin (assets/illustrations/adresse-gps.svg),
 * in the same hand as the car key and the carte grise: where the delivery
 * map stands before the customer has put their door on it.
 */
export function AddressArt({ width = 120 }: { width?: number }) {
  return <SvgXml xml={adresseGps} width={width} height={width * (160 / 200)} />;
}

const PIN = 'M104.22 84.36C100.22 76.36 90.22 66.36 90.22 53.36A14.0 14.0 0 1 1 118.22 53.36C118.22 66.36 108.22 76.36 104.22 84.36Z';

/** The pin's box in the drawing, and where its point is in that box — for putting the point on a spot. */
export const MAP_PIN = { width: 37, height: 54, tipX: 18.22, tipY: 48.36 } as const;

/**
 * The red pin of that drawing on its own, its shapes and colours as drawn:
 * the delivery spot on every map, and the icon of the address beside it.
 * `size` is its height.
 */
export function MapPin({ size = 24, shadow = true }: { size?: number; shadow?: boolean }) {
  return (
    <Svg width={(size * MAP_PIN.width) / MAP_PIN.height} height={size} viewBox="86 36 37 54">
      {shadow ? <Ellipse cx={105.22} cy={85.36} rx={8.5} ry={3.6} fill="#231f20" opacity={0.28} /> : null}
      <Path d={PIN} fill="none" stroke="#231f20" strokeWidth={6} strokeLinejoin="round" />
      <Path d={PIN} transform="translate(2.4 1.8)" fill="#991c1f" stroke="#231f20" strokeWidth={1.6} strokeLinejoin="round" />
      <Path d={PIN} fill="#eb1d25" stroke="#231f20" strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M94.14 51.96A10.92 10.92 0 0 1 101.42 43.00" fill="none" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={2.6} strokeLinecap="round" />
      <Circle cx={104.22} cy={53.36} r={6.4} fill="#ffffff" stroke="#231f20" strokeWidth={1.4} />
      <Circle cx={104.22} cy={53.36} r={3.2} fill="#081633" />
    </Svg>
  );
}
