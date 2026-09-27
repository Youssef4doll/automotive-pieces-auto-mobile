import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { Brand } from '@/constants/theme';

/**
 * Drawings for empty screens, in the shop's own navy and gold rather than a
 * stock glyph every app shares. The cart rolls on tyres with gold hubs, the
 * parcel is taped in the gold of the sign above the shop door.
 */

/** A parts-shop trolley on two tyres. */
export function CartArt({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Ellipse cx={64} cy={108} rx={40} ry={4} fill={Brand.navy950} opacity={0.08} />
      {/* The basket: a navy tray with a lighter grid, a gold rim. */}
      <Path d="M30 38 H102 L93 70 H39 Z" fill={Brand.navy900} />
      <G stroke={Brand.white} strokeOpacity={0.16} strokeWidth={2}>
        <Line x1={52} y1={40} x2={55} y2={68} />
        <Line x1={68} y1={40} x2={69} y2={68} />
        <Line x1={84} y1={40} x2={82} y2={68} />
        <Line x1={34} y1={54} x2={98} y2={54} />
      </G>
      <Line x1={28} y1={38} x2={104} y2={38} stroke={Brand.gold500} strokeWidth={6} strokeLinecap="round" />
      {/* Handle and chassis. */}
      <Path d="M10 24 H22 L38 80 H96" stroke={Brand.navy950} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Tyre cx={46} cy={94} />
      <Tyre cx={88} cy={94} />
    </Svg>
  );
}

function Tyre({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={11} fill={Brand.navy950} />
      <Circle cx={cx} cy={cy} r={6.5} fill={Brand.gold500} />
      <Circle cx={cx} cy={cy} r={2.2} fill={Brand.navy950} />
    </G>
  );
}

/** A taped parcel, for an order list with nothing in it yet. */
export function ParcelArt({ size = 120 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Ellipse cx={60} cy={106} rx={42} ry={4} fill={Brand.navy950} opacity={0.08} />
      {/* Front, side and lid of a box seen from a little above. */}
      <Path d="M18 44 L60 58 V102 L18 88 Z" fill={Brand.navy900} />
      <Path d="M60 58 L102 44 V88 L60 102 Z" fill={Brand.navy800} />
      <Path d="M18 44 L60 30 L102 44 L60 58 Z" fill={Brand.navy700} />
      {/* The gold tape over the lid and down the front. */}
      <Path d="M37 37.7 L79 51.7 L81 51 L39 37 Z" fill={Brand.gold500} />
      <Path d="M77 52.3 L85 49.6 V93.7 L77 96.4 Z" fill={Brand.gold500} />
      <Rect x={26} y={70} width={20} height={4} rx={2} fill={Brand.white} opacity={0.22} transform="skewY(18)" />
    </Svg>
  );
}
