import Svg, { Circle, Ellipse, G, Line, Path, SvgXml } from 'react-native-svg';

import { Brand } from '@/constants/theme';
import emptyBasket from './drawn/empty-basket';
import noOrders from './drawn/no-orders';

/**
 * Drawings for empty screens, in the shop's own navy and gold rather than a
 * stock glyph every app shares. The cart rolls on tyres with gold hubs; the
 * box and the basket are the shop artist's own drawings.
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

/** The artist's drawings are 400 × 290; both keep that shape at any width. */
const DRAWN_RATIO = 290 / 400;

/**
 * An open shop box with nothing in it, the shop's name on its side — for an
 * order list with no orders yet. Drawn by the shop's artist
 * (assets/illustrations/no-orders.svg).
 */
export function NoOrdersArt({ width = 240 }: { width?: number }) {
  return <SvgXml xml={noOrders} width={width} height={width * DRAWN_RATIO} />;
}

/**
 * The empty basket: a shop basket with nothing in it yet, and a brake disc
 * and a spark plug on their way in along dotted arcs. Drawn by the shop's
 * artist (assets/illustrations/empty-basket.svg).
 */
export function EmptyBasketArt({ width = 240 }: { width?: number }) {
  return <SvgXml xml={emptyBasket} width={width} height={width * DRAWN_RATIO} />;
}
