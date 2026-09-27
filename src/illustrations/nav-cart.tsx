import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/**
 * The basket tab's glyph, drawn in NavCar's grammar (24-unit box, 2.0
 * stroke, round caps) so the bar reads as one set: a trolley rolling on two
 * tyres with their hubs showing, the same wheels as the car next to it,
 * rather than the stock cart every shop app ships.
 */
export function NavCart({ size = 22, color = Brand.navy900 }: { size?: number; color?: ColorValue }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2.5 4 h2.6 l2.3 11 h11.1" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5.8 7 h14.6 l-1.7 6.2 H7.1" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11 7.4 v5.4 M15.3 7.4 v5.4" stroke={color} strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
      <Circle cx={9} cy={19} r={2.1} fill={Brand.white} stroke={color} strokeWidth={2} />
      <Circle cx={9} cy={19} r={0.6} fill={color} />
      <Circle cx={17} cy={19} r={2.1} fill={Brand.white} stroke={color} strokeWidth={2} />
      <Circle cx={17} cy={19} r={0.6} fill={color} />
    </Svg>
  );
}
