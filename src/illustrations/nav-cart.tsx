import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/**
 * The basket tab's glyph, drawn in NavCar's grammar (24-unit box, 2.0
 * stroke, round caps and joins) so the bar reads as one set: the handle, a
 * basket with softened corners, two open wheels. Nothing is filled, so it
 * reads the same on white and on the tab bar's navy capsule — the previous
 * drawing filled its wheels white, which became two blobs there, and its
 * faint inner bars were noise at 22pt.
 */
export function NavCart({ size = 22, color = Brand.navy900 }: { size?: number; color?: ColorValue }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 3.5h2.1a1 1 0 0 1 1 .78L7.8 14.2a1.2 1.2 0 0 0 1.17.93h8.66a1.2 1.2 0 0 0 1.16-.9l1.9-7.1a.9.9 0 0 0-.87-1.13H5.9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={9.4} cy={19.4} r={1.6} stroke={color} strokeWidth={2} />
      <Circle cx={17.2} cy={19.4} r={1.6} stroke={color} strokeWidth={2} />
    </Svg>
  );
}
