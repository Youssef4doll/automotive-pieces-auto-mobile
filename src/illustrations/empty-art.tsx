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

/**
 * The empty basket: a shop basket with nothing in it yet, and two parts —
 * a brake disc and a spark plug — on their way in along dotted arcs. Wider
 * than tall, so it sits on the page like a scene rather than a sticker in a
 * ring; drawn in the same flat navy and gold as everything else here.
 */
export function EmptyBasketArt({ width = 240 }: { width?: number }) {
  const height = (width * 170) / 240;
  return (
    <Svg width={width} height={height} viewBox="0 0 240 170">
      {/* The floor. */}
      <Ellipse cx={120} cy={158} rx={78} ry={7} fill={Brand.navy950} opacity={0.07} />
      <Circle cx={120} cy={98} r={66} fill={Brand.navy50} />

      {/* The way in. */}
      <G stroke={Brand.navy300} strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" fill="none">
        <Path d="M56 58 C70 46 84 52 92 70" />
        <Path d="M188 46 C176 40 160 48 152 68" />
      </G>

      {/* The basket: handle, gold rim, navy body with its slats. */}
      <Path d="M82 82 C88 44 152 44 158 82" stroke={Brand.navy900} strokeWidth={7} strokeLinecap="round" fill="none" />
      <Path d="M64 88 H176 L164 142 A9 9 0 0 1 155.2 149 H84.8 A9 9 0 0 1 76 142 Z" fill={Brand.navy900} />
      <G stroke={Brand.white} strokeOpacity={0.16} strokeWidth={3} strokeLinecap="round">
        <Line x1={96} y1={98} x2={99} y2={139} />
        <Line x1={120} y1={98} x2={120} y2={139} />
        <Line x1={144} y1={98} x2={141} y2={139} />
      </G>
      <Rect x={56} y={78} width={128} height={15} rx={7.5} fill={Brand.gold500} />
      <Rect x={64} y={81} width={60} height={3} rx={1.5} fill={Brand.white} opacity={0.45} />

      {/* A brake disc, tumbling in from the left. */}
      <G transform="rotate(-14 46 48)">
        <Circle cx={46} cy={48} r={17} fill="#d5dce8" />
        <Circle cx={46} cy={48} r={17} fill="none" stroke={Brand.navy700} strokeWidth={2.5} />
        <Circle cx={46} cy={48} r={7} fill={Brand.navy900} />
        <Circle cx={46} cy={48} r={2.4} fill="#d5dce8" />
        {[0, 90, 180, 270].map((a) => (
          <Circle key={a} cx={46 + 11.5 * Math.cos((a * Math.PI) / 180)} cy={48 + 11.5 * Math.sin((a * Math.PI) / 180)} r={1.4} fill={Brand.navy700} />
        ))}
      </G>

      {/* A spark plug, from the right. */}
      <G transform="rotate(28 196 36)">
        <Rect x={192.5} y={14} width={7} height={8} rx={2} fill={Brand.navy900} />
        <Rect x={189} y={22} width={14} height={9} rx={2} fill={Brand.gold500} />
        <Rect x={191} y={31} width={10} height={16} rx={3} fill={Brand.white} stroke={Brand.navy900} strokeWidth={2} />
        <Rect x={194} y={47} width={4} height={6} fill={Brand.navy700} />
        <Path d="M196 53 v4 h-3" stroke={Brand.navy900} strokeWidth={2} strokeLinecap="round" fill="none" />
      </G>

      {/* Two gold glints. */}
      <Path d="M28 104 v10 M23 109 h10" stroke={Brand.gold500} strokeWidth={3} strokeLinecap="round" />
      <Path d="M212 96 v8 M208 100 h8" stroke={Brand.gold500} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}
