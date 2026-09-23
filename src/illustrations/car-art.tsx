import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/**
 * "Your vehicle", illustrated — the filled companion to `CarProfile`, in the
 * hand of the part-family illustrations the website serves (navy outline,
 * flat fills, one yellow accent, a soft ground shadow).
 *
 * Deliberately generic: a compact five-door with no grille, badge or light
 * signature of any maker. The shop knows a make, model and engine, not a
 * body style or a colour, so the same car stands for every entry in the
 * garage and claims nothing about any of them.
 *
 * 120×56 units; `width` sets the rendered size.
 */
const O = Brand.navy950;

export function CarArt({ width = 120, body = Brand.navy700 }: { width?: number; body?: string }) {
  const height = (width * 56) / 120;
  // The outline thickens a little when the car is small, so it keeps its edge.
  const s = width < 90 ? 1.9 : 1.6;
  return (
    <Svg width={width} height={height} viewBox="0 0 120 56">
      <Ellipse cx="60" cy="51.5" rx="50" ry="3.2" fill={O} opacity={0.12} />
      <G stroke={O} strokeWidth={s} strokeLinejoin="round" strokeLinecap="round">
        {/* body */}
        <Path
          d="M9 40.5V33c0-3 1.6-5 4.6-5.8l15.8-3.9 12.4-10.6c2-1.7 4.4-2.6 7-2.6h27.4c2.9 0 5.6 1.2 7.5 3.4l8.8 9.9 11.6 2.2c3.8.7 6.4 3.6 6.4 7.5v7.4c0 1.4-1.1 2.5-2.5 2.5h-6.6a11 11 0 0 0-21.8 0H43.9a11 11 0 0 0-21.8 0H11.5c-1.4 0-2.5-1.1-2.5-2.5z"
          fill={body}
        />
        {/* shoulder highlight */}
        <Path d="M16 30.5 97 30" stroke={Brand.white} strokeOpacity={0.25} strokeWidth={s * 0.9} fill="none" />
        {/* glass */}
        <Path d="M33 23.8 43.6 14.8c1.4-1.2 3.1-1.8 4.9-1.8h9.3v10.8z" fill={Brand.navy300} />
        <Path d="M61.5 13h14.3c2 0 3.8.8 5.1 2.3l7.4 8.5H61.5z" fill={Brand.navy300} />
        <Path d="M59.7 13v27" fill="none" />
        {/* lights */}
        <Path d="M103.5 28.5h5.5c1.2 0 2.2.8 2.5 2l.3 1.5h-6.8z" fill={Brand.gold500} />
        <Rect x={9} y={30} width={4.5} height={3.2} rx={1} fill="#e1112c" />
        {/* handle */}
        <Path d="M66 29h5" fill="none" />
        {/* wheels */}
        <Circle cx={33} cy={42.5} r={8.6} fill="#26324a" />
        <Circle cx={33} cy={42.5} r={4.4} fill={Brand.navy50} />
        <Circle cx={96} cy={42.5} r={8.6} fill="#26324a" />
        <Circle cx={96} cy={42.5} r={4.4} fill={Brand.navy50} />
      </G>
      <Circle cx={33} cy={42.5} r={1.4} fill={O} />
      <Circle cx={96} cy={42.5} r={1.4} fill={O} />
    </Svg>
  );
}
